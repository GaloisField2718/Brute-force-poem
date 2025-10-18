/**
 * Rate limiter using Bottleneck
 */

import Bottleneck from 'bottleneck';
import { ApiEndpoint } from '../types';

export class RateLimiter {
  private limiters: Map<string, Bottleneck> = new Map();

  /**
   * Create a rate limiter for an API endpoint
   */
  createLimiter(endpoint: ApiEndpoint): Bottleneck {
    const limiter = new Bottleneck({
      reservoir: endpoint.rateLimit.requestsPerSecond,
      reservoirRefreshAmount: endpoint.rateLimit.requestsPerSecond,
      reservoirRefreshInterval: 1000, // 1 second
      maxConcurrent: 5,
      minTime: 1000 / endpoint.rateLimit.requestsPerSecond
    });

    this.limiters.set(endpoint.name, limiter);
    return limiter;
  }

  /**
   * Get limiter for an endpoint
   */
  getLimiter(endpointName: string): Bottleneck | undefined {
    return this.limiters.get(endpointName);
  }

  /**
   * Execute a function with rate limiting
   */
  async execute<T>(
    endpointName: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const limiter = this.limiters.get(endpointName);
    
    if (!limiter) {
      throw new Error(`No limiter found for endpoint: ${endpointName}`);
    }

    return limiter.schedule(fn);
  }

  /**
   * Check if limiter has capacity
   */
  hasCapacity(endpointName: string): boolean {
    const limiter = this.limiters.get(endpointName);
    if (!limiter) return false;

    const counts = limiter.counts();
    return counts.EXECUTING < 5; // maxConcurrent
  }

  /**
   * Get current counts for an endpoint
   */
  getCounts(endpointName: string): Bottleneck.Counts | null {
    const limiter = this.limiters.get(endpointName);
    return limiter ? limiter.counts() : null;
  }

  /**
   * Stop all limiters
   */
  async stopAll(): Promise<void> {
    const promises = Array.from(this.limiters.values()).map(limiter => 
      limiter.stop({ dropWaitingJobs: true })
    );
    await Promise.all(promises);
  }
}
