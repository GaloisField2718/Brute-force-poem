"use strict";
/**
 * Task queue manager
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskQueue = void 0;
class TaskQueue {
    queue = [];
    completed = new Set();
    processing = new Set();
    /**
     * Add task to queue
     */
    enqueue(task) {
        if (!this.completed.has(task.mnemonic) && !this.processing.has(task.mnemonic)) {
            this.queue.push(task);
        }
    }
    /**
     * Add multiple tasks
     */
    enqueueMultiple(tasks) {
        for (const task of tasks) {
            this.enqueue(task);
        }
    }
    /**
     * Get next task
     */
    dequeue() {
        const task = this.queue.shift();
        if (task) {
            this.processing.add(task.mnemonic);
        }
        return task;
    }
    /**
     * Mark task as completed
     */
    markCompleted(mnemonic) {
        this.processing.delete(mnemonic);
        this.completed.add(mnemonic);
    }
    /**
     * Get queue size
     */
    size() {
        return this.queue.length;
    }
    /**
     * Get completed count
     */
    completedCount() {
        return this.completed.size;
    }
    /**
     * Get processing count
     */
    processingCount() {
        return this.processing.size;
    }
    /**
     * Check if queue is empty
     */
    isEmpty() {
        return this.queue.length === 0;
    }
    /**
     * Clear queue
     */
    clear() {
        this.queue = [];
    }
    /**
     * Get statistics
     */
    getStatistics() {
        return {
            queued: this.queue.length,
            processing: this.processing.size,
            completed: this.completed.size,
            total: this.queue.length + this.processing.size + this.completed.size
        };
    }
    /**
     * Sort queue by probability (highest first)
     */
    sortByProbability() {
        this.queue.sort((a, b) => b.probability - a.probability);
    }
}
exports.TaskQueue = TaskQueue;
//# sourceMappingURL=task-queue.js.map