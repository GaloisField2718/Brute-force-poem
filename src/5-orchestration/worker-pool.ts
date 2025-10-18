/**
 * Worker pool for parallel seed checking
 */

import { Worker } from 'worker_threads';
import * as path from 'path';
import * as os from 'os';
import { SeedCheckTask, SeedCheckResult, FoundWallet } from '../types';
import { logger } from '../utils/logger';
import { Config } from '../utils/config';

export class WorkerPool {
  private workers: Worker[] = [];
  private availableWorkers: Worker[] = [];
  private taskQueue: SeedCheckTask[] = [];
  private isShuttingDown: boolean = false;
  private foundWallet: FoundWallet | null = null;
  private onResultCallback?: (result: SeedCheckResult) => void;
  private onFoundCallback?: (wallet: FoundWallet) => void;

  constructor(
    private workerCount: number = Config.WORKER_COUNT,
    private workerScript: string = path.join(__dirname, '../../../workers/seed-checker-worker.js')
  ) {}

  /**
   * Initialize worker pool
   */
  async initialize(): Promise<void> {
    logger.info('Initializing worker pool', {
      workerCount: this.workerCount,
      cpuCount: os.cpus().length
    });

    for (let i = 0; i < this.workerCount; i++) {
      try {
        const worker = new Worker(this.workerScript);
        
        worker.on('message', (result: SeedCheckResult) => {
          this.handleResult(worker, result);
        });

        worker.on('error', (error) => {
          logger.error('Worker error', {
            workerId: worker.threadId,
            error: String(error)
          });
          this.removeWorker(worker);
        });

        worker.on('exit', (code) => {
          if (code !== 0 && !this.isShuttingDown) {
            logger.warn('Worker exited unexpectedly', {
              workerId: worker.threadId,
              exitCode: code
            });
          }
          this.removeWorker(worker);
        });

        this.workers.push(worker);
        this.availableWorkers.push(worker);
      } catch (error) {
        logger.error('Failed to create worker', { error: String(error) });
      }
    }

    logger.info('Worker pool initialized', {
      totalWorkers: this.workers.length
    });
  }

  /**
   * Submit a task to the pool
   */
  submitTask(task: SeedCheckTask): void {
    if (this.isShuttingDown) {
      return;
    }

    this.taskQueue.push(task);
    this.processQueue();
  }

  /**
   * Submit multiple tasks
   */
  submitTasks(tasks: SeedCheckTask[]): void {
    if (this.isShuttingDown) {
      return;
    }

    this.taskQueue.push(...tasks);
    this.processQueue();
  }

  /**
   * Process task queue
   */
  private processQueue(): void {
    while (this.availableWorkers.length > 0 && this.taskQueue.length > 0) {
      const worker = this.availableWorkers.shift();
      const task = this.taskQueue.shift();

      if (worker && task) {
        worker.postMessage(task);
      }
    }
  }

  /**
   * Handle result from worker
   */
  private handleResult(worker: Worker, result: SeedCheckResult): void {
    // Call result callback
    if (this.onResultCallback) {
      this.onResultCallback(result);
    }

    // Check if target found
    if (result.found && result.address && result.path && result.type && result.balance) {
      this.foundWallet = {
        mnemonic: result.mnemonic,
        address: result.address,
        path: result.path,
        type: result.type,
        balance: result.balance,
        totalSeedsChecked: 0, // Will be updated by orchestrator
        totalTimeMs: 0 // Will be updated by orchestrator
      };

      logger.info('🎯 WALLET FOUND!', {
        address: result.address,
        path: result.path,
        balance: result.balance
      });

      if (this.onFoundCallback) {
        this.onFoundCallback(this.foundWallet);
      }

      // Shutdown immediately
      this.shutdown();
      return;
    }

    // Make worker available again
    if (!this.isShuttingDown) {
      this.availableWorkers.push(worker);
      this.processQueue();
    }
  }

  /**
   * Remove a worker from the pool
   */
  private removeWorker(worker: Worker): void {
    this.workers = this.workers.filter(w => w !== worker);
    this.availableWorkers = this.availableWorkers.filter(w => w !== worker);
  }

  /**
   * Set callback for results
   */
  onResult(callback: (result: SeedCheckResult) => void): void {
    this.onResultCallback = callback;
  }

  /**
   * Set callback for found wallet
   */
  onFound(callback: (wallet: FoundWallet) => void): void {
    this.onFoundCallback = callback;
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.taskQueue.length;
  }

  /**
   * Get active workers count
   */
  getActiveWorkersCount(): number {
    return this.workers.length - this.availableWorkers.length;
  }

  /**
   * Check if any wallet was found
   */
  getFoundWallet(): FoundWallet | null {
    return this.foundWallet;
  }

  /**
   * Wait for all tasks to complete
   */
  async waitForCompletion(): Promise<void> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.taskQueue.length === 0 && 
            this.availableWorkers.length === this.workers.length) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }

  /**
   * Shutdown worker pool
   */
  async shutdown(): Promise<void> {
    this.isShuttingDown = true;
    this.taskQueue = [];

    logger.info('Shutting down worker pool', {
      remainingWorkers: this.workers.length
    });

    // Terminate all workers
    const terminationPromises = this.workers.map(worker => 
      worker.terminate()
    );

    await Promise.all(terminationPromises);
    
    this.workers = [];
    this.availableWorkers = [];

    logger.info('Worker pool shut down');
  }

  /**
   * Get pool statistics
   */
  getStatistics(): {
    totalWorkers: number;
    activeWorkers: number;
    availableWorkers: number;
    queueSize: number;
    isShuttingDown: boolean;
  } {
    return {
      totalWorkers: this.workers.length,
      activeWorkers: this.getActiveWorkersCount(),
      availableWorkers: this.availableWorkers.length,
      queueSize: this.taskQueue.length,
      isShuttingDown: this.isShuttingDown
    };
  }
}
