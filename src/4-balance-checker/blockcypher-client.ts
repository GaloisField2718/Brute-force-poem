/**
 * BlockCypher API client
 */

import axios, { AxiosInstance } from 'axios';
import { ApiEndpoint, BalanceCheckResult } from '../types';
import { logger } from '../utils/logger';

export class BlockCypherClient {
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
   * GET /addrs/{address}/balance
   * Response: { balance } (in satoshis)
   */
  async checkBalance(address: string): Promise<BalanceCheckResult> {
    const startTime = Date.now();

    try {
      const response = await this.client.get(`/addrs/${address}/balance`);
      const data = response.data;

      // Balance is directly available in satoshis
      const balance = data.balance || 0;

      return {
        address,
        balance,
        apiUsed: this.endpoint.name,
        timestamp: Date.now()
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      logger.debug('BlockCypher API error', {
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
