"use strict";
/**
 * Performance metrics tracking
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
exports.MetricsCollector = void 0;
const os = __importStar(require("os"));
class MetricsCollector {
    totalSeeds;
    startTime;
    seedsChecked = 0;
    addressesQueried = 0;
    apiRequests = 0;
    apiSuccesses = 0;
    totalCheckDuration = 0;
    checkTimestamps = [];
    lastCpuUsage = null;
    constructor(totalSeeds) {
        this.totalSeeds = totalSeeds;
        this.startTime = Date.now();
        this.initializeCpuTracking();
    }
    /**
     * Initialize CPU tracking baseline
     */
    initializeCpuTracking() {
        const cpus = os.cpus();
        let totalIdle = 0;
        let totalTick = 0;
        cpus.forEach(cpu => {
            for (const type in cpu.times) {
                totalTick += cpu.times[type];
            }
            totalIdle += cpu.times.idle;
        });
        this.lastCpuUsage = {
            idle: totalIdle,
            total: totalTick,
            timestamp: Date.now()
        };
    }
    /**
     * Record a completed seed check
     */
    recordSeedCheck(addressCount, durationMs) {
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
    recordApiRequest(success) {
        this.apiRequests++;
        if (success) {
            this.apiSuccesses++;
        }
    }
    /**
     * Get current throughput (seeds/second)
     */
    getCurrentThroughput() {
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
    getEstimatedTimeRemaining() {
        const throughput = this.getCurrentThroughput();
        if (throughput === 0) {
            return 'calculating...';
        }
        const remainingSeeds = this.totalSeeds - this.seedsChecked;
        const remainingSeconds = remainingSeeds / throughput;
        if (remainingSeconds < 60) {
            return `${Math.ceil(remainingSeconds)}s`;
        }
        else if (remainingSeconds < 3600) {
            return `${Math.ceil(remainingSeconds / 60)}m`;
        }
        else {
            const hours = Math.floor(remainingSeconds / 3600);
            const minutes = Math.ceil((remainingSeconds % 3600) / 60);
            return `${hours}h ${minutes}m`;
        }
    }
    /**
     * Get CPU usage percentage (calculated over time)
     */
    getCpuUsage() {
        if (!this.lastCpuUsage) {
            this.initializeCpuTracking();
            return 0;
        }
        const cpus = os.cpus();
        let totalIdle = 0;
        let totalTick = 0;
        cpus.forEach(cpu => {
            for (const type in cpu.times) {
                totalTick += cpu.times[type];
            }
            totalIdle += cpu.times.idle;
        });
        const idleDelta = totalIdle - this.lastCpuUsage.idle;
        const totalDelta = totalTick - this.lastCpuUsage.total;
        // Update last CPU usage
        this.lastCpuUsage = {
            idle: totalIdle,
            total: totalTick,
            timestamp: Date.now()
        };
        // Calculate usage percentage
        if (totalDelta === 0) {
            return 0;
        }
        const usage = 100 - (100 * idleDelta / totalDelta);
        return Math.max(0, Math.min(100, Math.round(usage)));
    }
    /**
     * Get memory usage in MB
     */
    getMemoryUsage() {
        const used = process.memoryUsage();
        return Math.round(used.heapUsed / 1024 / 1024);
    }
    /**
     * Get comprehensive metrics
     */
    getMetrics() {
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
    getProgress() {
        return (this.seedsChecked / this.totalSeeds) * 100;
    }
}
exports.MetricsCollector = MetricsCollector;
//# sourceMappingURL=metrics.js.map