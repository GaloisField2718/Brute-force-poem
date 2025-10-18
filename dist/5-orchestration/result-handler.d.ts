/**
 * Result handler for seed checking
 */
import { SeedCheckResult, FoundWallet } from '../types';
export declare class ResultHandler {
    private resultsFile;
    private foundWalletsFile;
    constructor();
    /**
     * Handle a seed check result
     */
    handleResult(result: SeedCheckResult): void;
    /**
     * Handle found wallet
     */
    private handleFoundWallet;
    /**
     * Save found wallet to file
     */
    private saveFoundWallet;
    /**
     * Log checked seed (for debugging)
     */
    private logCheckedSeed;
    /**
     * Write summary report
     */
    writeSummary(totalSeeds: number, totalChecked: number, totalAddressesQueried: number, totalTimeMs: number, foundWallet: FoundWallet | null): void;
    /**
     * Get results file path
     */
    getResultsFile(): string;
    /**
     * Get found wallets file path
     */
    getFoundWalletsFile(): string;
}
//# sourceMappingURL=result-handler.d.ts.map