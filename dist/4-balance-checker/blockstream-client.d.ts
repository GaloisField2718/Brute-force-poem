/**
 * Blockstream API client
 */
import { ApiEndpoint, BalanceCheckResult } from '../types';
export declare class BlockstreamClient {
    private client;
    private endpoint;
    constructor(endpoint: ApiEndpoint);
    /**
     * Check balance for an address
     * GET /address/{address}
     * Response: { chain_stats: { funded_txo_sum, spent_txo_sum } }
     */
    checkBalance(address: string): Promise<BalanceCheckResult>;
    /**
     * Check multiple addresses in batch
     */
    checkBalances(addresses: string[]): Promise<BalanceCheckResult[]>;
    /**
     * Get endpoint name
     */
    getName(): string;
}
//# sourceMappingURL=blockstream-client.d.ts.map