"use strict";
/**
 * Blockstream API client
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlockstreamClient = void 0;
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../utils/logger");
class BlockstreamClient {
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
     * GET /address/{address}
     * Response: { chain_stats: { funded_txo_sum, spent_txo_sum } }
     */
    async checkBalance(address) {
        const startTime = Date.now();
        try {
            const response = await this.client.get(`/address/${address}`);
            const data = response.data;
            // Calculate balance from chain stats
            const funded = data.chain_stats?.funded_txo_sum || 0;
            const spent = data.chain_stats?.spent_txo_sum || 0;
            const balance = funded - spent;
            return {
                address,
                balance,
                apiUsed: this.endpoint.name,
                timestamp: Date.now()
            };
        }
        catch (error) {
            const duration = Date.now() - startTime;
            logger_1.logger.debug('Blockstream API error', {
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
     */
    async checkBalances(addresses) {
        return Promise.all(addresses.map(addr => this.checkBalance(addr)));
    }
    /**
     * Get endpoint name
     */
    getName() {
        return this.endpoint.name;
    }
}
exports.BlockstreamClient = BlockstreamClient;
//# sourceMappingURL=blockstream-client.js.map