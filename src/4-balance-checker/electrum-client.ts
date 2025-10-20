/**
 * Electrum Protocol Client
 * Connects to Electrum servers for balance checking
 */

import * as net from 'net';
import * as tls from 'tls';
import * as bitcoin from 'bitcoinjs-lib';
import * as crypto from 'crypto';
import { BalanceCheckResult } from '../types';
import { logger } from '../utils/logger';

export interface ElectrumConfig {
  host: string;
  port: number;
  protocol: 'tcp' | 'ssl';
  timeout?: number;
}

interface ElectrumResponse {
  id: number;
  result?: any;
  error?: { code: number; message: string };
}

export class ElectrumClient {
  private config: ElectrumConfig;
  private socket: net.Socket | tls.TLSSocket | null = null;
  private requestId = 0;
  private pendingRequests = new Map<number, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
  }>();
  private connected = false;
  private buffer = '';

  constructor(config: ElectrumConfig) {
    this.config = {
      ...config,
      timeout: config.timeout || 10000
    };
  }

  /**
   * Connect to Electrum server
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
        this.disconnect();
      }, this.config.timeout);

      const onConnect = () => {
        clearTimeout(timeout);
        this.connected = true;
        logger.info('Electrum connected', {
          host: this.config.host,
          port: this.config.port,
          protocol: this.config.protocol
        });
        resolve();
      };

      const onError = (error: Error) => {
        clearTimeout(timeout);
        reject(error);
      };

      if (this.config.protocol === 'ssl') {
        this.socket = tls.connect({
          host: this.config.host,
          port: this.config.port,
          rejectUnauthorized: false // Allow self-signed certificates
        });
      } else {
        this.socket = net.connect({
          host: this.config.host,
          port: this.config.port
        });
      }

      this.socket.setEncoding('utf8');
      this.socket.on('connect', onConnect);
      this.socket.on('error', onError);
      this.socket.on('data', (data: string) => this.handleData(data));
      this.socket.on('close', () => {
        this.connected = false;
        logger.debug('Electrum connection closed');
      });
    });
  }

  /**
   * Disconnect from Electrum server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
    this.connected = false;
    this.pendingRequests.clear();
  }

  /**
   * Handle incoming data from socket
   */
  private handleData(data: string): void {
    this.buffer += data;
    
    // Process complete lines
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || ''; // Keep incomplete line in buffer

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const response: ElectrumResponse = JSON.parse(line);
        const pending = this.pendingRequests.get(response.id);

        if (pending) {
          this.pendingRequests.delete(response.id);
          
          if (response.error) {
            pending.reject(new Error(`Electrum error: ${response.error.message}`));
          } else {
            pending.resolve(response.result);
          }
        }
      } catch (error) {
        logger.error('Failed to parse Electrum response', { line, error });
      }
    }
  }

  /**
   * Send request to Electrum server
   */
  private async request(method: string, params: any[] = []): Promise<any> {
    if (!this.connected || !this.socket) {
      await this.connect();
    }

    return new Promise((resolve, reject) => {
      const id = ++this.requestId;
      const request = {
        id,
        method,
        params
      };

      this.pendingRequests.set(id, { resolve, reject });

      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error('Request timeout'));
      }, this.config.timeout);

      // Override resolve/reject to clear timeout
      const originalResolve = resolve;
      const originalReject = reject;
      
      this.pendingRequests.set(id, {
        resolve: (value: any) => {
          clearTimeout(timeout);
          originalResolve(value);
        },
        reject: (error: Error) => {
          clearTimeout(timeout);
          originalReject(error);
        }
      });

      this.socket!.write(JSON.stringify(request) + '\n');
    });
  }

  /**
   * Test connection to Electrum server
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.connect();
      const features = await this.request('server.version', ['bitcoin-seed-recovery', '1.4']);
      logger.info('Electrum server version', features);
      return true;
    } catch (error: any) {
      logger.error('Electrum connection test failed', { error: error.message });
      return false;
    }
  }

  /**
   * Get script hash for an address
   * Bitcoin addresses need to be converted to script hash for Electrum
   * Algorithm: address -> scriptPubKey -> SHA256 -> reverse bytes -> hex
   */
  private getScriptHash(address: string): string {
    try {
      // Decode address to get output script (scriptPubKey)
      const decoded = bitcoin.address.toOutputScript(address, bitcoin.networks.bitcoin);
      
      // Hash the script with SHA256
      const hash = crypto.createHash('sha256').update(decoded).digest();
      
      // Reverse the bytes (Electrum uses reversed hash)
      const reversed = Buffer.from(hash).reverse();
      
      // Return as hex string
      return reversed.toString('hex');
    } catch (error: any) {
      logger.error('Failed to convert address to script hash', {
        address,
        error: error.message
      });
      throw new Error(`Invalid Bitcoin address: ${address}`);
    }
  }

  /**
   * Get balance for an address
   */
  async checkBalance(address: string): Promise<BalanceCheckResult> {
    const startTime = Date.now();

    try {
      // Get script hash
      const scriptHash = this.getScriptHash(address);

      // Get balance from Electrum
      const balance = await this.request('blockchain.scripthash.get_balance', [scriptHash]);

      // Balance returns { confirmed, unconfirmed }
      const totalBalance = (balance.confirmed || 0) + (balance.unconfirmed || 0);

      // CRITICAL: Check transaction history for 100k sats on 19/10/25
      const hasHistorical100k = await this.checkHistoricalTransactions(scriptHash);

      return {
        address,
        balance: totalBalance,
        error: null,
        timestamp: Date.now(),
        apiUsed: 'electrum',
        checkDuration: Date.now() - startTime,
        hasHistorical100k // Add this flag
      };
    } catch (error: any) {
      logger.error('Electrum balance check failed', {
        address,
        error: error.message
      });

      return {
        address,
        balance: 0,
        error: error.message,
        timestamp: Date.now(),
        apiUsed: 'electrum',
        checkDuration: Date.now() - startTime
      };
    }
  }

  /**
   * Check if address had 100k sats transaction on 19/10/25 using Electrum
   */
  private async checkHistoricalTransactions(scriptHash: string): Promise<boolean> {
    try {
      // Get transaction history from Electrum
      const history = await this.request('blockchain.scripthash.get_history', [scriptHash]);
      
      // Check for transactions around 19/10/25 (timestamp: 1729296000 - 1729382400)
      const targetDateStart = 1729296000; // 19/10/25 00:00:00
      const targetDateEnd = 1729382400;   // 20/10/25 00:00:00
      const targetAmount = 100000; // 100k sats
      
      for (const tx of history) {
        if (tx.height > 0) { // Only confirmed transactions
          // Get transaction details
          const txDetails = await this.request('blockchain.transaction.get', [tx.tx_hash, true]);
          
          // Check if this transaction has 100k sats input/output
          if (this.has100kSatsInTransaction(txDetails, targetAmount)) {
            // Check if transaction is within target date range (19/10/25)
            const txTime = txDetails.time || 0;
            if (txTime >= targetDateStart && txTime <= targetDateEnd) {
              logger.info('CRITICAL: Found 100k sats transaction on 19/10/25 via Electrum!', {
                txHash: tx.tx_hash,
                height: tx.height,
                amount: targetAmount,
                time: new Date(txTime * 1000).toISOString()
              });
              return true;
            }
          }
        }
      }
      
      return false;
    } catch (error: any) {
      logger.debug('Electrum historical transaction check failed', {
        scriptHash,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Check if transaction contains 100k sats
   */
  private has100kSatsInTransaction(txDetails: any, targetAmount: number): boolean {
    try {
      // Check outputs for 100k sats
      if (txDetails.vout) {
        for (const output of txDetails.vout) {
          if (output.value === targetAmount) {
            return true;
          }
        }
      }
      
      // Check inputs for 100k sats (if we can access them)
      if (txDetails.vin) {
        for (const input of txDetails.vin) {
          if (input.prevout && input.prevout.value === targetAmount) {
            return true;
          }
        }
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get balances for multiple addresses
   */
  async checkBalances(addresses: string[]): Promise<Map<string, number>> {
    const results = new Map<string, number>();

    for (const address of addresses) {
      const result = await this.checkBalance(address);
      results.set(address, result.balance);
    }

    return results;
  }
}
