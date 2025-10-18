/**
 * Result handler for seed checking
 */

import * as fs from 'fs';
import * as path from 'path';
import { SeedCheckResult, FoundWallet } from '../types';
import { logger, hashSensitive } from '../utils/logger';
import { Config } from '../utils/config';

export class ResultHandler {
  private resultsFile: string;
  private foundWalletsFile: string;

  constructor() {
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    this.resultsFile = path.join(Config.RESULTS_DIR, `results-${timestamp}.jsonl`);
    this.foundWalletsFile = path.join(Config.RESULTS_DIR, `found-wallets-${timestamp}.json`);
  }

  /**
   * Handle a seed check result
   */
  handleResult(result: SeedCheckResult): void {
    if (result.found) {
      this.handleFoundWallet(result);
    } else {
      this.logCheckedSeed(result);
    }
  }

  /**
   * Handle found wallet
   */
  private handleFoundWallet(result: SeedCheckResult): void {
    if (!result.address || !result.path || !result.type || !result.balance) {
      logger.error('Invalid found wallet result', { result });
      return;
    }

    const wallet: FoundWallet = {
      mnemonic: result.mnemonic,
      address: result.address,
      path: result.path,
      type: result.type,
      balance: result.balance,
      totalSeedsChecked: 0, // Will be set by orchestrator
      totalTimeMs: 0 // Will be set by orchestrator
    };

    // Log to console with full details
    logger.info('🎯 TARGET WALLET FOUND! 🎯', {
      mnemonicHash: hashSensitive(wallet.mnemonic),
      address: wallet.address,
      path: wallet.path,
      type: wallet.type,
      balance: wallet.balance
    });

    // Save to file with full mnemonic (CAREFUL!)
    this.saveFoundWallet(wallet);
  }

  /**
   * Save found wallet to file
   */
  private saveFoundWallet(wallet: FoundWallet): void {
    try {
      const data = JSON.stringify(wallet, null, 2);
      fs.writeFileSync(this.foundWalletsFile, data, 'utf-8');
      
      logger.info('Found wallet saved to file', {
        file: this.foundWalletsFile
      });

      // Also create a backup with timestamp
      const backupFile = path.join(
        Config.RESULTS_DIR,
        `FOUND-${Date.now()}.json`
      );
      fs.writeFileSync(backupFile, data, 'utf-8');
    } catch (error) {
      logger.error('Failed to save found wallet', {
        error: String(error)
      });
    }
  }

  /**
   * Log checked seed (for debugging)
   */
  private logCheckedSeed(result: SeedCheckResult): void {
    // Only log to file, not console (too verbose)
    const logEntry = {
      mnemonicHash: hashSensitive(result.mnemonic),
      found: result.found,
      addressesChecked: result.totalAddressesChecked,
      duration: result.checkDuration,
      timestamp: new Date().toISOString()
    };

    try {
      fs.appendFileSync(
        this.resultsFile,
        JSON.stringify(logEntry) + '\n',
        'utf-8'
      );
    } catch (error) {
      // Don't log errors here to avoid spam
    }
  }

  /**
   * Write summary report
   */
  writeSummary(
    totalSeeds: number,
    totalChecked: number,
    totalAddressesQueried: number,
    totalTimeMs: number,
    foundWallet: FoundWallet | null
  ): void {
    const summary = {
      totalSeeds,
      totalChecked,
      totalAddressesQueried,
      totalTimeMs,
      durationMinutes: (totalTimeMs / 1000 / 60).toFixed(2),
      averageTimePerSeed: (totalTimeMs / totalChecked).toFixed(2) + 'ms',
      throughput: (totalChecked / (totalTimeMs / 1000)).toFixed(2) + ' seeds/s',
      foundWallet: foundWallet ? {
        address: foundWallet.address,
        path: foundWallet.path,
        balance: foundWallet.balance
      } : null,
      timestamp: new Date().toISOString()
    };

    const summaryFile = path.join(
      Config.RESULTS_DIR,
      `summary-${new Date().toISOString().replace(/:/g, '-').split('.')[0]}.json`
    );

    try {
      fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2), 'utf-8');
      logger.info('Summary report saved', { file: summaryFile });
    } catch (error) {
      logger.error('Failed to save summary', { error: String(error) });
    }
  }

  /**
   * Get results file path
   */
  getResultsFile(): string {
    return this.resultsFile;
  }

  /**
   * Get found wallets file path
   */
  getFoundWalletsFile(): string {
    return this.foundWalletsFile;
  }
}
