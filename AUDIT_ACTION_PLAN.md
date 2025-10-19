# AUDIT ACTION PLAN
## Bitcoin Seed Recovery System - Implementation Roadmap

**Date:** October 19, 2025  
**Status:** Ready for Implementation  
**Priority:** CRITICAL

---

## IMMEDIATE ACTIONS (THIS WEEK)

### 🔴 Critical Issue #1: Mnemonic Encryption
**Impact:** Security vulnerability - plaintext storage of private keys  
**File:** `src/5-orchestration/result-handler.ts`  
**Time:** 8 hours

**Implementation:**
```typescript
// 1. Install crypto dependencies
npm install --save argon2

// 2. Create SecureStorage class
// src/utils/secure-storage.ts
import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import * as argon2 from 'argon2';

export class SecureStorage {
  static async encryptMnemonic(
    mnemonic: string,
    password: string
  ): Promise<{encrypted: string; salt: string; iv: string; tag: string}> {
    const salt = randomBytes(32);
    const key = await argon2.hash(password, {
      salt,
      hashLength: 32,
      type: argon2.argon2id
    });
    
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
    
    let encrypted = cipher.update(mnemonic, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      encrypted,
      salt: salt.toString('hex'),
      iv: iv.toString('hex'),
      tag: cipher.getAuthTag().toString('hex')
    };
  }
}

// 3. Update result-handler.ts
private async saveFoundWallet(wallet: FoundWallet): Promise<void> {
  const password = await this.promptForPassword();
  const encrypted = await SecureStorage.encryptMnemonic(wallet.mnemonic, password);
  
  const safeWallet = {
    ...wallet,
    mnemonic: '[ENCRYPTED]',
    encrypted
  };
  
  fs.writeFileSync(this.foundWalletsFile, JSON.stringify(safeWallet, null, 2), {
    mode: 0o600  // Owner read/write only
  });
}
```

**Validation:**
- [ ] Test encryption/decryption cycle
- [ ] Verify file permissions are 600
- [ ] Test password recovery flow
- [ ] Document encryption process in README

---

### 🔴 Critical Issue #2: Fix Worker Path Bug
**Impact:** Runtime failure when starting workers  
**File:** `src/5-orchestration/worker-pool.ts:23`  
**Time:** 15 minutes

**Fix:**
```typescript
// BEFORE (line 23)
private workerScript: string = path.join(__dirname, '../workers/workers/seed-checker-worker.js')

// AFTER
private workerScript: string = path.join(__dirname, '../../dist/workers/seed-checker-worker.js')
```

**Validation:**
- [ ] Run `npm run build`
- [ ] Start application
- [ ] Verify workers initialize without errors
- [ ] Check worker logs

---

### 🔴 Critical Issue #3: Input Validation
**Impact:** Application crashes on invalid input  
**Files:** Multiple  
**Time:** 6 hours

**Implementation:**
```typescript
// 1. Install validation library
npm install --save joi
npm install --save-dev @types/joi

// 2. Create validator
// src/utils/validators.ts
import Joi from 'joi';

export class InputValidators {
  static readonly mnemonicSchema = Joi.string()
    .trim()
    .pattern(/^(\w+\s){11}\w+$/)
    .custom((value, helpers) => {
      const words = value.split(' ');
      if (words.length !== 12) {
        return helpers.error('mnemonic.length');
      }
      // Additional BIP39 validation
      return value;
    })
    .messages({
      'mnemonic.length': 'Mnemonic must be exactly 12 words'
    });
  
  static readonly positionSchema = Joi.number()
    .integer()
    .min(1)
    .max(12)
    .required();
  
  static readonly topKSchema = Joi.number()
    .integer()
    .min(1)
    .max(100)
    .required();
  
  static validateMnemonic(mnemonic: string): void {
    const { error } = this.mnemonicSchema.validate(mnemonic);
    if (error) {
      throw new ValidationError(`Invalid mnemonic: ${error.message}`);
    }
    
    if (!bip39.validateMnemonic(mnemonic)) {
      throw new ValidationError('Mnemonic checksum validation failed');
    }
  }
}

// 3. Apply validation in critical paths
// src/main.ts:74
const { error } = InputValidators.positionSchema.validate(blank.position);
if (error) {
  throw new ValidationError(`Invalid position: ${error.message}`);
}
```

**Apply to:**
- [ ] Poem configuration loading
- [ ] Mnemonic validation
- [ ] API endpoint inputs
- [ ] Worker task inputs

---

## THIS MONTH (WEEKS 1-4)

### Week 1: Testing Infrastructure
**Time:** 20 hours

```bash
# Install testing dependencies
npm install --save-dev jest @types/jest ts-jest @types/node

# Configure Jest
npx ts-jest config:init

# Create test structure
mkdir -p tests/{unit,integration,e2e}
```

**Priority Tests:**
1. **Unit Tests** (12 hours)
   - `checksum-validator.test.ts`
   - `hd-wallet.test.ts`
   - `bip39-filter.test.ts`
   - `beam-search.test.ts`

2. **Integration Tests** (8 hours)
   - `api-router.test.ts`
   - `worker-pool.test.ts`

**Target:** 60% coverage minimum

---

### Week 2: CI/CD Pipeline
**Time:** 12 hours

```yaml
# .github/workflows/ci.yml
name: CI Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Type check
        run: npx tsc --noEmit
      
      - name: Lint
        run: npx eslint src --ext .ts
      
      - name: Test
        run: npm test -- --coverage
      
      - name: Security audit
        run: npm audit --audit-level=moderate
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Snyk scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

**Setup:**
- [ ] Create GitHub Actions workflow
- [ ] Configure Codecov
- [ ] Set up Snyk for dependency scanning
- [ ] Add status badges to README

---

### Week 3: Documentation & Code Quality
**Time:** 16 hours

**Tasks:**
1. **API Documentation** (6 hours)
```bash
npm install --save-dev typedoc
npx typedoc --out docs src
```

2. **Add TSDoc Comments** (8 hours)
   - Document all public methods
   - Add usage examples
   - Document error cases

3. **Linting Setup** (2 hours)
```bash
npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

```json
// .eslintrc.json
{
  "parser": "@typescript-eslint/parser",
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "rules": {
    "@typescript-eslint/explicit-function-return-type": "error",
    "@typescript-eslint/no-explicit-any": "error",
    "no-console": "warn"
  }
}
```

---

### Week 4: Dependency Updates & Security
**Time:** 8 hours

```bash
# Update all dependencies
npm update

# Specific critical updates
npm install axios@^1.7.4
npm install typescript@^5.3.3

# Security audit
npm audit fix --force

# Add dependency checking to package.json
"scripts": {
  "audit": "npm audit --audit-level=moderate",
  "outdated": "npm outdated",
  "check-licenses": "npx license-checker --onlyAllow 'MIT;ISC;Apache-2.0;BSD'"
}
```

**Validation:**
- [ ] All tests pass with updated dependencies
- [ ] No security vulnerabilities (moderate or higher)
- [ ] License compliance verified

---

## NEXT MONTH (WEEKS 5-8)

### Monitoring & Observability (16 hours)
```typescript
// Install Prometheus client
npm install prom-client

// src/utils/prometheus.ts
import * as client from 'prom-client';

export class Metrics {
  private static register = new client.Registry();
  
  static seedsChecked = new client.Counter({
    name: 'seeds_checked_total',
    help: 'Total seeds checked',
    registers: [this.register]
  });
  
  static apiLatency = new client.Histogram({
    name: 'api_request_duration_seconds',
    help: 'API request latency',
    labelNames: ['endpoint', 'status'],
    registers: [this.register]
  });
  
  static activeWorkers = new client.Gauge({
    name: 'active_workers',
    help: 'Number of active workers',
    registers: [this.register]
  });
}

// Expose metrics endpoint
import * as http from 'http';

http.createServer(async (req, res) => {
  if (req.url === '/metrics') {
    res.setHeader('Content-Type', Metrics.register.contentType);
    res.end(await Metrics.register.metrics());
  }
}).listen(9090);
```

### Performance Optimization (12 hours)
1. Implement LRU cache for API responses
2. Optimize beam search memory usage
3. Add connection pooling for Bitcoin RPC
4. Implement batch API requests

### Code Refactoring (16 hours)
1. Extract common address derivation logic
2. Consolidate error handling patterns
3. Reduce code duplication in API clients
4. Simplify configuration management

---

## SUCCESS METRICS

### Before Improvements
- ❌ Security: C (65/100)
- ❌ Test Coverage: 0%
- ❌ CI/CD: None
- ❌ Documentation: Partial
- ⚠️ Critical Bugs: 2

### After Improvements (Target)
- ✅ Security: A- (90/100)
- ✅ Test Coverage: >80%
- ✅ CI/CD: Fully automated
- ✅ Documentation: Complete
- ✅ Critical Bugs: 0

---

## RESOURCE REQUIREMENTS

| Phase | Developer Hours | Timeline | Cost Estimate |
|-------|-----------------|----------|---------------|
| Critical Fixes | 20 hours | Week 1 | $2,000 |
| Testing | 30 hours | Weeks 2-3 | $3,000 |
| CI/CD & Docs | 20 hours | Week 4 | $2,000 |
| Monitoring | 16 hours | Week 5 | $1,600 |
| Optimization | 28 hours | Weeks 6-7 | $2,800 |
| **TOTAL** | **114 hours** | **7 weeks** | **$11,400** |

*Based on $100/hour senior developer rate*

---

## RISK MITIGATION

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking changes from updates | Medium | High | Comprehensive test suite first |
| Performance degradation | Low | Medium | Load testing before deployment |
| Encryption implementation bugs | Medium | Critical | Third-party security audit |
| CI/CD pipeline failures | Low | Low | Gradual rollout with monitoring |

---

## APPROVAL CHECKLIST

### Phase 1: Critical Security (Week 1)
- [ ] Mnemonic encryption implemented and tested
- [ ] Worker path bug fixed
- [ ] Input validation added
- [ ] Security review completed
- [ ] Documentation updated

### Phase 2: Quality Assurance (Weeks 2-4)
- [ ] Unit tests written (>60% coverage)
- [ ] Integration tests written
- [ ] CI/CD pipeline operational
- [ ] All dependencies updated
- [ ] No high/critical vulnerabilities

### Phase 3: Production Readiness (Weeks 5-8)
- [ ] Monitoring/alerting configured
- [ ] API documentation generated
- [ ] Performance benchmarks met
- [ ] Load testing completed
- [ ] Runbook documented

---

## DEPLOYMENT STRATEGY

### Rollout Plan
1. **Development Environment** (Week 1)
   - Deploy all critical fixes
   - Test thoroughly

2. **Staging Environment** (Week 2)
   - Deploy with monitoring
   - Run integration tests
   - Performance testing

3. **Production Deployment** (Week 3)
   - Blue-green deployment
   - Monitor for 48 hours
   - Gradual traffic increase

### Rollback Plan
- [ ] Document rollback procedure
- [ ] Keep previous version deployable
- [ ] Test rollback in staging
- [ ] Monitor rollback triggers

---

## CONTACT & SUPPORT

**Technical Lead:** [Your Name]  
**Security Reviewer:** [Security Team]  
**DevOps:** [DevOps Team]

**Escalation Path:**
1. Developer → Tech Lead
2. Tech Lead → Engineering Manager
3. Engineering Manager → CTO

---

## APPENDIX: QUICK WIN CHECKLIST

These can be done immediately without dependencies:

- [ ] Fix worker path bug (15 min)
- [ ] Update axios to 1.7.4 (5 min)
- [ ] Add .gitignore for results/ directory (2 min)
- [ ] Set file permissions to 600 for config files (5 min)
- [ ] Add security.txt file (10 min)
- [ ] Configure ESLint (30 min)
- [ ] Add pre-commit hooks (20 min)
- [ ] Create .env.example file (10 min)

**Total Quick Wins:** ~1.5 hours for immediate improvement

---

**Next Review Date:** [2 weeks from start]  
**Success Criteria:** All Critical issues resolved, 60%+ test coverage, CI/CD operational

---

*This action plan should be reviewed weekly and adjusted based on progress and newly discovered issues.*
