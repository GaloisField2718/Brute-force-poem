/**
 * Unified Balance Checker
 * Routes balance checks through APIs, Bitcoin RPC, or Electrum based on configuration
 */

import { ApiRouter } from './api-router';
import { BitcoinRPCClient } from './bitcoin-rpc-client';
import { ElectrumClient } from './electrum-client';
import { Config } from '../utils/config';
import { logger } from '../utils/logger';

export class UnifiedBalanceChecker {
  private apiRouter?: ApiRouter;
  private bitcoinRPC?: BitcoinRPCClient;
  private electrum?: ElectrumClient;
  private sources: Array<{ type: string; priority: number; client: any }> = [];

  async initialize(): Promise<void> {
    const sourcesConfig = Config.loadBitcoinSources();
    const enabledSources = sourcesConfig.sources
      .filter((s: any) => s.enabled)
      .sort((a: any, b: any) => a.priority - b.priority);

    logger.info('Initializing balance checker', {
      sources: enabledSources.map((s: any) => s.type)
    });

    for (const source of enabledSources) {
      try {
        switch (source.type) {
          case 'api':
            const apiConfig = Config.loadApiConfig();
            this.apiRouter = new ApiRouter(apiConfig.endpoints);
            this.sources.push({
              type: 'api',
              priority: source.priority,
              client: this.apiRouter
            });
            logger.info('API router initialized');
            break;

          case 'bitcoin-rpc':
            if (!source.config) {
              logger.warn('Bitcoin RPC enabled but no config provided');
              break;
            }
            this.bitcoinRPC = new BitcoinRPCClient(source.config);
            const rpcConnected = await this.bitcoinRPC.testConnection();
            if (rpcConnected) {
              this.sources.push({
                type: 'bitcoin-rpc',
                priority: source.priority,
                client: this.bitcoinRPC
              });
              logger.info('Bitcoin RPC initialized');
            } else {
              logger.warn('Bitcoin RPC connection failed, skipping');
            }
            break;

          case 'electrum':
            if (!source.config) {
              logger.warn('Electrum enabled but no config provided');
              break;
            }
            this.electrum = new ElectrumClient(source.config);
            const electrumConnected = await this.electrum.testConnection();
            if (electrumConnected) {
              this.sources.push({
                type: 'electrum',
                priority: source.priority,
                client: this.electrum
              });
              logger.info('Electrum initialized');
            } else {
              logger.warn('Electrum connection failed, skipping');
            }
            break;

          default:
            logger.warn('Unknown source type', { type: source.type });
        }
      } catch (error: any) {
        logger.error('Failed to initialize source', {
          type: source.type,
          error: error.message
        });
      }
    }

    if (this.sources.length === 0) {
      throw new Error('No balance checking sources available');
    }

    logger.info('Balance checker initialized', {
      availableSources: this.sources.map(s => s.type)
    });
  }

  /**
   * Check balance using available sources with fallback
   */
  async checkBalance(address: string): Promise<number> {
    let lastError: Error | null = null;

    for (const source of this.sources) {
      try {
        logger.debug('Trying balance check', {
          address: address.substring(0, 10) + '...',
          source: source.type
        });

        let balance = 0;

        switch (source.type) {
          case 'api':
            balance = await source.client.checkBalance(address);
            break;

          case 'bitcoin-rpc':
            const rpcResult = await source.client.checkBalance(address);
            if (rpcResult.error) {
              throw new Error(rpcResult.error);
            }
            balance = rpcResult.balance;
            break;

          case 'electrum':
            const electrumResult = await source.client.checkBalance(address);
            if (electrumResult.error) {
              throw new Error(electrumResult.error);
            }
            balance = electrumResult.balance;
            break;
        }

        logger.debug('Balance check success', {
          address: address.substring(0, 10) + '...',
          source: source.type,
          balance
        });

        return balance;
      } catch (error: any) {
        lastError = error;
        logger.debug('Balance check failed, trying next source', {
          source: source.type,
          error: error.message
        });
      }
    }

    logger.error('All balance check sources failed', {
      address,
      lastError: lastError?.message
    });

    return 0;
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
   * Get health status of all sources
   */
  getHealthStatus(): Record<string, string> {
    const status: Record<string, string> = {};

    for (const source of this.sources) {
      if (source.type === 'api' && this.apiRouter) {
        const apiHealth = this.apiRouter.getHealthStatus();
        Object.assign(status, apiHealth);
      } else {
        status[source.type] = 'active';
      }
    }

    return status;
  }

  /**
   * Cleanup resources
   */
  async stop(): Promise<void> {
    logger.info('Stopping balance checker');

    if (this.apiRouter) {
      await this.apiRouter.stop();
    }

    if (this.electrum) {
      this.electrum.disconnect();
    }

    logger.info('Balance checker stopped');
  }
}
