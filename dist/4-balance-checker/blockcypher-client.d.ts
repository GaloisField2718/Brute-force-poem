/**
 * BlockCypher API client
 */
import { ApiEndpoint, BalanceCheckResult } from '../types';
export declare class BlockCypherClient {
    private client;
    private endpoint;
    constructor(endpoint: ApiEndpoint);
    /**
     * Check balance for an address
     * GET /addrs/{address}/balance
     * Response: { balance } (in satoshis)
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
//# sourceMappingURL=blockcypher-client.d.ts.map