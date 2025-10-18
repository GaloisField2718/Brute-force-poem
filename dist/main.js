"use strict";
/**
 * Main orchestration for Bitcoin Seed Recovery
 */
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("./utils/config");
const logger_1 = require("./utils/logger");
const metrics_1 = require("./utils/metrics");
const bip39_filter_1 = require("./2-seed-generator/bip39-filter");
const openrouter_client_1 = require("./1-poem-analyzer/openrouter-client");
const beam_search_1 = require("./2-seed-generator/beam-search");
const seed_ranker_1 = require("./2-seed-generator/seed-ranker");
const worker_pool_1 = require("./5-orchestration/worker-pool");
const result_handler_1 = require("./5-orchestration/result-handler");
class SeedRecoveryOrchestrator {
    metrics;
    workerPool;
    resultHandler;
    progressInterval;
    startTime = 0;
    seedsChecked = 0;
    async run() {
        try {
            logger_1.logger.info('=== Bitcoin Seed Recovery System Started ===');
            this.startTime = Date.now();
            // Step 1: Validate configuration
            logger_1.logger.info('Step 1: Validating configuration');
            config_1.Config.validate();
            logger_1.logger.info('Configuration valid');
            // Step 2: Load poem and API configs
            logger_1.logger.info('Step 2: Loading configurations');
            const poemConfig = config_1.Config.loadPoemConfig();
            const apiConfig = config_1.Config.loadApiConfig();
            logger_1.logger.info('Configurations loaded', {
                blanks: poemConfig.blanks.length,
                apis: apiConfig.endpoints.length
            });
            // Step 3: Test OpenRouter connection
            logger_1.logger.info('Step 3: Testing OpenRouter API');
            const openRouter = new openrouter_client_1.OpenRouterClient();
            const connected = await openRouter.testConnection();
            if (!connected) {
                logger_1.logger.warn('OpenRouter connection test failed, continuing anyway');
            }
            else {
                logger_1.logger.info('OpenRouter API connected');
            }
            // Step 4: Filter BIP39 words for each position
            logger_1.logger.info('Step 4: Filtering BIP39 words by constraints');
            const candidatesPerPosition = new Map();
            // Only process first 11 positions - position 12 is determined by checksum
            const blanksToProcess = poemConfig.blanks.filter(blank => blank.position <= 11);
            if (blanksToProcess.length !== 11) {
                throw new Error(`Expected 11 blanks (positions 1-11), got ${blanksToProcess.length}. Position 12 is determined by BIP39 checksum.`);
            }
            for (const blank of blanksToProcess) {
                logger_1.logger.info(`Filtering position ${blank.position}`);
                const filtered = await bip39_filter_1.BIP39Filter.filterWords(blank, 1);
                const topWords = bip39_filter_1.BIP39Filter.getTopK(filtered, config_1.Config.TOP_K_PER_POSITION);
                candidatesPerPosition.set(blank.position, topWords);
                logger_1.logger.info(`Position ${blank.position}: ${topWords.length} candidates`, {
                    topWords: topWords.slice(0, 5)
                });
            }
            // Step 5: Score candidates with OpenRouter (only positions 1-11)
            logger_1.logger.info('Step 5: Scoring candidates with LLM');
            const scoredCandidates = await openRouter.scoreMultiplePositions(blanksToProcess, candidatesPerPosition);
            // Update candidates with scored words (top 15 from LLM)
            for (const [position, scored] of scoredCandidates.entries()) {
                const topScored = scored.slice(0, 15).map(s => s.word);
                candidatesPerPosition.set(position, topScored);
                logger_1.logger.info(`Position ${position}: LLM scored`, {
                    topWords: topScored.slice(0, 5),
                    topScore: scored[0]?.score.toFixed(3)
                });
            }
            // Step 6: Run beam search
            logger_1.logger.info('Step 6: Running beam search');
            const beamSearch = new beam_search_1.BeamSearch(config_1.Config.BEAM_WIDTH);
            beamSearch.setWordScores(scoredCandidates);
            const searchSpaceSize = beamSearch.getSearchSpaceSize(candidatesPerPosition);
            logger_1.logger.info('Search space calculated', {
                approximateSize: searchSpaceSize.toExponential(2),
                beamWidth: config_1.Config.BEAM_WIDTH,
                maxSeeds: config_1.Config.MAX_SEEDS_TO_CHECK
            });
            const candidateSeeds = beamSearch.search(candidatesPerPosition, config_1.Config.MAX_SEEDS_TO_CHECK);
            logger_1.logger.info('Beam search complete', {
                generatedSeeds: candidateSeeds.length
            });
            // Step 7: Rank seeds
            logger_1.logger.info('Step 7: Ranking seeds');
            const wordScoresMap = new Map();
            for (const [position, scored] of scoredCandidates.entries()) {
                const scoreMap = new Map();
                scored.forEach(s => scoreMap.set(s.word, s.score));
                wordScoresMap.set(position, scoreMap);
            }
            const rankedSeeds = seed_ranker_1.SeedRanker.rankSeeds(candidateSeeds, wordScoresMap);
            const tasks = seed_ranker_1.SeedRanker.toTasks(rankedSeeds);
            logger_1.logger.info('Seeds ranked', {
                totalTasks: tasks.length,
                topProbability: tasks[0]?.probability.toFixed(4)
            });
            // Step 8: Initialize worker pool
            logger_1.logger.info('Step 8: Initializing worker pool');
            this.workerPool = new worker_pool_1.WorkerPool(config_1.Config.WORKER_COUNT);
            await this.workerPool.initialize();
            // Step 9: Initialize metrics and result handler
            this.metrics = new metrics_1.MetricsCollector(tasks.length);
            this.resultHandler = new result_handler_1.ResultHandler();
            // Set up callbacks
            this.workerPool.onResult((result) => {
                this.handleResult(result);
            });
            this.workerPool.onFound((wallet) => {
                logger_1.logger.info('🎯 WALLET FOUND - STOPPING ALL WORKERS 🎯');
                this.stopProgressMonitoring();
                // Update wallet with final stats
                wallet.totalSeedsChecked = this.seedsChecked;
                wallet.totalTimeMs = Date.now() - this.startTime;
                // Write final summary
                this.resultHandler.writeSummary(tasks.length, this.seedsChecked, this.seedsChecked * 12, wallet.totalTimeMs, wallet);
                process.exit(0);
            });
            // Step 10: Start progress monitoring
            this.startProgressMonitoring();
            // Step 11: Submit tasks to worker pool
            logger_1.logger.info('Step 9: Starting seed checking');
            logger_1.logger.info(`Checking ${tasks.length} seeds with ${config_1.Config.WORKER_COUNT} workers`);
            this.workerPool.submitTasks(tasks);
            // Wait for completion or found wallet
            await this.workerPool.waitForCompletion();
            // Step 12: Cleanup
            this.stopProgressMonitoring();
            await this.workerPool.shutdown();
            const totalTime = Date.now() - this.startTime;
            logger_1.logger.info('=== Seed Recovery Complete ===', {
                totalTime: `${(totalTime / 1000 / 60).toFixed(2)} minutes`,
                seedsChecked: this.seedsChecked,
                found: this.workerPool.getFoundWallet() !== null
            });
            // Write final summary
            this.resultHandler.writeSummary(tasks.length, this.seedsChecked, this.seedsChecked * 12, totalTime, this.workerPool.getFoundWallet());
        }
        catch (error) {
            logger_1.logger.error('Fatal error in orchestrator', { error: String(error) });
            // Attempt cleanup
            this.stopProgressMonitoring();
            if (this.workerPool) {
                try {
                    await this.workerPool.shutdown();
                }
                catch (cleanupError) {
                    logger_1.logger.error('Error during cleanup', { error: String(cleanupError) });
                }
            }
            throw error;
        }
    }
    /**
     * Handle result from worker
     */
    handleResult(result) {
        this.seedsChecked++;
        this.metrics.recordSeedCheck(result.totalAddressesChecked, result.checkDuration);
        // Record API requests (approximate)
        for (let i = 0; i < result.totalAddressesChecked; i++) {
            this.metrics.recordApiRequest(true);
        }
        this.resultHandler.handleResult(result);
    }
    /**
     * Start progress monitoring
     */
    startProgressMonitoring() {
        this.progressInterval = setInterval(() => {
            const metrics = this.metrics.getMetrics();
            const poolStats = this.workerPool.getStatistics();
            // Get API health from worker pool
            const apiHealth = {
                'workers-active': `${poolStats.activeWorkers}/${poolStats.totalWorkers}`,
                'queue-size': poolStats.queueSize.toString()
            };
            (0, logger_1.logProgress)(this.seedsChecked, metrics.totalSeedsGenerated, metrics.totalAddressesQueried, metrics.seedsPerSecond, apiHealth, metrics.estimatedCompletionTime);
        }, 10000); // Every 10 seconds
    }
    /**
     * Stop progress monitoring
     */
    stopProgressMonitoring() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
        }
    }
}
// Main entry point
async function main() {
    const orchestrator = new SeedRecoveryOrchestrator();
    try {
        await orchestrator.run();
    }
    catch (error) {
        logger_1.logger.error('Application failed', { error: String(error) });
        process.exit(1);
    }
}
// Handle signals
process.on('SIGINT', () => {
    logger_1.logger.info('Received SIGINT, shutting down gracefully');
    process.exit(0);
});
process.on('SIGTERM', () => {
    logger_1.logger.info('Received SIGTERM, shutting down gracefully');
    process.exit(0);
});
// Run
main();
//# sourceMappingURL=main.js.map