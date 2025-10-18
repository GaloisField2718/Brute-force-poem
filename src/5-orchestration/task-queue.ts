/**
 * Task queue manager
 */

import { SeedCheckTask } from '../types';

export class TaskQueue {
  private queue: SeedCheckTask[] = [];
  private completed: Set<string> = new Set();
  private processing: Set<string> = new Set();

  /**
   * Add task to queue
   */
  enqueue(task: SeedCheckTask): void {
    if (!this.completed.has(task.mnemonic) && !this.processing.has(task.mnemonic)) {
      this.queue.push(task);
    }
  }

  /**
   * Add multiple tasks
   */
  enqueueMultiple(tasks: SeedCheckTask[]): void {
    for (const task of tasks) {
      this.enqueue(task);
    }
  }

  /**
   * Get next task
   */
  dequeue(): SeedCheckTask | undefined {
    const task = this.queue.shift();
    if (task) {
      this.processing.add(task.mnemonic);
    }
    return task;
  }

  /**
   * Mark task as completed
   */
  markCompleted(mnemonic: string): void {
    this.processing.delete(mnemonic);
    this.completed.add(mnemonic);
  }

  /**
   * Get queue size
   */
  size(): number {
    return this.queue.length;
  }

  /**
   * Get completed count
   */
  completedCount(): number {
    return this.completed.size;
  }

  /**
   * Get processing count
   */
  processingCount(): number {
    return this.processing.size;
  }

  /**
   * Check if queue is empty
   */
  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  /**
   * Clear queue
   */
  clear(): void {
    this.queue = [];
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    queued: number;
    processing: number;
    completed: number;
    total: number;
  } {
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
  sortByProbability(): void {
    this.queue.sort((a, b) => b.probability - a.probability);
  }
}
