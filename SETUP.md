# Bitcoin Seed Recovery - Setup Guide

Complete setup instructions to get the system fully operational.

## 📋 Prerequisites

- **Node.js** v18+ and npm
- **OpenRouter API Key** (for Claude 3.5 Sonnet access)
- Poem with 11 blanks (position 12 is auto-calculated via BIP39 checksum)

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy the template and add your API key:

```bash
cp .env.template .env
```

Edit `.env` and set your OpenRouter API key:

```env
OPENROUTER_API_KEY=sk-or-v1-your-actual-key-here
```

Get your API key from: https://openrouter.ai/keys

### 3. Configure Your Poem

Edit `config/poem.json` with your poem and constraints for each blank position.

**Important**: Only define positions 1-11. Position 12 is automatically calculated by BIP39 checksum.

### 4. Build the Project

```bash
npm run build
```

### 5. Run the Recovery System

```bash
npm start
```

## ⚙️ Configuration

### Environment Variables (.env)

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENROUTER_API_KEY` | (required) | Your OpenRouter API key |
| `LOG_LEVEL` | `info` | Logging level (debug, info, warn, error) |
| `WORKER_COUNT` | `2` | Number of parallel workers (2-4 recommended) |
| `BEAM_WIDTH` | `200` | Beam search width |
| `TOP_K_PER_POSITION` | `3` | Top K candidates per position ⚠️ Keep at 3! |
| `MAX_SEEDS_TO_CHECK` | `10000` | Maximum seeds to generate |
| `API_TIMEOUT_MS` | `10000` | API request timeout |
| `API_RETRY_MAX_ATTEMPTS` | `3` | Max retry attempts per API call |
| `TARGET_BALANCE_SATS` | `100000` | Minimum balance to consider (satoshis) |

### ⚠️ Critical Settings

**TOP_K_PER_POSITION must be 3!**

- `TOP_K_PER_POSITION=3` → Search space: 3^11 = ~177,000 seeds ✅
- `TOP_K_PER_POSITION=15` → Search space: 15^11 = ~4.4 quadrillion seeds ❌

**WORKER_COUNT should be 2-4**

- Too many workers (8+) will trigger API rate limits
- Start with 2, increase to 4 if no rate limiting occurs

### Poem Configuration (config/poem.json)

Structure:
```json
{
  "poem": "Your full poem with _____ as blanks",
  "target_balance": 100000,
  "blanks": [
    {
      "position": 1,
      "context": "Line context around the blank",
      "constraints": {
        "length": 5,
        "pattern": "noun",
        "syllables": 1,
        "rhyme_with": "word",
        "semantic_domain": ["category", "theme"]
      }
    }
  ]
}
```

**Only define positions 1-11!** Position 12 is auto-calculated.

### API Endpoints (config/api-endpoints.json)

Default configuration includes 4 endpoints:
- mempool.space (priority 1)
- blockstream.info (priority 2)
- blockchain.info (priority 3)
- blockcypher.com (priority 4)

All are free public APIs with rate limits handled automatically.

## 🔍 Monitoring Progress

The system logs progress every 10 seconds:

```
2025-10-18 15:48:13 [info]: Filtering position 1
2025-10-18 15:48:13 [info]: Position 1: 3 candidates {"topWords":["drill","shell","skill"]}
2025-10-18 15:48:13 [info]: Step 5: Scoring candidates with LLM
2025-10-18 15:48:13 [info]: Running beam search
2025-10-18 15:48:13 [info]: Checking 177 seeds with 2 workers
```

### Logs Location

- Console: Real-time output
- `logs/app-YYYY-MM-DD.log`: Daily rotating logs
- `logs/error-YYYY-MM-DD.log`: Error logs only

## 🎯 When Wallet is Found

If the correct seed is found:

1. **Immediate Stop**: All workers halt
2. **Console Output**: 
   ```
   🎯 WALLET FOUND - STOPPING ALL WORKERS 🎯
   ```
3. **File Output**: `results/found-wallets.json`
   ```json
   {
     "mnemonic": "word1 word2 ... word12",
     "address": "bc1q...",
     "path": "m/84'/0'/0'/0/0",
     "type": "P2WPKH",
     "balance": 123456,
     "totalSeedsChecked": 42,
     "totalTimeMs": 15000
   }
   ```

⚠️ **CRITICAL**: Backup `results/found-wallets.json` immediately to a secure location!

## 🐛 Troubleshooting

### API Rate Limiting

**Symptoms:**
```
[warn]: No available endpoints
[warn]: Endpoint blacklisted {"endpoint":"blockstream","duration":"60s"}
[error]: All API endpoints failed
```

**Solutions:**
1. Reduce `WORKER_COUNT` to 2 (or 1)
2. Add more API endpoints to `config/api-endpoints.json`
3. Wait 60 seconds for blacklist to expire

### OpenRouter Errors

**Error:** `OPENROUTER_API_KEY is required`

**Solution:** Set valid API key in `.env`

**Error:** Rate limit from OpenRouter

**Solution:** The system processes sequentially to avoid this, but if it occurs, reduce `BEAM_WIDTH`

### No Candidates Found

**Symptoms:**
```
[info]: Position 1: 0 candidates
```

**Solutions:**
1. Relax constraints in `config/poem.json`
2. Check BIP39 wordlist compatibility (must be 5-letter words)
3. Verify syllable and rhyme constraints aren't too strict

### Build Errors

```bash
# Clean and rebuild
rm -rf dist/
npm run build
```

### Out of Memory

Reduce search space:
```env
MAX_SEEDS_TO_CHECK=1000
BEAM_WIDTH=100
```

## 📊 Performance Expectations

| Workers | APIs | Seeds/hour | Addresses/hour |
|---------|------|------------|----------------|
| 2 | 4 | ~500-1000 | ~25,000-50,000 |
| 4 | 4 | ~1000-2000 | ~50,000-100,000 |
| 8 | 4 | Rate limited ❌ | N/A |

**Typical Runtime:**
- With 3 candidates/position: ~177K seeds
- At 1000 seeds/hour: ~177 hours (~7 days)
- With good LLM scoring: Could find in first 1000 seeds (~1 hour)

## 🧪 Testing

### Test Derivation
```bash
npm run test:derivation
```

### Test BIP39 Filtering
```bash
npm run test:bip39
```

### Test API Endpoints
```bash
npm run test:apis
```

## 📁 Directory Structure

```
bitcoin-seed-recovery/
├── config/              # Configuration files
│   ├── poem.json       # Your poem and constraints
│   └── api-endpoints.json
├── src/                 # Source code
├── workers/             # Worker threads
├── logs/                # Log files (gitignored)
├── results/             # Found wallets (gitignored, SENSITIVE!)
├── dist/                # Compiled code (gitignored)
├── .env                 # Environment variables (gitignored)
├── .env.template        # Template for .env
└── package.json
```

## 🔒 Security

- ✅ `.env` is gitignored (API keys)
- ✅ `results/` is gitignored (found mnemonics)
- ✅ `logs/` is gitignored (may contain sensitive data)
- ⚠️ **NEVER commit `.env` or `results/` to version control**
- ⚠️ **Backup found wallets immediately to encrypted storage**

## 🆘 Support

If issues persist after following this guide:

1. Check logs in `logs/error-*.log`
2. Run with `LOG_LEVEL=debug` for verbose output
3. Verify API endpoints are accessible: `npm run test:apis`
4. Check API key is valid at https://openrouter.ai/keys

## ✅ Checklist Before Running

- [ ] Dependencies installed (`npm install`)
- [ ] `.env` file created with valid `OPENROUTER_API_KEY`
- [ ] `config/poem.json` configured (11 positions only!)
- [ ] Project built successfully (`npm run build`)
- [ ] `TOP_K_PER_POSITION=3` in `.env`
- [ ] `WORKER_COUNT=2` in `.env` (start conservative)
- [ ] Backup plan for `results/found-wallets.json`

## 🚦 Ready to Run

```bash
# Final check
npm run build

# Start the recovery
npm start
```

Good luck! 🍀
