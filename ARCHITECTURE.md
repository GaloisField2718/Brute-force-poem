# System Architecture

## Overview

The Bitcoin Seed Recovery system is designed as a multi-stage pipeline with parallel processing capabilities. It combines linguistic analysis, cryptographic validation, and distributed balance checking to efficiently search for the correct seed phrase.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         MAIN ORCHESTRATOR                        │
│                           (main.ts)                              │
└────────────────┬────────────────────────────────────────────────┘
                 │
    ┌────────────┼────────────┬────────────┬──────────────┐
    │            │            │            │              │
    ▼            ▼            ▼            ▼              ▼
┌────────┐  ┌────────┐  ┌────────┐  ┌─────────┐  ┌──────────┐
│ Poem   │  │ Seed   │  │Address │  │ Worker  │  │ Results  │
│Analyzer│  │Generator│  │Derivation│ │  Pool   │  │ Handler  │
└────────┘  └────────┘  └────────┘  └─────────┘  └──────────┘
     │           │           │            │              │
     │           │           │            │              │
     ▼           ▼           ▼            ▼              ▼
┌────────┐  ┌────────┐  ┌────────┐  ┌─────────┐  ┌──────────┐
│OpenRouter│ │BIP39   │  │BIP32/  │  │Workers  │  │Logs &   │
│  API    │  │Checksum│  │44/49/84│  │(threads)│  │Results  │
└────────┘  └────────┘  │  /86   │  └─────────┘  └──────────┘
                        └────────┘       │
                                         ▼
                                    ┌─────────┐
                                    │API      │
                                    │Router   │
                                    └─────────┘
                                         │
                        ┌────────────────┼────────────────┐
                        ▼                ▼                ▼
                   ┌─────────┐     ┌─────────┐     ┌─────────┐
                   │Mempool  │     │Blockstream│    │Blockchain│
                   │.space   │     │.info    │     │.info    │
                   └─────────┘     └─────────┘     └─────────┘
```

## Component Details

### 1. Main Orchestrator (`src/main.ts`)

**Responsibilities:**
- System initialization and configuration
- Pipeline coordination
- Progress monitoring
- Result aggregation
- Graceful shutdown

**Flow:**
1. Load and validate configurations
2. Test API connectivity
3. Initialize all subsystems
4. Execute pipeline stages
5. Monitor progress
6. Handle results
7. Cleanup and report

### 2. Poem Analyzer (`src/1-poem-analyzer/`)

**Components:**
- `openrouter-client.ts`: LLM integration for semantic scoring

**Process:**
1. Parse poem structure
2. Extract constraints from context
3. Query LLM for word fitness scores
4. Return ranked candidates per position

**Output:**
- Map<position, ScoredCandidate[]>

### 3. Seed Generator (`src/2-seed-generator/`)

**Components:**
- `bip39-filter.ts`: BIP39 wordlist filtering
- `beam-search.ts`: Combinatorial optimization
- `checksum-validator.ts`: BIP39 validation
- `seed-ranker.ts`: Probabilistic ranking

**Process:**
1. **Filtering Phase**:
   - Load BIP39 wordlist (2048 words)
   - Filter by length (±1 tolerance)
   - Filter by syllable count
   - Filter by rhyme patterns
   - Result: Top-K candidates per position

2. **Scoring Phase**:
   - Send filtered candidates to LLM
   - Get semantic fitness scores
   - Combine with structural scores
   - Result: Scored candidates

3. **Beam Search Phase**:
   - Initialize beam with empty state
   - For positions 1-11:
     - Expand beam with candidates
     - Score each expansion
     - Keep top-N (beam width) states
   - Result: Top seed prefixes (11 words)

4. **Validation Phase**:
   - For each 11-word prefix:
     - Test all 2048 possible last words
     - Check BIP39 checksum validity
     - Keep only valid mnemonics
   - Result: Valid 12-word seed phrases

5. **Ranking Phase**:
   - Calculate probability scores
   - Sort by likelihood
   - Result: Prioritized task queue

**Output:**
- List of SeedCheckTask ordered by probability

### 4. Address Derivation (`src/3-address-derivation/`)

**Components:**
- `hd-wallet.ts`: HD wallet implementation
- `address-generator.ts`: Multi-path derivation

**Derivation Paths:**

```
BIP32 Root
    │
    ├── m/44'/0'/0'/0/* (Legacy P2PKH)
    │   ├── /0 → 1...
    │   ├── /1 → 1...
    │   └── /2 → 1...
    │
    ├── m/49'/0'/0'/0/* (Nested SegWit P2SH-P2WPKH)
    │   ├── /0 → 3...
    │   ├── /1 → 3...
    │   └── /2 → 3...
    │
    ├── m/84'/0'/0'/0/* (Native SegWit Bech32)
    │   ├── /0 → bc1q...
    │   ├── /1 → bc1q...
    │   └── /2 → bc1q...
    │
    └── m/86'/0'/0'/0/* (Taproot Bech32m)
        ├── /0 → bc1p...
        ├── /1 → bc1p...
        └── /2 → bc1p...
```

**Process:**
1. Parse mnemonic to seed
2. Derive master key
3. For each standard (BIP44/49/84/86):
   - Derive account key
   - Derive addresses at indices 0, 1, 2
4. Return 12 addresses total

**Output:**
- Array<DerivedAddress> (12 addresses per seed)

### 5. Balance Checker (`src/4-balance-checker/`)

**Components:**
- `api-router.ts`: Intelligent routing and failover
- `rate-limiter.ts`: Rate limit enforcement
- `*-client.ts`: API-specific implementations

**API Strategy:**

```
Request arrives
    │
    ▼
┌─────────────────┐
│ Check cache     │ ──Yes──> Return cached
└─────────────────┘
    │ No
    ▼
┌─────────────────┐
│ Get next API    │ (Round-robin)
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ Check rate limit│
└─────────────────┘
    │ OK
    ▼
┌─────────────────┐
│ Execute request │
└─────────────────┘
    │
    ├── Success ──> Cache & Return
    │
    └── Failure ──> Retry with backoff
                    │
                    └── Max retries ──> Try next API
```

**Features:**
- Round-robin load distribution
- Automatic blacklisting (3 failures)
- Exponential backoff (1s, 2s, 5s)
- Response caching (5 min TTL)
- Concurrent request limiting

**Output:**
- Balance in satoshis per address

### 6. Worker Pool (`src/5-orchestration/`)

**Components:**
- `worker-pool.ts`: Thread pool management
- `task-queue.ts`: Task distribution
- `result-handler.ts`: Result aggregation
- `workers/seed-checker-worker.ts`: Worker implementation

**Architecture:**

```
Main Thread                     Worker Threads
    │                                │
    ├── Task Queue ────────────>  Worker 1
    │       │                       Worker 2
    │       │                       Worker 3
    │       └───────────────────>   ...
    │                               Worker N
    │                                │
    │                                │
    │ <──────── Results ─────────────┘
    │
    └── Result Handler
```

**Process:**
1. Main thread generates tasks
2. Tasks distributed to workers
3. Each worker:
   - Derives 12 addresses
   - Checks each balance
   - Reports result
   - If found: signals shutdown
4. Results aggregated in main thread

**Features:**
- Configurable worker count (default: 8)
- Automatic task distribution
- Progress tracking
- Graceful shutdown on found wallet
- Error recovery and retry

### 7. Utilities (`src/utils/`)

**Components:**
- `config.ts`: Configuration management
- `logger.ts`: Winston logging with rotation
- `metrics.ts`: Performance tracking

**Metrics Collected:**
- Seeds per second
- Addresses per second
- API requests per second
- Average check duration
- CPU/memory usage
- API health status
- Progress percentage
- ETA calculation

## Data Flow

### Typical Execution Flow

```
1. Start
   │
2. Load Config
   │
3. Test APIs
   │
4. Filter BIP39 Words
   │   [2048] → [~200 per position]
   │
5. Score with LLM
   │   [~200 per position] → [15 per position]
   │
6. Beam Search
   │   [15^11 space] → [10,000 candidates]
   │
7. Validate Checksum
   │   [10,000 × 2048] → [~10,000 valid seeds]
   │
8. Rank Seeds
   │   → [Ordered by probability]
   │
9. Distribute to Workers
   │
10. Check Balances
    │   [10,000 seeds × 12 addresses] → [120,000 checks]
    │
11. Found or Complete
    │
12. Report & Exit
```

## Performance Characteristics

### Bottlenecks

1. **LLM Scoring** (Slowest)
   - 12 API calls
   - ~5-10 seconds each
   - Total: ~60-120 seconds
   - **Mitigation**: Cache results, batch requests

2. **Balance Checking** (Main bottleneck)
   - 120,000 API calls for 10,000 seeds
   - Rate limited: ~20 req/s
   - Total: ~6,000 seconds (~1.7 hours)
   - **Mitigation**: Multi-API rotation, parallel workers

3. **Checksum Validation** (Fast)
   - CPU bound
   - ~1ms per validation
   - Total: ~20 seconds for 10,000 candidates
   - **Mitigation**: Parallelization

### Scalability

**Vertical Scaling:**
- Increase WORKER_COUNT (up to CPU cores)
- Increase BEAM_WIDTH (more memory)
- More RAM = larger caches

**Horizontal Scaling:**
- Split seed space across machines
- Shared results database
- Coordinate via message queue

## Security Considerations

### Data Protection

1. **Sensitive Data:**
   - Mnemonics: Hashed in logs (SHA256, 8 chars)
   - Found wallets: Saved to protected files
   - API keys: Environment variables only

2. **Access Control:**
   - File permissions: 600 for .env
   - Results directory: 700
   - No external network access except APIs

3. **Rate Limiting:**
   - Respects public API limits
   - Automatic backoff on errors
   - No aggressive polling

### Audit Trail

All operations logged:
- Timestamp
- Operation type
- Success/failure
- Duration
- Error details

## Error Handling

### Strategies

1. **Retry with Backoff:**
   - Network errors
   - API timeouts
   - Rate limits

2. **Failover:**
   - Primary API fails → Secondary
   - Worker crashes → Restart
   - Invalid seed → Skip

3. **Graceful Degradation:**
   - Some APIs down → Use available
   - Worker dies → Continue with others
   - OOM → Reduce batch size

### Recovery

- Checkpointing: Every 1000 seeds
- Resume capability: From last checkpoint
- Duplicate detection: Seed hash tracking

## Future Enhancements

1. **Performance:**
   - GPU acceleration for address derivation
   - Distributed processing across machines
   - Better LLM caching strategies

2. **Features:**
   - Web UI for monitoring
   - Real-time progress dashboard
   - Email notifications on completion

3. **Optimization:**
   - Machine learning for better word scoring
   - Dynamic beam width adjustment
   - Adaptive API selection based on latency

---

**Version:** 1.0  
**Last Updated:** 2025-10-18
