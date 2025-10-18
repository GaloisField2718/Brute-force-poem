/**
 * Winston logger configuration with rotation
 */

import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { Config } from './config';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom log format
const logFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;
  
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  
  return msg;
});

// Create logger instance
export const logger = winston.createLogger({
  level: Config.LOG_LEVEL,
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),
  transports: [
    // Console output with colors
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
      )
    }),
    
    // Daily rotating file for all logs
    new DailyRotateFile({
      filename: `${Config.LOG_DIR}/combined-%DATE%.log`,
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
      )
    }),
    
    // Separate file for errors
    new DailyRotateFile({
      filename: `${Config.LOG_DIR}/error-%DATE%.log`,
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '30d',
      format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
      )
    }),
    
    // Separate file for important results
    new DailyRotateFile({
      filename: `${Config.LOG_DIR}/results-%DATE%.log`,
      datePattern: 'YYYY-MM-DD',
      level: 'info',
      maxSize: '20m',
      maxFiles: '90d',
      format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
      )
    })
  ]
});

/**
 * Hash sensitive data for logging
 */
export function hashSensitive(data: string): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(data).digest('hex').slice(0, 8);
}

/**
 * Log progress information
 */
export function logProgress(
  seedsChecked: number,
  totalSeeds: number,
  addressesQueried: number,
  throughput: number,
  apiHealth: Record<string, string>,
  estimatedTimeRemaining: string
): void {
  const progress = ((seedsChecked / totalSeeds) * 100).toFixed(2);
  
  logger.info('Progress Update', {
    seedsChecked,
    totalSeeds,
    progress: `${progress}%`,
    addressesQueried,
    currentThroughput: `${throughput.toFixed(2)} seeds/s`,
    estimatedTimeRemaining,
    apiHealth
  });
}

/**
 * Log seed check result
 */
export function logSeedChecked(
  mnemonicHash: string,
  probability: number,
  addresses: string[],
  checkDuration: number
): void {
  logger.debug('Seed checked', {
    mnemonicHash,
    probability: probability.toFixed(4),
    addressCount: addresses.length,
    checkDuration: `${checkDuration.toFixed(2)}ms`
  });
}

/**
 * Log target found
 */
export function logTargetFound(
  mnemonicHash: string,
  address: string,
  path: string,
  balance: number,
  totalSeedsChecked: number
): void {
  logger.info('🎯 TARGET FOUND!', {
    mnemonicHash,
    address,
    path,
    balance,
    totalSeedsChecked
  });
}

export default logger;
