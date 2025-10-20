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
  private checkpointFile: string;
  private checkedSeeds: Set<string> = new Set();  // Track checked seeds in memory

  constructor() {
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    this.resultsFile = path.join(Config.RESULTS_DIR, `results-${timestamp}.jsonl`);
    this.foundWalletsFile = path.join(Config.RESULTS_DIR, `found-wallets-${timestamp}.json`);
    this.checkpointFile = path.join(Config.RESULTS_DIR, `checkpoint-${timestamp}.jsonl`);
    
    // Load previously checked seeds on startup
    this.loadCheckedSeeds();
  }

  /**
   * Handle a seed check result
   */
  handleResult(result: SeedCheckResult): void {
    // Add hash to checked seeds set (for deduplication)
    const mnemonicHash = hashSensitive(result.mnemonic);
    this.checkedSeeds.add(mnemonicHash);
    
    if (result.found) {
      this.handleFoundWallet(result);
    } else {
      this.logCheckedSeed(result);
    }
    
    // Write checkpoint every 100 seeds
    if (this.checkedSeeds.size % 100 === 0) {
      this.writeCheckpoint();
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

  /**
   * Load previously checked seeds from results files
   */
  private loadCheckedSeeds(): void {
    try {
      // Load from all previous result files in the directory
      if (!fs.existsSync(Config.RESULTS_DIR)) {
        return;
      }

      const files = fs.readdirSync(Config.RESULTS_DIR);
      const resultFiles = files.filter(f => f.startsWith('results-') && f.endsWith('.jsonl'));
      
      // CRITICAL FIX: Only load the most recent results file to avoid filtering too many seeds
      const sortedFiles = resultFiles.sort().reverse();
      const recentFile = sortedFiles[0]; // Most recent file only
      
      if (recentFile) {
        const filePath = path.join(Config.RESULTS_DIR, recentFile);
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const lines = content.split('\n').filter(l => l.trim());
          
          for (const line of lines) {
            try {
              const entry = JSON.parse(line);
              if (entry.mnemonicHash) {
                // Store the hash to avoid re-checking same seeds
                this.checkedSeeds.add(entry.mnemonicHash);
              }
            } catch (e) {
              // Skip invalid lines
            }
          }
        } catch (error) {
          logger.debug('Could not read results file', { file: recentFile });
        }
      }

      // Load from checkpoint files
      const checkpointFiles = files.filter(f => f.startsWith('checkpoint-') && f.endsWith('.jsonl'));
      
      for (const file of checkpointFiles) {
        const filePath = path.join(Config.RESULTS_DIR, file);
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const lines = content.split('\n').filter(l => l.trim());
          
          for (const line of lines) {
            try {
              const entry = JSON.parse(line);
              if (entry.mnemonic) {
                this.checkedSeeds.add(entry.mnemonic);
              }
            } catch (e) {
              // Skip invalid lines
            }
          }
        } catch (error) {
          logger.debug('Could not read checkpoint file', { file });
        }
      }

      if (this.checkedSeeds.size > 0) {
        logger.info('Loaded previously checked seeds', {
          count: this.checkedSeeds.size
        });
      }
    } catch (error) {
      logger.warn('Failed to load checked seeds', {
        error: String(error)
      });
    }
  }

  /**
   * Write checkpoint of checked seeds
   */
  private writeCheckpoint(): void {
    try {
      const checkpoint = {
        timestamp: new Date().toISOString(),
        checkedCount: this.checkedSeeds.size,
        // Store hashes only for security
        seeds: Array.from(this.checkedSeeds).map(seed => ({
          mnemonic: seed,
          hash: hashSensitive(seed)
        }))
      };

      // Write to checkpoint file (overwrite each time)
      fs.writeFileSync(
        this.checkpointFile,
        JSON.stringify(checkpoint, null, 2),
        'utf-8'
      );

      logger.debug('Checkpoint written', {
        checkedCount: this.checkedSeeds.size,
        file: this.checkpointFile
      });
    } catch (error) {
      logger.warn('Failed to write checkpoint', {
        error: String(error)
      });
    }
  }

  /**
   * Check if a seed has already been checked
   */
  isAlreadyChecked(mnemonic: string): boolean {
    return this.checkedSeeds.has(mnemonic);
  }

  /**
   * Filter out already-checked seeds from a task list
   */
  filterUncheckedSeeds<T extends {mnemonic: string}>(tasks: T[]): T[] {
    const unchecked = tasks.filter(task => {
      // Hash the mnemonic to check against stored hashes
      const mnemonicHash = hashSensitive(task.mnemonic);
      return !this.checkedSeeds.has(mnemonicHash);
    });
    
    if (unchecked.length < tasks.length) {
      logger.info('Filtered out previously checked seeds', {
        original: tasks.length,
        unchecked: unchecked.length,
        skipped: tasks.length - unchecked.length
      });
    }
    
    return unchecked;
  }

  /**
   * Get count of checked seeds
   */
  getCheckedCount(): number {
    return this.checkedSeeds.size;
  }
}
