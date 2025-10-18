/**
 * Performance metrics tracking
 */

import { PerformanceMetrics } from '../types';
import * as os from 'os';

export class MetricsCollector {
  private startTime: number;
  private seedsChecked: number = 0;
  private addressesQueried: number = 0;
  private apiRequests: number = 0;
  private apiSuccesses: number = 0;
  private totalCheckDuration: number = 0;
  private checkTimestamps: number[] = [];

  constructor(private totalSeeds: number) {
    this.startTime = Date.now();
  }

  /**
   * Record a completed seed check
   */
  recordSeedCheck(addressCount: number, durationMs: number): void {
    this.seedsChecked++;
    this.addressesQueried += addressCount;
    this.totalCheckDuration += durationMs;
    this.checkTimestamps.push(Date.now());
    
    // Keep only last 100 timestamps for rate calculation
    if (this.checkTimestamps.length > 100) {
      this.checkTimestamps.shift();
    }
  }

  /**
   * Record an API request
   */
  recordApiRequest(success: boolean): void {
    this.apiRequests++;
    if (success) {
      this.apiSuccesses++;
    }
  }

  /**
   * Get current throughput (seeds/second)
   */
  getCurrentThroughput(): number {
    if (this.checkTimestamps.length < 2) {
      return 0;
    }
    
    const firstTimestamp = this.checkTimestamps[0];
    const lastTimestamp = this.checkTimestamps[this.checkTimestamps.length - 1];
    const durationSeconds = (lastTimestamp - firstTimestamp) / 1000;
    
    if (durationSeconds === 0) {
      return 0;
    }
    
    return this.checkTimestamps.length / durationSeconds;
  }

  /**
   * Calculate estimated time remaining
   */
  getEstimatedTimeRemaining(): string {
    const throughput = this.getCurrentThroughput();
    if (throughput === 0) {
      return 'calculating...';
    }
    
    const remainingSeeds = this.totalSeeds - this.seedsChecked;
    const remainingSeconds = remainingSeeds / throughput;
    
    if (remainingSeconds < 60) {
      return `${Math.ceil(remainingSeconds)}s`;
    } else if (remainingSeconds < 3600) {
      return `${Math.ceil(remainingSeconds / 60)}m`;
    } else {
      const hours = Math.floor(remainingSeconds / 3600);
      const minutes = Math.ceil((remainingSeconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  }

  /**
   * Get CPU usage percentage
   */
  getCpuUsage(): number {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    });

    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const usage = 100 - (100 * idle / total);
    
    return Math.round(usage);
  }

  /**
   * Get memory usage in MB
   */
  getMemoryUsage(): number {
    const used = process.memoryUsage();
    return Math.round(used.heapUsed / 1024 / 1024);
  }

  /**
   * Get comprehensive metrics
   */
  getMetrics(): PerformanceMetrics {
    const elapsedSeconds = (Date.now() - this.startTime) / 1000;
    const throughput = this.getCurrentThroughput();
    
    return {
      seedsPerSecond: throughput,
      addressesPerSecond: this.addressesQueried / elapsedSeconds,
      apiRequestsPerSecond: this.apiRequests / elapsedSeconds,
      avgAddressCheckMs: this.totalCheckDuration / this.addressesQueried || 0,
      avgSeedCheckMs: this.totalCheckDuration / this.seedsChecked || 0,
      cpuUsagePercent: this.getCpuUsage(),
      memoryUsageMB: this.getMemoryUsage(),
      apiSuccessRate: (this.apiSuccesses / this.apiRequests) * 100 || 0,
      totalSeedsGenerated: this.totalSeeds,
      totalSeedsChecked: this.seedsChecked,
      totalAddressesQueried: this.addressesQueried,
      estimatedCompletionTime: this.getEstimatedTimeRemaining()
    };
  }

  /**
   * Get progress percentage
   */
  getProgress(): number {
    return (this.seedsChecked / this.totalSeeds) * 100;
  }
}
