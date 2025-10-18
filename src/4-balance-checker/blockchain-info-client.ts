/**
 * Blockchain.info API client
 */

import axios, { AxiosInstance } from 'axios';
import { ApiEndpoint, BalanceCheckResult } from '../types';
import { logger } from '../utils/logger';

export class BlockchainInfoClient {
  private client: AxiosInstance;
  private endpoint: ApiEndpoint;

  constructor(endpoint: ApiEndpoint) {
    this.endpoint = endpoint;
    this.client = axios.create({
      baseURL: endpoint.baseUrl,
      timeout: endpoint.timeout,
      headers: {
        'User-Agent': 'Bitcoin-Seed-Recovery/1.0'
      }
    });
  }

  /**
   * Check balance for an address
   * GET /balance?active={address}
   * Response: { "{address}": { final_balance } }
   */
  async checkBalance(address: string): Promise<BalanceCheckResult> {
    const startTime = Date.now();

    try {
      const response = await this.client.get(`/balance?active=${address}`);
      const data = response.data;

      // Extract balance from response
      const balance = data[address]?.final_balance || 0;

      return {
        address,
        balance,
        apiUsed: this.endpoint.name,
        timestamp: Date.now()
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      logger.debug('Blockchain.info API error', {
        address,
        error: error.message,
        status: error.response?.status,
        duration
      });

      return {
        address,
        balance: 0,
        apiUsed: this.endpoint.name,
        timestamp: Date.now(),
        error: error.message
      };
    }
  }

  /**
   * Check multiple addresses in batch
   * Blockchain.info supports checking multiple addresses in one call
   */
  async checkBalances(addresses: string[]): Promise<BalanceCheckResult[]> {
    if (addresses.length === 0) {
      return [];
    }

    // Batch check (up to 100 addresses at once)
    const batchSize = 100;
    const results: BalanceCheckResult[] = [];

    for (let i = 0; i < addresses.length; i += batchSize) {
      const batch = addresses.slice(i, i + batchSize);
      const addressesParam = batch.join('|');

      try {
        const response = await this.client.get(`/balance?active=${addressesParam}`);
        const data = response.data;

        for (const address of batch) {
          results.push({
            address,
            balance: data[address]?.final_balance || 0,
            apiUsed: this.endpoint.name,
            timestamp: Date.now()
          });
        }
      } catch (error: any) {
        logger.debug('Blockchain.info batch API error', {
          batchSize: batch.length,
          error: error.message
        });

        // Fall back to individual checks
        for (const address of batch) {
          results.push(await this.checkBalance(address));
        }
      }
    }

    return results;
  }

  /**
   * Get endpoint name
   */
  getName(): string {
    return this.endpoint.name;
  }
}
