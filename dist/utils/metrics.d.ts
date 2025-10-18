/**
 * Performance metrics tracking
 */
import { PerformanceMetrics } from '../types';
export declare class MetricsCollector {
    private totalSeeds;
    private startTime;
    private seedsChecked;
    private addressesQueried;
    private apiRequests;
    private apiSuccesses;
    private totalCheckDuration;
    private checkTimestamps;
    private lastCpuUsage;
    constructor(totalSeeds: number);
    /**
     * Initialize CPU tracking baseline
     */
    private initializeCpuTracking;
    /**
     * Record a completed seed check
     */
    recordSeedCheck(addressCount: number, durationMs: number): void;
    /**
     * Record an API request
     */
    recordApiRequest(success: boolean): void;
    /**
     * Get current throughput (seeds/second)
     */
    getCurrentThroughput(): number;
    /**
     * Calculate estimated time remaining
     */
    getEstimatedTimeRemaining(): string;
    /**
     * Get CPU usage percentage (calculated over time)
     */
    getCpuUsage(): number;
    /**
     * Get memory usage in MB
     */
    getMemoryUsage(): number;
    /**
     * Get comprehensive metrics
     */
    getMetrics(): PerformanceMetrics;
    /**
     * Get progress percentage
     */
    getProgress(): number;
}
//# sourceMappingURL=metrics.d.ts.map