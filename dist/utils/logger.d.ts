/**
 * Winston logger configuration with rotation
 */
import * as winston from 'winston';
export declare const logger: winston.Logger;
/**
 * Hash sensitive data for logging
 */
export declare function hashSensitive(data: string): string;
/**
 * Log progress information
 */
export declare function logProgress(seedsChecked: number, totalSeeds: number, addressesQueried: number, throughput: number, apiHealth: Record<string, string>, estimatedTimeRemaining: string): void;
/**
 * Log seed check result
 */
export declare function logSeedChecked(mnemonicHash: string, probability: number, addresses: string[], checkDuration: number): void;
/**
 * Log target found
 */
export declare function logTargetFound(mnemonicHash: string, address: string, path: string, balance: number, totalSeedsChecked: number): void;
export default logger;
//# sourceMappingURL=logger.d.ts.map