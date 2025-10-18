# Testing Guide

## Overview

The Bitcoin Seed Recovery system includes comprehensive tests to verify functionality before running the full recovery process.

## Available Tests

### 1. BIP39 Filtering and Validation Test

Tests the BIP39 word filtering and checksum validation.

```bash
npm run test:bip39
```

**What it tests:**
- BIP39 wordlist loading (2048 words)
- Word filtering by constraints (length, syllables, rhyme)
- Mnemonic validation
- Checksum calculation and validation
- Finding valid 12th words for 11-word prefixes

**Expected output:**
```
✅ Wordlist loaded
✅ Filtering works
✅ Validation works
✅ Correct last word found
```

### 2. Address Derivation Test

Tests all 4 BIP standards for address derivation.

```bash
npm run test:derivation
```

**What it tests:**
- BIP44 (Legacy P2PKH) addresses
- BIP49 (Nested SegWit) addresses
- BIP84 (Native SegWit) addresses
- BIP86 (Taproot) addresses
- Correct path derivation
- All 12 addresses per seed

**Expected output:**
```
✅ All derivation tests passed!
```

**Verification:**
The test uses the standard BIP39 test mnemonic. You can verify the addresses at:
- https://iancoleman.io/bip39/

### 3. Bitcoin API Connectivity Test

Tests all 4 Bitcoin APIs for connectivity and response times.

```bash
npm run test:apis
```

**What it tests:**
- Mempool.space API
- Blockstream API
- Blockchain.info API
- BlockCypher API
- Response times
- Balance parsing
- Error handling

**Expected output:**
```
✅ Mempool.space: OK (238ms)
✅ Blockstream: OK (268ms)
✅ Blockchain.info: OK (327ms)
✅ BlockCypher: OK (116ms)
```

**Note:** All APIs should return the same balance for the test address.

## Pre-Deployment Checklist

Before running the full recovery:

### 1. Configuration Check

```bash
# Check .env exists and has API key
cat .env | grep OPENROUTER_API_KEY

# Check poem config
cat config/poem.json | jq '.blanks | length'

# Check API config
cat config/api-endpoints.json | jq '.endpoints | length'
```

### 2. Build Check

```bash
# Clean build
rm -rf dist/
npm run build

# Verify build
ls -la dist/
ls -la dist/workers/
```

### 3. Dependency Check

```bash
# Verify all dependencies installed
npm ls --depth=0

# Check for vulnerabilities
npm audit
```

### 4. Run All Tests

```bash
# Run all tests in sequence
npm run test:bip39 && \
npm run test:derivation && \
npm run test:apis

echo "All tests passed!"
```

### 5. Dry Run

Test with very limited parameters to verify the full pipeline:

```bash
# Edit .env
MAX_SEEDS_TO_CHECK=10
BEAM_WIDTH=5
TOP_K_PER_POSITION=5

# Run
npm start
```

This should complete quickly and verify:
- Config loading
- OpenRouter connection
- Seed generation
- Worker pool initialization
- Balance checking
- Logging

## Manual Testing

### Test Seed Generation Only

Create a test script:

```typescript
// test-seed-gen.ts
import { BIP39Filter } from './src/2-seed-generator/bip39-filter';
import { Config } from './src/utils/config';

const poemConfig = Config.loadPoemConfig();
const blank = poemConfig.blanks[0];

const filtered = BIP39Filter.filterWords(blank, 1);
console.log('Filtered words:', filtered.length);
console.log('Top 10:', filtered.slice(0, 10).map(f => f.word));
```

Run:
```bash
ts-node test-seed-gen.ts
```

### Test Address Derivation Only

```typescript
// test-derive.ts
import { AddressGenerator } from './src/3-address-derivation/address-generator';

const testSeed = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const addresses = AddressGenerator.deriveAllAddresses(testSeed);

console.log('Generated addresses:', addresses.length);
addresses.forEach(a => console.log(a.type, a.address));
```

Run:
```bash
ts-node test-derive.ts
```

### Test API Router Only

```typescript
// test-api.ts
import { ApiRouter } from './src/4-balance-checker/api-router';
import { Config } from './src/utils/config';

const apiConfig = Config.loadApiConfig();
const router = new ApiRouter(apiConfig.endpoints);

const testAddress = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';

router.checkBalance(testAddress).then(balance => {
  console.log('Balance:', balance, 'satoshis');
  process.exit(0);
});
```

Run:
```bash
ts-node test-api.ts
```

## Performance Testing

### Benchmark Address Derivation

```bash
time node -e "
const { AddressGenerator } = require('./dist/3-address-derivation/address-generator');
const testSeed = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
for (let i = 0; i < 100; i++) {
  AddressGenerator.deriveAllAddresses(testSeed);
}
console.log('Derived 1200 addresses');
"
```

Expected: < 10 seconds for 1200 addresses

### Benchmark Balance Checking

```bash
time npm run test:apis
```

Expected: < 5 seconds for 4 APIs

## Troubleshooting Tests

### Test Fails: "Module not found"

```bash
# Rebuild
npm run build

# Check imports
grep -r "from '\.\." src/
```

### Test Fails: "API timeout"

```bash
# Increase timeout in test script
# Or check internet connection
curl -I https://mempool.space
```

### Test Fails: "Invalid mnemonic"

```bash
# Check BIP39 library
node -e "console.log(require('bip39').wordlists.english.length)"
# Should print: 2048
```

### Test Fails: "ECC library not initialized"

```bash
# Check secp256k1 installation
npm ls @bitcoinerlab/secp256k1
npm ls tiny-secp256k1

# Reinstall if needed
npm install --force
```

## Continuous Testing

### Watch Mode

For development, use watch mode:

```bash
# Install nodemon if needed
npm install -g nodemon

# Watch and rerun on changes
nodemon --exec "npm run test:bip39" --watch src/
```

### Pre-Commit Hook

Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash
echo "Running tests before commit..."
npm run test:bip39 && npm run test:derivation
if [ $? -ne 0 ]; then
    echo "Tests failed. Commit aborted."
    exit 1
fi
```

Make executable:
```bash
chmod +x .git/hooks/pre-commit
```

## Test Coverage

Current test coverage:

| Module | Coverage | Tests |
|--------|----------|-------|
| BIP39 Filtering | ✅ High | test:bip39 |
| Checksum Validation | ✅ High | test:bip39 |
| Address Derivation | ✅ Complete | test:derivation |
| API Clients | ✅ Integration | test:apis |
| Worker Pool | ⚠️ Manual | - |
| Orchestrator | ⚠️ Manual | - |

## Future Test Additions

1. **Unit Tests:**
   - Jest test suite for each module
   - Mock external dependencies
   - Test edge cases

2. **Integration Tests:**
   - Full pipeline with small dataset
   - Mock OpenRouter responses
   - Verify result format

3. **Load Tests:**
   - Stress test API router
   - Test worker pool under load
   - Memory leak detection

4. **E2E Tests:**
   - Complete run with known seed
   - Verify correct wallet found
   - Test recovery from crash

## Success Criteria

Before deploying to production:

- ✅ All 3 tests pass
- ✅ Build completes without errors
- ✅ No TypeScript errors
- ✅ All APIs responding
- ✅ Dry run completes successfully
- ✅ Logs are readable and informative
- ✅ Results directory created
- ✅ Worker threads start and stop correctly

---

**Remember:** Testing with real money at stake requires extreme caution. Always verify with small datasets first.
