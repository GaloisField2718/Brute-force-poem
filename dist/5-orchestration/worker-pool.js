"use strict";
/**
 * Worker pool for parallel seed checking
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkerPool = void 0;
const worker_threads_1 = require("worker_threads");
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const logger_1 = require("../utils/logger");
const config_1 = require("../utils/config");
class WorkerPool {
    workerCount;
    workerScript;
    workers = [];
    availableWorkers = [];
    taskQueue = [];
    isShuttingDown = false;
    foundWallet = null;
    onResultCallback;
    onFoundCallback;
    constructor(workerCount = config_1.Config.WORKER_COUNT, workerScript = path.join(__dirname, '../../workers/seed-checker-worker.js')) {
        this.workerCount = workerCount;
        this.workerScript = workerScript;
    }
    /**
     * Initialize worker pool
     */
    async initialize() {
        logger_1.logger.info('Initializing worker pool', {
            workerCount: this.workerCount,
            cpuCount: os.cpus().length
        });
        for (let i = 0; i < this.workerCount; i++) {
            try {
                const worker = new worker_threads_1.Worker(this.workerScript);
                worker.on('message', (result) => {
                    this.handleResult(worker, result);
                });
                worker.on('error', (error) => {
                    logger_1.logger.error('Worker error', {
                        workerId: worker.threadId,
                        error: String(error)
                    });
                    this.removeWorker(worker);
                });
                worker.on('exit', (code) => {
                    if (code !== 0 && !this.isShuttingDown) {
                        logger_1.logger.warn('Worker exited unexpectedly', {
                            workerId: worker.threadId,
                            exitCode: code
                        });
                    }
                    this.removeWorker(worker);
                });
                this.workers.push(worker);
                this.availableWorkers.push(worker);
            }
            catch (error) {
                logger_1.logger.error('Failed to create worker', { error: String(error) });
            }
        }
        logger_1.logger.info('Worker pool initialized', {
            totalWorkers: this.workers.length
        });
    }
    /**
     * Submit a task to the pool
     */
    submitTask(task) {
        if (this.isShuttingDown) {
            logger_1.logger.debug('Rejecting task - pool is shutting down');
            return;
        }
        this.taskQueue.push(task);
        this.processQueue();
    }
    /**
     * Submit multiple tasks
     */
    submitTasks(tasks) {
        if (this.isShuttingDown) {
            logger_1.logger.debug('Rejecting tasks - pool is shutting down');
            return;
        }
        this.taskQueue.push(...tasks);
        this.processQueue();
    }
    /**
     * Process task queue (thread-safe)
     */
    processQueue() {
        // Check shutdown flag before processing
        if (this.isShuttingDown) {
            return;
        }
        while (this.availableWorkers.length > 0 && this.taskQueue.length > 0 && !this.isShuttingDown) {
            const worker = this.availableWorkers.shift();
            const task = this.taskQueue.shift();
            if (worker && task && !this.isShuttingDown) {
                try {
                    worker.postMessage(task);
                }
                catch (error) {
                    logger_1.logger.error('Failed to send task to worker', {
                        error: String(error),
                        workerId: worker.threadId
                    });
                    // Return worker to available pool
                    this.availableWorkers.push(worker);
                    // Return task to queue
                    this.taskQueue.unshift(task);
                }
            }
            else if (task) {
                // If no worker but we have a task, put it back
                this.taskQueue.unshift(task);
                break;
            }
        }
    }
    /**
     * Handle result from worker
     */
    handleResult(worker, result) {
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
            logger_1.logger.info('🎯 WALLET FOUND!', {
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
    removeWorker(worker) {
        this.workers = this.workers.filter(w => w !== worker);
        this.availableWorkers = this.availableWorkers.filter(w => w !== worker);
    }
    /**
     * Set callback for results
     */
    onResult(callback) {
        this.onResultCallback = callback;
    }
    /**
     * Set callback for found wallet
     */
    onFound(callback) {
        this.onFoundCallback = callback;
    }
    /**
     * Get queue size
     */
    getQueueSize() {
        return this.taskQueue.length;
    }
    /**
     * Get active workers count
     */
    getActiveWorkersCount() {
        return this.workers.length - this.availableWorkers.length;
    }
    /**
     * Check if any wallet was found
     */
    getFoundWallet() {
        return this.foundWallet;
    }
    /**
     * Wait for all tasks to complete
     */
    async waitForCompletion() {
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
    async shutdown() {
        this.isShuttingDown = true;
        this.taskQueue = [];
        logger_1.logger.info('Shutting down worker pool', {
            remainingWorkers: this.workers.length
        });
        // Terminate all workers
        const terminationPromises = this.workers.map(worker => worker.terminate());
        await Promise.all(terminationPromises);
        this.workers = [];
        this.availableWorkers = [];
        logger_1.logger.info('Worker pool shut down');
    }
    /**
     * Get pool statistics
     */
    getStatistics() {
        return {
            totalWorkers: this.workers.length,
            activeWorkers: this.getActiveWorkersCount(),
            availableWorkers: this.availableWorkers.length,
            queueSize: this.taskQueue.length,
            isShuttingDown: this.isShuttingDown
        };
    }
}
exports.WorkerPool = WorkerPool;
//# sourceMappingURL=worker-pool.js.map