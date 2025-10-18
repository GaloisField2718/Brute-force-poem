# Bitcoin Seed Recovery System

AI-powered Bitcoin seed phrase recovery from a poem with missing words.

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.template .env
# Edit .env and add your OpenRouter API key

# 3. Build project
npm run build

# 4. Verify setup
npm run verify

# 5. Start recovery
npm start
```

## 📖 Documentation

- **[SETUP.md](SETUP.md)** - Complete setup and configuration guide
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System architecture and design
- **[config/poem.json](config/poem.json)** - Configure your poem and constraints

## 🎯 The Poem

**In freedom of thought, I dream beyond _____'s wall,**
**Losing through loss yet learning what ____s call.**
**To sell a moment, then ______ it from time,**
**An empty heart echoes — a ______ without rhyme.**

**I've had insufficient hope of ______ to be still,**
**Once released from the current, now _____ by will.**
**The soothe becomes ____ in the rush of the night,**
**The individual drifts into the ______'s soft light.**

**From work to ____, from misleading to ______,**
**A salad becomes _____ — both fortune and fate.**
**And life, like warm soup or sweet _____ at ease,**
**Is richest when tasted uncertain — to please.**

## ⚙️ Key Configuration

In `.env`:
- `OPENROUTER_API_KEY` - Required for LLM scoring
- `TOP_K_PER_POSITION=3` - Keep at 3 for optimal search space
- `WORKER_COUNT=2` - Start with 2 to avoid API rate limits

## 🔍 How It Works

1. **Analyze poem** - Extract constraints from context
2. **Filter BIP39 words** - Find candidates matching constraints
3. **Score with LLM** - Claude ranks candidates by likelihood
4. **Beam search** - Generate most probable seed combinations
5. **Parallel checking** - Workers check addresses for balance
6. **Auto-stop on match** - Saves wallet to `results/found-wallets.json`

## 📊 Status

- Search Space: ~177,000 seeds (with 3 candidates/position)
- Expected Runtime: Hours to days depending on LLM accuracy
- When found: Stops immediately and saves results

## 🆘 Troubleshooting

```bash
# Check setup is complete
npm run verify

# Test API endpoints
npm run test:apis

# View logs
tail -f logs/app-*.log
```

For detailed help, see [SETUP.md](SETUP.md).

## 🔒 Security

⚠️ **CRITICAL**: If wallet is found:
1. Backup `results/found-wallets.json` immediately
2. Store in encrypted location
3. Never commit to version control

## 📝 License

MIT
