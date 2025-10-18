"use strict";
/**
 * BlockCypher API client
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlockCypherClient = void 0;
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../utils/logger");
class BlockCypherClient {
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
     * GET /addrs/{address}/balance
     * Response: { balance } (in satoshis)
     */
    async checkBalance(address) {
        const startTime = Date.now();
        try {
            const response = await this.client.get(`/addrs/${address}/balance`);
            const data = response.data;
            // Balance is directly available in satoshis
            const balance = data.balance || 0;
            return {
                address,
                balance,
                apiUsed: this.endpoint.name,
                timestamp: Date.now()
            };
        }
        catch (error) {
            const duration = Date.now() - startTime;
            logger_1.logger.debug('BlockCypher API error', {
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
exports.BlockCypherClient = BlockCypherClient;
//# sourceMappingURL=blockcypher-client.js.map