/**
 * Blockchain.info API client
 */
import { ApiEndpoint, BalanceCheckResult } from '../types';
export declare class BlockchainInfoClient {
    private client;
    private endpoint;
    constructor(endpoint: ApiEndpoint);
    /**
     * Check balance for an address
     * GET /balance?active={address}
     * Response: { "{address}": { final_balance } }
     */
    checkBalance(address: string): Promise<BalanceCheckResult>;
    /**
     * Check multiple addresses in batch
     * Blockchain.info supports checking multiple addresses in one call
     */
    checkBalances(addresses: string[]): Promise<BalanceCheckResult[]>;
    /**
     * Get endpoint name
     */
    getName(): string;
}
//# sourceMappingURL=blockchain-info-client.d.ts.map