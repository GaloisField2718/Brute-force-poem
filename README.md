# Bitcoin Seed Recovery from Poem

A sophisticated system for recovering Bitcoin seed phrases from an incomplete poem using linguistic analysis, BIP39 validation, and multi-API balance checking.

## 🎯 Overview

This system analyzes a poem with 12 blanks, where each blank should be filled with a BIP39 word to form a valid 12-word seed phrase. It uses:

- **LLM-based linguistic scoring** (Claude 3.5 Sonnet via OpenRouter)
- **Beam search optimization** for candidate generation
- **BIP39 checksum validation** to ensure valid mnemonics
- **Multi-path address derivation** (BIP44/49/84/86 including Taproot)
- **Multi-API balance checking** with automatic rotation and fallback
- **Parallel worker pool** for high-throughput verification

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ 
- npm or yarn
- OpenRouter API key

### Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env and add your OpenRouter API key
nano .env
```

### Configuration

Edit `config/poem.json` if needed to adjust the poem and constraints.

Edit `config/api-endpoints.json` to configure Bitcoin APIs.

### Running

```bash
# Build TypeScript
npm run build

# Start the recovery process
npm start
```

## 📁 Project Structure

```
bitcoin-seed-recovery/
├── src/
│   ├── 1-poem-analyzer/           # Linguistic analysis
│   │   └── openrouter-client.ts   # LLM scoring
│   ├── 2-seed-generator/          # Seed generation
│   │   ├── bip39-filter.ts        # BIP39 filtering
│   │   ├── beam-search.ts         # Beam search
│   │   ├── checksum-validator.ts  # BIP39 validation
│   │   └── seed-ranker.ts         # Probabilistic ranking
│   ├── 3-address-derivation/      # HD wallet derivation
│   │   ├── hd-wallet.ts           # BIP32 implementation
│   │   └── address-generator.ts   # Multi-path derivation
│   ├── 4-balance-checker/         # Balance verification
│   │   ├── api-router.ts          # Smart routing
│   │   ├── rate-limiter.ts        # Rate limiting
│   │   └── *-client.ts            # API clients
│   ├── 5-orchestration/           # System orchestration
│   │   ├── worker-pool.ts         # Parallel processing
│   │   ├── task-queue.ts          # Task management
│   │   └── result-handler.ts      # Result logging
│   ├── utils/                     # Utilities
│   │   ├── config.ts              # Configuration
│   │   ├── logger.ts              # Logging
│   │   └── metrics.ts             # Performance metrics
│   ├── types/                     # TypeScript types
│   └── main.ts                    # Main entry point
├── workers/
│   └── seed-checker-worker.ts     # Worker thread
├── config/
│   ├── poem.json                  # Poem configuration
│   └── api-endpoints.json         # API endpoints
├── logs/                          # Log files
├── results/                       # Results output
└── package.json
```

## 🔧 Technical Details

### Address Derivation

For each seed phrase, the system derives 12 addresses:

- **BIP44 (Legacy P2PKH)**: m/44'/0'/0'/0/0-2
- **BIP49 (Nested SegWit P2SH-P2WPKH)**: m/49'/0'/0'/0/0-2  
- **BIP84 (Native SegWit Bech32)**: m/84'/0'/0'/0/0-2
- **BIP86 (Taproot Bech32m)**: m/86'/0'/0'/0/0-2

### API Rotation Strategy

The system uses 4 Bitcoin APIs with intelligent rotation:

1. **Mempool.space** (Priority 1) - 10 req/s
2. **Blockstream** (Priority 2) - 5 req/s
3. **Blockchain.info** (Priority 3) - 3 req/s
4. **BlockCypher** (Priority 4) - 3 req/s

Features:
- Round-robin distribution
- Automatic blacklisting on failures
- Exponential backoff retry
- Rate limit enforcement

### Seed Generation Pipeline

1. **BIP39 Filtering**: Filter 2048 words by length, syllables, POS tags
2. **LLM Scoring**: Score candidates using Claude 3.5 Sonnet
3. **Beam Search**: Generate top-k combinations (beam width: 200)
4. **Checksum Validation**: Find valid 12th words
5. **Ranking**: Sort by cumulative probability

### Performance

- **Throughput**: 1-2 seeds/second
- **Addresses checked**: 12-24 per second
- **Workers**: Configurable (default: 8)
- **Memory**: < 2GB typical usage

## 📊 Monitoring

### Real-time Logs

```bash
# Follow combined logs
tail -f logs/combined-*.log

# Follow errors only
tail -f logs/error-*.log
```

### Progress Updates

Every 10 seconds, the system logs:
- Seeds checked / total
- Progress percentage
- Current throughput
- Estimated time remaining
- API health status

### Results

Results are saved in `results/`:
- `results-*.jsonl` - All checked seeds (hashed)
- `found-wallets-*.json` - Found wallets with full details
- `summary-*.json` - Final statistics

## ⚙️ Configuration

### Environment Variables (.env)

```bash
# Required
OPENROUTER_API_KEY=sk-or-v1-your-key-here

# Optional
LOG_LEVEL=info                   # debug|info|warn|error
WORKER_COUNT=8                   # Number of worker threads
BEAM_WIDTH=200                   # Beam search width
TOP_K_PER_POSITION=15           # Top candidates per position
MAX_SEEDS_TO_CHECK=10000        # Maximum seeds to generate
TARGET_BALANCE_SATS=100000      # Target balance in satoshis
```

### Poem Configuration (config/poem.json)

Define the poem and constraints for each blank:

```json
{
  "poem": "Your poem text with _____ blanks",
  "target_balance": 100000,
  "blanks": [
    {
      "position": 1,
      "context": "Surrounding text",
      "constraints": {
        "length": 5,
        "syllables": 1,
        "pattern": "noun",
        "semantic_domain": ["keywords"]
      }
    }
  ]
}
```

## 🔒 Security Considerations

**IMPORTANT**:

1. **Mnemonic Logging**: The system hashes mnemonics in logs (SHA256, first 8 chars)
2. **Found Wallets**: Full mnemonics are saved to `results/FOUND-*.json` - PROTECT THIS FILE!
3. **Rate Limiting**: Respects public API limits to avoid blacklisting
4. **Production Use**: Only use for legitimate recovery of lost wallets

## 🛠️ Development

### Build

```bash
npm run build
```

### Development Mode

```bash
npm run dev
```

### Testing

```bash
npm test
```

### Debugging

Set `LOG_LEVEL=debug` in `.env` for verbose logging.

## 📈 Performance Tuning

### Increase Throughput

1. **More Workers**: Increase `WORKER_COUNT` (max: CPU cores)
2. **Larger Beam**: Increase `BEAM_WIDTH` for more candidates
3. **More Candidates**: Increase `TOP_K_PER_POSITION`

### Reduce API Pressure

1. **Fewer Workers**: Decrease `WORKER_COUNT`
2. **Smaller Beam**: Decrease `BEAM_WIDTH`
3. **Limit Seeds**: Decrease `MAX_SEEDS_TO_CHECK`

### Memory Issues

1. Reduce `BEAM_WIDTH`
2. Reduce `MAX_SEEDS_TO_CHECK`
3. Process in batches

## 🚨 Troubleshooting

### "OPENROUTER_API_KEY is required"

Add your API key to `.env`:
```bash
OPENROUTER_API_KEY=sk-or-v1-...
```

### "All API endpoints failed"

- Check internet connection
- Verify APIs are not rate limiting
- Try again in a few minutes
- Check API status pages

### "Worker exited unexpectedly"

- Check available memory
- Reduce `WORKER_COUNT`
- Check logs for specific errors

### Low Throughput

- Increase `WORKER_COUNT`
- Check network latency
- Verify APIs are responding quickly

## 📝 Example Output

```
2025-10-18 12:00:00 [info]: === Bitcoin Seed Recovery System Started ===
2025-10-18 12:00:01 [info]: Configuration valid
2025-10-18 12:00:02 [info]: OpenRouter API connected
2025-10-18 12:00:03 [info]: Filtering position 1
2025-10-18 12:00:03 [info]: Position 1: 15 candidates { topWords: ['word1', 'word2', ...] }
...
2025-10-18 12:05:30 [info]: Progress Update {
  seedsChecked: 1250,
  totalSeeds: 10000,
  progress: '12.5%',
  currentThroughput: '2.1 seeds/s',
  estimatedTimeRemaining: '45m'
}
...
2025-10-18 13:23:15 [info]: 🎯 TARGET FOUND! {
  address: 'bc1q...',
  path: "m/84'/0'/0'/0/1",
  balance: 100000
}
```

## 📄 License

MIT

## ⚠️ Disclaimer

This software is for recovering legitimately owned wallets only. The authors are not responsible for misuse. Always comply with local laws and regulations.

## 🙏 Acknowledgments

- BIP39/32/44/49/84/86 specifications
- bitcoinjs-lib and related libraries
- OpenRouter and Anthropic Claude
- Public Bitcoin APIs

## 📞 Support

For issues and questions, please check:
1. This README
2. Log files in `logs/`
3. Configuration in `config/`
4. GitHub Issues (if repository exists)

---

**Built with TypeScript, Node.js, and determination.** 🚀
