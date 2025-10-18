"use strict";
/**
 * Blockchain.info API client
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlockchainInfoClient = void 0;
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../utils/logger");
class BlockchainInfoClient {
    client;
    endpoint;
    constructor(endpoint) {
        this.endpoint = endpoint;
        this.client = axios_1.default.create({
            baseURL: endpoint.baseUrl,
            timeout: endpoint.timeout,
            headers: {
                'User-Agent': 'Bitcoin-Seed-Recovery/1.0'
            }
        });
    }
    /**
     * Check balance for an address
     * GET /balance?active={address}
     * Response: { "{address}": { final_balance } }
     */
    async checkBalance(address) {
        const startTime = Date.now();
        try {
            const response = await this.client.get(`/balance?active=${address}`);
            const data = response.data;
            // Extract balance from response
            const balance = data[address]?.final_balance || 0;
            return {
                address,
                balance,
                apiUsed: this.endpoint.name,
                timestamp: Date.now()
            };
        }
        catch (error) {
            const duration = Date.now() - startTime;
            logger_1.logger.debug('Blockchain.info API error', {
                address,
                error: error.message,
                status: error.response?.status,
                duration
            });
            return {
                address,
                balance: 0,
                apiUsed: this.endpoint.name,
                timestamp: Date.now(),
                error: error.message
            };
        }
    }
    /**
     * Check multiple addresses in batch
     * Blockchain.info supports checking multiple addresses in one call
     */
    async checkBalances(addresses) {
        if (addresses.length === 0) {
            return [];
        }
        // Batch check (up to 100 addresses at once)
        const batchSize = 100;
        const results = [];
        for (let i = 0; i < addresses.length; i += batchSize) {
            const batch = addresses.slice(i, i + batchSize);
            const addressesParam = batch.join('|');
            try {
                const response = await this.client.get(`/balance?active=${addressesParam}`);
                const data = response.data;
                for (const address of batch) {
                    results.push({
                        address,
                        balance: data[address]?.final_balance || 0,
                        apiUsed: this.endpoint.name,
                        timestamp: Date.now()
                    });
                }
            }
            catch (error) {
                logger_1.logger.debug('Blockchain.info batch API error', {
                    batchSize: batch.length,
                    error: error.message
                });
                // Fall back to individual checks
                for (const address of batch) {
                    results.push(await this.checkBalance(address));
                }
            }
        }
        return results;
    }
    /**
     * Get endpoint name
     */
    getName() {
        return this.endpoint.name;
    }
}
exports.BlockchainInfoClient = BlockchainInfoClient;
