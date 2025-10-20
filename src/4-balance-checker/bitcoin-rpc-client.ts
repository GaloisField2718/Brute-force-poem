/**
 * Bitcoin Core RPC Client
 * Uses .cookie authentication or RPC credentials
 */

import axios, { AxiosInstance } from 'axios';
import * as fs from 'fs';
import { BalanceCheckResult } from '../types';
import { logger } from '../utils/logger';

export interface BitcoinRPCConfig {
  host: string;
  port: number;
  cookiePath?: string;
  username?: string;
  password?: string;
  timeout?: number;
}

export class BitcoinRPCClient {
  private client: AxiosInstance;
  private rpcUrl: string;
  private auth: { username: string; password: string } | null = null;

  constructor(config: BitcoinRPCConfig) {
    this.rpcUrl = `http://${config.host}:${config.port}`;

    // Try to read cookie file first
    if (config.cookiePath && fs.existsSync(config.cookiePath)) {
      try {
        const cookie = fs.readFileSync(config.cookiePath, 'utf-8').trim();
        const [username, password] = cookie.split(':');
        this.auth = { username, password };
        logger.info('Bitcoin RPC: Using cookie authentication', {
          cookiePath: config.cookiePath
        });
      } catch (error) {
        logger.warn('Failed to read Bitcoin Core cookie', { error });
      }
    }

    // Fallback to username/password
    if (!this.auth && config.username && config.password) {
      this.auth = {
        username: config.username,
        password: config.password
      };
      logger.info('Bitcoin RPC: Using username/password authentication');
    }

    if (!this.auth) {
      throw new Error('Bitcoin RPC: No authentication method available');
    }

    this.client = axios.create({
      baseURL: this.rpcUrl,
      timeout: config.timeout || 30000,
      auth: this.auth,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Make RPC call to Bitcoin Core
   */
  private async rpcCall(method: string, params: any[] = []): Promise<any> {
    try {
      const response = await this.client.post('', {
        jsonrpc: '1.0',
        id: 'bitcoin-seed-recovery',
        method,
        params
      });

      if (response.data.error) {
        throw new Error(`RPC Error: ${response.data.error.message}`);
      }

      return response.data.result;
    } catch (error: any) {
      if (error.response) {
        throw new Error(`RPC HTTP ${error.response.status}: ${error.response.statusText}`);
      }
      throw error;
    }
  }

  /**
   * Check if Bitcoin Core is accessible
   */
  async testConnection(): Promise<boolean> {
    try {
      const info = await this.rpcCall('getblockchaininfo');
      logger.info('Bitcoin RPC connected', {
        chain: info.chain,
        blocks: info.blocks,
        progress: (info.verificationprogress * 100).toFixed(2) + '%'
      });
      return true;
    } catch (error: any) {
      logger.error('Bitcoin RPC connection failed', { error: error.message });
      return false;
    }
  }

  /**
   * Get balance for an address
   */
  async checkBalance(address: string): Promise<BalanceCheckResult> {
    const startTime = Date.now();

    try {
      // Import address as watch-only (this is fast and safe, doesn't rescan)
      try {
        await this.rpcCall('importaddress', [address, '', false]);
      } catch (error: any) {
        // Ignore if address already imported
        if (!error.message.includes('already exists')) {
          logger.debug('Import address warning', { error: error.message });
        }
      }

      // Get unspent outputs to calculate current balance
      const unspent = await this.rpcCall('listunspent', [0, 9999999, [address]]);
      
      let balance = 0;
      if (unspent && unspent.length > 0) {
        balance = unspent.reduce((sum: number, utxo: any) => sum + utxo.amount, 0);
      }

      const balanceSats = Math.round(balance * 100000000); // Convert BTC to satoshis

      // Check transaction history for 100k sats on 19/10/25
      const hasHistorical100k = await this.checkHistoricalTransactions(address);

      return {
        address,
        balance: balanceSats,
        error: null,
        timestamp: Date.now(),
        apiUsed: 'bitcoin-rpc',
        checkDuration: Date.now() - startTime,
        hasHistorical100k
      };
    } catch (error: any) {
      logger.error('Bitcoin RPC balance check failed', {
        address,
        error: error.message
      });

      return {
        address,
        balance: 0,
        error: error.message,
        timestamp: Date.now(),
        apiUsed: 'bitcoin-rpc',
        checkDuration: Date.now() - startTime
      };
    }
  }

  /**
   * Check if address had 100k sats transaction on 19/10/25
   */
  private async checkHistoricalTransactions(address: string): Promise<boolean> {
    try {
      // Get transaction list for the address
      const txList = await this.rpcCall('listtransactions', ['*', 1000, 0, true]);
      
      // Check for transactions around 19/10/25 (timestamp: 1729296000 - 1729382400)
      const targetDateStart = 1729296000; // 19/10/25 00:00:00
      const targetDateEnd = 1729382400;   // 20/10/25 00:00:00
      const targetAmount = 100000; // 100k sats
      
      for (const tx of txList) {
        if (tx.time >= targetDateStart && tx.time <= targetDateEnd) {
          const amountSats = Math.abs(Math.round(tx.amount * 100000000));
          if (amountSats === targetAmount) {
            logger.info('CRITICAL: Found 100k sats transaction on 19/10/25!', {
              address,
              txid: tx.txid,
              amount: tx.amount,
              time: new Date(tx.time * 1000).toISOString()
            });
            return true;
          }
        }
      }
      
      return false;
    } catch (error: any) {
      logger.debug('Historical transaction check failed', {
        address,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Get multiple addresses balances in batch
   */
  async checkBalances(addresses: string[]): Promise<Map<string, number>> {
    const results = new Map<string, number>();

    // Bitcoin RPC doesn't have native batch address queries,
    // so we check them sequentially (but it's fast as it's local)
    for (const address of addresses) {
      const result = await this.checkBalance(address);
      results.set(address, result.balance);
    }

    return results;
  }

  /**
   * Get node info
   */
  async getInfo(): Promise<any> {
    return await this.rpcCall('getblockchaininfo');
  }
}
