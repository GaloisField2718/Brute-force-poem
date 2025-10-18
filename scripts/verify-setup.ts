#!/usr/bin/env ts-node
/**
 * Verify that the setup is complete and ready to run
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
  critical: boolean;
}

const checks: CheckResult[] = [];

function check(name: string, passed: boolean, message: string, critical = false): void {
  checks.push({ name, passed, message, critical });
}

// Check 1: Node modules installed
check(
  'Dependencies',
  fs.existsSync('node_modules'),
  'npm install completed',
  true
);

// Check 2: .env file exists
const envExists = fs.existsSync('.env');
check(
  'Environment File',
  envExists,
  envExists ? '.env file found' : '.env file missing - copy from .env.template',
  true
);

// Check 3: OpenRouter API key
const apiKey = process.env.OPENROUTER_API_KEY;
const hasValidKey = apiKey && apiKey !== 'sk-or-v1-your-key-here' && apiKey !== 'your-key-here' && apiKey.length > 20;
check(
  'OpenRouter API Key',
  !!hasValidKey,
  hasValidKey ? 'Valid API key configured' : 'API key not set or using placeholder value',
  true
);

// Check 4: Config files
const poemConfig = path.join(process.cwd(), 'config', 'poem.json');
check(
  'Poem Config',
  fs.existsSync(poemConfig),
  'config/poem.json exists',
  true
);

const apiConfig = path.join(process.cwd(), 'config', 'api-endpoints.json');
check(
  'API Config',
  fs.existsSync(apiConfig),
  'config/api-endpoints.json exists',
  true
);

// Check 5: Validate poem.json structure
if (fs.existsSync(poemConfig)) {
  try {
    const poem = JSON.parse(fs.readFileSync(poemConfig, 'utf-8'));
    const blankCount = poem.blanks?.length || 0;
    const has11Blanks = blankCount === 11;
    check(
      'Poem Blanks',
      has11Blanks,
      has11Blanks 
        ? '11 blank positions configured (position 12 auto-calculated)' 
        : `${blankCount} blanks found - need exactly 11 positions`,
      true
    );
  } catch (error) {
    check('Poem Blanks', false, 'Failed to parse poem.json', true);
  }
}

// Check 6: Required directories
check(
  'Logs Directory',
  fs.existsSync('logs'),
  'logs/ directory exists',
  false
);

check(
  'Results Directory',
  fs.existsSync('results'),
  'results/ directory exists',
  false
);

// Check 7: Build status
const distExists = fs.existsSync('dist') && fs.existsSync('dist/main.js');
check(
  'Build Status',
  distExists,
  distExists ? 'Project built successfully' : 'Run "npm run build" to compile',
  true
);

// Check 8: Configuration values
const topK = parseInt(process.env.TOP_K_PER_POSITION || '3', 10);
check(
  'TOP_K_PER_POSITION',
  topK === 3,
  topK === 3 
    ? 'Optimal value (3) - search space ~177K seeds' 
    : `Current value: ${topK} - WARNING: Use 3 for optimal search space`,
  false
);

const workerCount = parseInt(process.env.WORKER_COUNT || '2', 10);
const recommendedWorkers = workerCount >= 2 && workerCount <= 4;
check(
  'WORKER_COUNT',
  recommendedWorkers,
  `${workerCount} workers - ${recommendedWorkers ? 'Recommended range' : 'Consider 2-4 to avoid rate limits'}`,
  false
);

// Print results
console.log('\n🔍 Setup Verification Report\n');
console.log('━'.repeat(70));

let criticalFailed = 0;
let warningCount = 0;

checks.forEach(result => {
  const icon = result.passed ? '✅' : (result.critical ? '❌' : '⚠️');
  const status = result.passed ? 'PASS' : (result.critical ? 'FAIL' : 'WARN');
  
  console.log(`${icon} [${status}] ${result.name}`);
  console.log(`   ${result.message}`);
  
  if (!result.passed && result.critical) criticalFailed++;
  if (!result.passed && !result.critical) warningCount++;
});

console.log('━'.repeat(70));

// Summary
const totalChecks = checks.length;
const passed = checks.filter(c => c.passed).length;

console.log(`\n📊 Summary: ${passed}/${totalChecks} checks passed`);

if (criticalFailed > 0) {
  console.log(`\n❌ ${criticalFailed} critical issue(s) found - setup incomplete`);
  console.log('\nPlease fix critical issues before running:');
  checks
    .filter(c => !c.passed && c.critical)
    .forEach(c => console.log(`  - ${c.name}: ${c.message}`));
  process.exit(1);
}

if (warningCount > 0) {
  console.log(`\n⚠️  ${warningCount} warning(s) - system will run but may have issues`);
}

if (criticalFailed === 0 && warningCount === 0) {
  console.log('\n✅ All checks passed - system ready to run!');
  console.log('\nTo start the recovery system:');
  console.log('  npm start');
}

console.log('\n📖 For detailed setup instructions, see: SETUP.md\n');
