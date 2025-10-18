/**
 * Main orchestration for Bitcoin Seed Recovery
 */

import { Config } from './utils/config';
import { logger, logProgress } from './utils/logger';
import { MetricsCollector } from './utils/metrics';
import { BIP39Filter } from './2-seed-generator/bip39-filter';
import { OpenRouterClient } from './1-poem-analyzer/openrouter-client';
import { BeamSearch } from './2-seed-generator/beam-search';
import { SeedRanker } from './2-seed-generator/seed-ranker';
import { WorkerPool } from './5-orchestration/worker-pool';
import { ResultHandler } from './5-orchestration/result-handler';
import { SeedCheckResult } from './types';

class SeedRecoveryOrchestrator {
  private metrics!: MetricsCollector;
  private workerPool!: WorkerPool;
  private resultHandler!: ResultHandler;
  private progressInterval?: NodeJS.Timeout;
  private startTime: number = 0;
  private seedsChecked: number = 0;

  async run(): Promise<void> {
    try {
      logger.info('=== Bitcoin Seed Recovery System Started ===');
      this.startTime = Date.now();

      // Step 1: Validate configuration
      logger.info('Step 1: Validating configuration');
      Config.validate();
      logger.info('Configuration valid');

      // Step 2: Load poem and API configs
      logger.info('Step 2: Loading configurations');
      const poemConfig = Config.loadPoemConfig();
      const apiConfig = Config.loadApiConfig();
      logger.info('Configurations loaded', {
        blanks: poemConfig.blanks.length,
        apis: apiConfig.endpoints.length
      });

      // Step 3: Test OpenRouter connection
      logger.info('Step 3: Testing OpenRouter API');
      const openRouter = new OpenRouterClient();
      const connected = await openRouter.testConnection();
      if (!connected) {
        logger.warn('OpenRouter connection test failed, continuing anyway');
      } else {
        logger.info('OpenRouter API connected');
      }

      // Step 4: Filter BIP39 words for each position
      logger.info('Step 4: Filtering BIP39 words by constraints');
      const candidatesPerPosition = new Map<number, string[]>();
      
      for (const blank of poemConfig.blanks) {
        logger.info(`Filtering position ${blank.position}`);
        const filtered = BIP39Filter.filterWords(blank, 1);
        const topWords = BIP39Filter.getTopK(filtered, Config.TOP_K_PER_POSITION);
        candidatesPerPosition.set(blank.position, topWords);
        
        logger.info(`Position ${blank.position}: ${topWords.length} candidates`, {
          topWords: topWords.slice(0, 5)
        });
      }

      // Step 5: Score candidates with OpenRouter
      logger.info('Step 5: Scoring candidates with LLM');
      const scoredCandidates = await openRouter.scoreMultiplePositions(
        poemConfig.blanks,
        candidatesPerPosition
      );

      // Update candidates with scored words (top 15 from LLM)
      for (const [position, scored] of scoredCandidates.entries()) {
        const topScored = scored.slice(0, 15).map(s => s.word);
        candidatesPerPosition.set(position, topScored);
        
        logger.info(`Position ${position}: LLM scored`, {
          topWords: topScored.slice(0, 5),
          topScore: scored[0]?.score.toFixed(3)
        });
      }

      // Step 6: Run beam search
      logger.info('Step 6: Running beam search');
      const beamSearch = new BeamSearch(Config.BEAM_WIDTH);
      beamSearch.setWordScores(scoredCandidates);
      
      const searchSpaceSize = beamSearch.getSearchSpaceSize(candidatesPerPosition);
      logger.info('Search space calculated', {
        approximateSize: searchSpaceSize.toExponential(2),
        beamWidth: Config.BEAM_WIDTH,
        maxSeeds: Config.MAX_SEEDS_TO_CHECK
      });

      const candidateSeeds = beamSearch.search(
        candidatesPerPosition,
        Config.MAX_SEEDS_TO_CHECK
      );

      logger.info('Beam search complete', {
        generatedSeeds: candidateSeeds.length
      });

      // Step 7: Rank seeds
      logger.info('Step 7: Ranking seeds');
      const wordScoresMap = new Map<number, Map<string, number>>();
      for (const [position, scored] of scoredCandidates.entries()) {
        const scoreMap = new Map<string, number>();
        scored.forEach(s => scoreMap.set(s.word, s.score));
        wordScoresMap.set(position, scoreMap);
      }

      const rankedSeeds = SeedRanker.rankSeeds(candidateSeeds, wordScoresMap);
      const tasks = SeedRanker.toTasks(rankedSeeds);
      
      logger.info('Seeds ranked', {
        totalTasks: tasks.length,
        topProbability: tasks[0]?.probability.toFixed(4)
      });

      // Step 8: Initialize worker pool
      logger.info('Step 8: Initializing worker pool');
      this.workerPool = new WorkerPool(Config.WORKER_COUNT);
      await this.workerPool.initialize();

      // Step 9: Initialize metrics and result handler
      this.metrics = new MetricsCollector(tasks.length);
      this.resultHandler = new ResultHandler();

      // Set up callbacks
      this.workerPool.onResult((result: SeedCheckResult) => {
        this.handleResult(result);
      });

      this.workerPool.onFound((wallet) => {
        logger.info('🎯 WALLET FOUND - STOPPING ALL WORKERS 🎯');
        this.stopProgressMonitoring();
        
        // Update wallet with final stats
        wallet.totalSeedsChecked = this.seedsChecked;
        wallet.totalTimeMs = Date.now() - this.startTime;
        
        // Write final summary
        this.resultHandler.writeSummary(
          tasks.length,
          this.seedsChecked,
          this.seedsChecked * 12,
          wallet.totalTimeMs,
          wallet
        );

        process.exit(0);
      });

      // Step 10: Start progress monitoring
      this.startProgressMonitoring();

      // Step 11: Submit tasks to worker pool
      logger.info('Step 9: Starting seed checking');
      logger.info(`Checking ${tasks.length} seeds with ${Config.WORKER_COUNT} workers`);
      
      this.workerPool.submitTasks(tasks);

      // Wait for completion or found wallet
      await this.workerPool.waitForCompletion();

      // Step 12: Cleanup
      this.stopProgressMonitoring();
      await this.workerPool.shutdown();

      const totalTime = Date.now() - this.startTime;
      logger.info('=== Seed Recovery Complete ===', {
        totalTime: `${(totalTime / 1000 / 60).toFixed(2)} minutes`,
        seedsChecked: this.seedsChecked,
        found: this.workerPool.getFoundWallet() !== null
      });

      // Write final summary
      this.resultHandler.writeSummary(
        tasks.length,
        this.seedsChecked,
        this.seedsChecked * 12,
        totalTime,
        this.workerPool.getFoundWallet()
      );

    } catch (error) {
      logger.error('Fatal error in orchestrator', { error: String(error) });
      throw error;
    }
  }

  /**
   * Handle result from worker
   */
  private handleResult(result: SeedCheckResult): void {
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
  private startProgressMonitoring(): void {
    this.progressInterval = setInterval(() => {
      const metrics = this.metrics.getMetrics();
      const poolStats = this.workerPool.getStatistics();
      
      // Get API health from worker pool
      const apiHealth = {
        'workers-active': `${poolStats.activeWorkers}/${poolStats.totalWorkers}`,
        'queue-size': poolStats.queueSize.toString()
      };

      logProgress(
        this.seedsChecked,
        metrics.totalSeedsGenerated,
        metrics.totalAddressesQueried,
        metrics.seedsPerSecond,
        apiHealth,
        metrics.estimatedCompletionTime
      );
    }, 10000); // Every 10 seconds
  }

  /**
   * Stop progress monitoring
   */
  private stopProgressMonitoring(): void {
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
  } catch (error) {
    logger.error('Application failed', { error: String(error) });
    process.exit(1);
  }
}

// Handle signals
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

// Run
main();
