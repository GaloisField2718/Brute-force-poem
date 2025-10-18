"use strict";
/**
 * Winston logger configuration with rotation
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.hashSensitive = hashSensitive;
exports.logProgress = logProgress;
exports.logSeedChecked = logSeedChecked;
exports.logTargetFound = logTargetFound;
const winston = __importStar(require("winston"));
const crypto = __importStar(require("crypto"));
const winston_daily_rotate_file_1 = __importDefault(require("winston-daily-rotate-file"));
const config_1 = require("./config");
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
exports.logger = winston.createLogger({
    level: config_1.Config.LOG_LEVEL,
    format: combine(errors({ stack: true }), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), logFormat),
    transports: [
        // Console output with colors
        new winston.transports.Console({
            format: combine(colorize(), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), logFormat)
        }),
        // Daily rotating file for all logs
        new winston_daily_rotate_file_1.default({
            filename: `${config_1.Config.LOG_DIR}/combined-%DATE%.log`,
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',
            maxFiles: '14d',
            format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), logFormat)
        }),
        // Separate file for errors
        new winston_daily_rotate_file_1.default({
            filename: `${config_1.Config.LOG_DIR}/error-%DATE%.log`,
            datePattern: 'YYYY-MM-DD',
            level: 'error',
            maxSize: '20m',
            maxFiles: '30d',
            format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), logFormat)
        }),
        // Separate file for important results
        new winston_daily_rotate_file_1.default({
            filename: `${config_1.Config.LOG_DIR}/results-%DATE%.log`,
            datePattern: 'YYYY-MM-DD',
            level: 'info',
            maxSize: '20m',
            maxFiles: '90d',
            format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), logFormat)
        })
    ]
});
/**
 * Hash sensitive data for logging
 */
function hashSensitive(data) {
    if (!data || typeof data !== 'string') {
        return 'invalid';
    }
    return crypto.createHash('sha256').update(data).digest('hex').slice(0, 8);
}
/**
 * Log progress information
 */
function logProgress(seedsChecked, totalSeeds, addressesQueried, throughput, apiHealth, estimatedTimeRemaining) {
    const progress = ((seedsChecked / totalSeeds) * 100).toFixed(2);
    exports.logger.info('Progress Update', {
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
function logSeedChecked(mnemonicHash, probability, addresses, checkDuration) {
    exports.logger.debug('Seed checked', {
        mnemonicHash,
        probability: probability.toFixed(4),
        addressCount: addresses.length,
        checkDuration: `${checkDuration.toFixed(2)}ms`
    });
}
/**
 * Log target found
 */
function logTargetFound(mnemonicHash, address, path, balance, totalSeedsChecked) {
    exports.logger.info('🎯 TARGET FOUND!', {
        mnemonicHash,
        address,
        path,
        balance,
        totalSeedsChecked
    });
}
exports.default = exports.logger;
