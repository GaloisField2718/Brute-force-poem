"use strict";
/**
 * Result handler for seed checking
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
exports.ResultHandler = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const logger_1 = require("../utils/logger");
const config_1 = require("../utils/config");
class ResultHandler {
    resultsFile;
    foundWalletsFile;
    constructor() {
        const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
        this.resultsFile = path.join(config_1.Config.RESULTS_DIR, `results-${timestamp}.jsonl`);
        this.foundWalletsFile = path.join(config_1.Config.RESULTS_DIR, `found-wallets-${timestamp}.json`);
    }
    /**
     * Handle a seed check result
     */
    handleResult(result) {
        if (result.found) {
            this.handleFoundWallet(result);
        }
        else {
            this.logCheckedSeed(result);
        }
    }
    /**
     * Handle found wallet
     */
    handleFoundWallet(result) {
        if (!result.address || !result.path || !result.type || !result.balance) {
            logger_1.logger.error('Invalid found wallet result', { result });
            return;
        }
        const wallet = {
            mnemonic: result.mnemonic,
            address: result.address,
            path: result.path,
            type: result.type,
            balance: result.balance,
            totalSeedsChecked: 0, // Will be set by orchestrator
            totalTimeMs: 0 // Will be set by orchestrator
        };
        // Log to console with full details
        logger_1.logger.info('🎯 TARGET WALLET FOUND! 🎯', {
            mnemonicHash: (0, logger_1.hashSensitive)(wallet.mnemonic),
            address: wallet.address,
            path: wallet.path,
            type: wallet.type,
            balance: wallet.balance
        });
        // Save to file with full mnemonic (CAREFUL!)
        this.saveFoundWallet(wallet);
    }
    /**
     * Save found wallet to file
     */
    saveFoundWallet(wallet) {
        try {
            const data = JSON.stringify(wallet, null, 2);
            fs.writeFileSync(this.foundWalletsFile, data, 'utf-8');
            logger_1.logger.info('Found wallet saved to file', {
                file: this.foundWalletsFile
            });
            // Also create a backup with timestamp
            const backupFile = path.join(config_1.Config.RESULTS_DIR, `FOUND-${Date.now()}.json`);
            fs.writeFileSync(backupFile, data, 'utf-8');
        }
        catch (error) {
            logger_1.logger.error('Failed to save found wallet', {
                error: String(error)
            });
        }
    }
    /**
     * Log checked seed (for debugging)
     */
    logCheckedSeed(result) {
        // Only log to file, not console (too verbose)
        const logEntry = {
            mnemonicHash: (0, logger_1.hashSensitive)(result.mnemonic),
            found: result.found,
            addressesChecked: result.totalAddressesChecked,
            duration: result.checkDuration,
            timestamp: new Date().toISOString()
        };
        try {
            fs.appendFileSync(this.resultsFile, JSON.stringify(logEntry) + '\n', 'utf-8');
        }
        catch (error) {
            // Don't log errors here to avoid spam
        }
    }
    /**
     * Write summary report
     */
    writeSummary(totalSeeds, totalChecked, totalAddressesQueried, totalTimeMs, foundWallet) {
        const summary = {
            totalSeeds,
            totalChecked,
            totalAddressesQueried,
            totalTimeMs,
            durationMinutes: (totalTimeMs / 1000 / 60).toFixed(2),
            averageTimePerSeed: (totalTimeMs / totalChecked).toFixed(2) + 'ms',
            throughput: (totalChecked / (totalTimeMs / 1000)).toFixed(2) + ' seeds/s',
            foundWallet: foundWallet ? {
                address: foundWallet.address,
                path: foundWallet.path,
                balance: foundWallet.balance
            } : null,
            timestamp: new Date().toISOString()
        };
        const summaryFile = path.join(config_1.Config.RESULTS_DIR, `summary-${new Date().toISOString().replace(/:/g, '-').split('.')[0]}.json`);
        try {
            fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2), 'utf-8');
            logger_1.logger.info('Summary report saved', { file: summaryFile });
        }
        catch (error) {
            logger_1.logger.error('Failed to save summary', { error: String(error) });
        }
    }
    /**
     * Get results file path
     */
    getResultsFile() {
        return this.resultsFile;
    }
    /**
     * Get found wallets file path
     */
    getFoundWalletsFile() {
        return this.foundWalletsFile;
    }
}
exports.ResultHandler = ResultHandler;
//# sourceMappingURL=result-handler.js.map