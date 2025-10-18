/**
 * Task queue manager
 */
import { SeedCheckTask } from '../types';
export declare class TaskQueue {
    private queue;
    private completed;
    private processing;
    /**
     * Add task to queue
     */
    enqueue(task: SeedCheckTask): void;
    /**
     * Add multiple tasks
     */
    enqueueMultiple(tasks: SeedCheckTask[]): void;
    /**
     * Get next task
     */
    dequeue(): SeedCheckTask | undefined;
    /**
     * Mark task as completed
     */
    markCompleted(mnemonic: string): void;
    /**
     * Get queue size
     */
    size(): number;
    /**
     * Get completed count
     */
    completedCount(): number;
    /**
     * Get processing count
     */
    processingCount(): number;
    /**
     * Check if queue is empty
     */
    isEmpty(): boolean;
    /**
     * Clear queue
     */
    clear(): void;
    /**
     * Get statistics
     */
    getStatistics(): {
        queued: number;
        processing: number;
        completed: number;
        total: number;
    };
    /**
     * Sort queue by probability (highest first)
     */
    sortByProbability(): void;
}
//# sourceMappingURL=task-queue.d.ts.map