/**
 * Core type definitions for Bitcoin Seed Recovery System
 */
export interface PoemBlank {
    position: number;
    context: string;
    constraints: {
        length: number;
        pattern: string;
        syllables: number;
        rhyme_with?: string;
        semantic_domain: string[];
    };
}
export interface PoemConfig {
    poem: string;
    target_balance: number;
    blanks: PoemBlank[];
}
export interface WordScore {
    word: string;
    scores: {
        lengthMatch: number;
        syllableMatch: number;
        posMatch: number;
        semanticFit: number;
        rhymeMatch: number;
        contextualFit: number;
    };
    totalScore: number;
    rank: number;
}
export interface ScoredCandidate {
    word: string;
    score: number;
    reason: string;
}
export type AddressType = 'legacy' | 'nested-segwit' | 'native-segwit' | 'taproot';
export interface DerivationPath {
    standard: string;
    type: AddressType;
    indices: number[];
    path: string;
}
export interface DerivedAddress {
    address: string;
    path: string;
    type: AddressType;
    index: number;
}
export interface ApiEndpoint {
    name: string;
    baseUrl: string;
    rateLimit: {
        requestsPerSecond: number;
        requestsPerMinute: number;
        requestsPerHour: number;
    };
    priority: number;
    timeout: number;
    retryStrategy: {
        maxRetries: number;
        backoffMs: number[];
    };
}
export interface ApiConfig {
    endpoints: ApiEndpoint[];
}
export interface BalanceCheckResult {
    address: string;
    balance: number;
    apiUsed: string;
    timestamp: number;
    error?: string;
}
export interface SeedCheckTask {
    mnemonic: string;
    probability: number;
    rank: number;
}
export interface SeedCheckResult {
    found: boolean;
    mnemonic: string;
    address?: string;
    path?: string;
    type?: AddressType;
    balance?: number;
    totalAddressesChecked: number;
    checkDuration: number;
}
export interface FoundWallet {
    mnemonic: string;
    address: string;
    path: string;
    type: AddressType;
    balance: number;
    totalSeedsChecked: number;
    totalTimeMs: number;
}
export interface PerformanceMetrics {
    seedsPerSecond: number;
    addressesPerSecond: number;
    apiRequestsPerSecond: number;
    avgAddressCheckMs: number;
    avgSeedCheckMs: number;
    cpuUsagePercent: number;
    memoryUsageMB: number;
    apiSuccessRate: number;
    totalSeedsGenerated: number;
    totalSeedsChecked: number;
    totalAddressesQueried: number;
    estimatedCompletionTime: string;
}
export interface ApiHealth {
    name: string;
    status: 'healthy' | 'rate-limited' | 'error' | 'timeout';
    consecutiveFailures: number;
    lastCheckTimestamp: number;
    blacklistedUntil?: number;
}
export interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number;
}
export interface BeamSearchState {
    partialSeed: string[];
    score: number;
    depth: number;
}
//# sourceMappingURL=index.d.ts.map