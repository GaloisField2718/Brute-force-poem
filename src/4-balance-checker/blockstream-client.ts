/**
 * Blockstream API client
 */

import axios, { AxiosInstance } from 'axios';
import { ApiEndpoint, BalanceCheckResult } from '../types';
import { logger } from '../utils/logger';

export class BlockstreamClient {
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
   * GET /address/{address}
   * Response: { chain_stats: { funded_txo_sum, spent_txo_sum } }
   */
  async checkBalance(address: string): Promise<BalanceCheckResult> {
    const startTime = Date.now();

    try {
      const response = await this.client.get(`/address/${address}`);
      const data = response.data;

      // Calculate balance from chain stats
      const funded = data.chain_stats?.funded_txo_sum || 0;
      const spent = data.chain_stats?.spent_txo_sum || 0;
      const balance = funded - spent;

      return {
        address,
        balance,
        apiUsed: this.endpoint.name,
        timestamp: Date.now()
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      logger.debug('Blockstream API error', {
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
   */
  async checkBalances(addresses: string[]): Promise<BalanceCheckResult[]> {
    return Promise.all(addresses.map(addr => this.checkBalance(addr)));
  }

  /**
   * Get endpoint name
   */
  getName(): string {
    return this.endpoint.name;
  }
}
