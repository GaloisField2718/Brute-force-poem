/**
 * API Router with intelligent rotation and fallback
 */

import { ApiEndpoint, BalanceCheckResult, ApiHealth } from '../types';
import { RateLimiter } from './rate-limiter';
import { MempoolClient } from './mempool-client';
import { BlockstreamClient } from './blockstream-client';
import { BlockchainInfoClient } from './blockchain-info-client';
import { BlockCypherClient } from './blockcypher-client';
import { logger } from '../utils/logger';
import { Config } from '../utils/config';

type ApiClient = MempoolClient | BlockstreamClient | BlockchainInfoClient | BlockCypherClient;

export class ApiRouter {
  private endpoints: ApiEndpoint[];
  private clients: Map<string, ApiClient> = new Map();
  private rateLimiter: RateLimiter;
  private healthStatus: Map<string, ApiHealth> = new Map();
  private currentIndex: number = 0;
  private cache: Map<string, BalanceCheckResult> = new Map();

  constructor(endpoints: ApiEndpoint[]) {
    this.endpoints = endpoints.sort((a, b) => a.priority - b.priority);
    this.rateLimiter = new RateLimiter();
    this.initializeClients();
  }

  /**
   * Initialize API clients and rate limiters
   */
  private initializeClients(): void {
    for (const endpoint of this.endpoints) {
      // Create client based on endpoint name
      let client: ApiClient;
      
      switch (endpoint.name) {
        case 'mempool-space':
          client = new MempoolClient(endpoint);
          break;
        case 'blockstream':
          client = new BlockstreamClient(endpoint);
          break;
        case 'blockchain-info':
          client = new BlockchainInfoClient(endpoint);
          break;
        case 'blockcypher':
          client = new BlockCypherClient(endpoint);
          break;
        default:
          throw new Error(`Unknown endpoint: ${endpoint.name}`);
      }

      this.clients.set(endpoint.name, client);
      this.rateLimiter.createLimiter(endpoint);
      
      // Initialize health status
      this.healthStatus.set(endpoint.name, {
        name: endpoint.name,
        status: 'healthy',
        consecutiveFailures: 0,
        lastCheckTimestamp: Date.now()
      });
    }

    logger.info('API Router initialized', {
      endpoints: this.endpoints.map(e => e.name),
      totalClients: this.clients.size
    });
  }

  /**
   * Get next available endpoint using round-robin with health checks
   */
  private getNextAvailableEndpoint(): ApiEndpoint | null {
    const now = Date.now();
    const startIndex = this.currentIndex;

    do {
      const endpoint = this.endpoints[this.currentIndex];
      const health = this.healthStatus.get(endpoint.name);

      // Move to next endpoint for round-robin
      this.currentIndex = (this.currentIndex + 1) % this.endpoints.length;

      // Check if endpoint is blacklisted
      if (health?.blacklistedUntil && now < health.blacklistedUntil) {
        continue;
      }

      // Check if endpoint has capacity
      if (this.rateLimiter.hasCapacity(endpoint.name)) {
        return endpoint;
      }

    } while (this.currentIndex !== startIndex);

    return null; // All endpoints exhausted
  }

  /**
   * Check balance for an address with automatic failover
   */
  async checkBalance(address: string): Promise<number> {
    // Check cache first and validate it's not expired
    const cached = this.cache.get(address);
    const now = Date.now();
    if (cached) {
      if (now - cached.timestamp < Config.CACHE_TTL_MS) {
        logger.debug('Cache hit', { address, age: `${now - cached.timestamp}ms` });
        return cached.balance;
      } else {
        // Remove expired entry
        this.cache.delete(address);
      }
    }

    let lastError: Error | null = null;
    const attemptedEndpoints: string[] = [];

    // Try all endpoints
    for (let attempt = 0; attempt < this.endpoints.length; attempt++) {
      const endpoint = this.getNextAvailableEndpoint();
      
      if (!endpoint) {
        logger.warn('No available endpoints', { address });
        await this.sleep(1000); // Wait before retry
        continue;
      }

      attemptedEndpoints.push(endpoint.name);

      try {
        const result = await this.executeWithRetry(endpoint, address);
        
        if (!result.error) {
          // Success - update health and cache
          this.updateHealth(endpoint.name, true);
          this.cache.set(address, result);
          return result.balance;
        } else {
          lastError = new Error(result.error);
        }
      } catch (error: any) {
        lastError = error;
        logger.debug('API call failed', {
          endpoint: endpoint.name,
          address,
          error: error.message
        });
      }

      this.updateHealth(endpoint.name, false);
    }

    // All endpoints failed
    logger.error('All API endpoints failed', {
      address,
      attemptedEndpoints,
      lastError: lastError?.message
    });

    return 0; // Return 0 balance on complete failure
  }

  /**
   * Execute API call with retry logic
   */
  private async executeWithRetry(
    endpoint: ApiEndpoint,
    address: string
  ): Promise<BalanceCheckResult> {
    const client = this.clients.get(endpoint.name);
    if (!client) {
      throw new Error(`Client not found for endpoint: ${endpoint.name}`);
    }

    const { maxRetries, backoffMs } = endpoint.retryStrategy;

    for (let retry = 0; retry <= maxRetries; retry++) {
      try {
        // Execute with rate limiting
        const result = await this.rateLimiter.execute(
          endpoint.name,
          () => client.checkBalance(address)
        );

        return result;
      } catch (error: any) {
        const isLastRetry = retry === maxRetries;
        
        if (isLastRetry) {
          throw error;
        }

        // Apply exponential backoff
        const delay = backoffMs[retry] || backoffMs[backoffMs.length - 1];
        await this.sleep(delay);
      }
    }

    throw new Error('Max retries exceeded');
  }

  /**
   * Update health status for an endpoint
   */
  private updateHealth(endpointName: string, success: boolean): void {
    const health = this.healthStatus.get(endpointName);
    if (!health) return;

    if (success) {
      health.consecutiveFailures = 0;
      health.status = 'healthy';
      delete health.blacklistedUntil;
    } else {
      health.consecutiveFailures++;
      health.status = 'error';

      // Blacklist after 3 consecutive failures
      if (health.consecutiveFailures >= 3) {
        health.status = 'rate-limited';
        health.blacklistedUntil = Date.now() + Config.API_BLACKLIST_DURATION_MS;
        
        logger.warn('Endpoint blacklisted', {
          endpoint: endpointName,
          duration: `${Config.API_BLACKLIST_DURATION_MS / 1000}s`
        });
      }
    }

    health.lastCheckTimestamp = Date.now();
    this.healthStatus.set(endpointName, health);
  }

  /**
   * Get health status for all endpoints
   */
  getHealthStatus(): Record<string, string> {
    const status: Record<string, string> = {};
    
    for (const [name, health] of this.healthStatus.entries()) {
      status[name] = health.status;
    }

    return status;
  }

  /**
   * Check balances for multiple addresses
   */
  async checkBalances(addresses: string[]): Promise<Map<string, number>> {
    const results = new Map<string, number>();

    // Check in parallel with concurrency limit
    const concurrency = 10;
    for (let i = 0; i < addresses.length; i += concurrency) {
      const batch = addresses.slice(i, i + concurrency);
      const balances = await Promise.all(
        batch.map(addr => this.checkBalance(addr))
      );

      batch.forEach((addr, idx) => {
        results.set(addr, balances[idx]);
      });
    }

    return results;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Stop all rate limiters and clean up resources
   */
  async stop(): Promise<void> {
    logger.info('Stopping API router');
    
    // Clear cache
    this.clearCache();
    
    // Stop all rate limiters
    await this.rateLimiter.stopAll();
    
    // Clear health status
    this.healthStatus.clear();
    
    logger.info('API router stopped');
  }

  /**
   * Get cache statistics
   */
  getCacheStatistics(): { size: number; oldestEntry: number | null } {
    const now = Date.now();
    let oldestTimestamp: number | null = null;

    for (const entry of this.cache.values()) {
      if (oldestTimestamp === null || entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
      }
    }

    return {
      size: this.cache.size,
      oldestEntry: oldestTimestamp ? now - oldestTimestamp : null
    };
  }
}
