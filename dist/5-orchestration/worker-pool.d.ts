/**
 * Worker pool for parallel seed checking
 */
import { SeedCheckTask, SeedCheckResult, FoundWallet } from '../types';
export declare class WorkerPool {
    private workerCount;
    private workerScript;
    private workers;
    private availableWorkers;
    private taskQueue;
    private isShuttingDown;
    private foundWallet;
    private onResultCallback?;
    private onFoundCallback?;
    constructor(workerCount?: number, workerScript?: string);
    /**
     * Initialize worker pool
     */
    initialize(): Promise<void>;
    /**
     * Submit a task to the pool
     */
    submitTask(task: SeedCheckTask): void;
    /**
     * Submit multiple tasks
     */
    submitTasks(tasks: SeedCheckTask[]): void;
    /**
     * Process task queue (thread-safe)
     */
    private processQueue;
    /**
     * Handle result from worker
     */
    private handleResult;
    /**
     * Remove a worker from the pool
     */
    private removeWorker;
    /**
     * Set callback for results
     */
    onResult(callback: (result: SeedCheckResult) => void): void;
    /**
     * Set callback for found wallet
     */
    onFound(callback: (wallet: FoundWallet) => void): void;
    /**
     * Get queue size
     */
    getQueueSize(): number;
    /**
     * Get active workers count
     */
    getActiveWorkersCount(): number;
    /**
     * Check if any wallet was found
     */
    getFoundWallet(): FoundWallet | null;
    /**
     * Wait for all tasks to complete
     */
    waitForCompletion(): Promise<void>;
    /**
     * Shutdown worker pool
     */
    shutdown(): Promise<void>;
    /**
     * Get pool statistics
     */
    getStatistics(): {
        totalWorkers: number;
        activeWorkers: number;
        availableWorkers: number;
        queueSize: number;
        isShuttingDown: boolean;
    };
}
//# sourceMappingURL=worker-pool.d.ts.map