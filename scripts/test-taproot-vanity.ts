/**
 * Test script for Taproot vanity address generation
 */

import { OptimizedVanityGenerator } from '../src/3-address-derivation/optimized-vanity-generator';
import * as fs from 'fs';
import * as path from 'path';

async function testTaprootVanity() {
  console.log('🧪 Testing Taproot Vanity Address Generation');
  console.log('==========================================');
  console.log('This test will check 200 addresses to verify the system works');
  console.log('');

  try {
    // Test with a simple suffix (like 'x')
    console.log('1. Testing with suffix "x"...');
    console.log('   This should find a match quickly...');
    console.log('');
    
    const result = await OptimizedVanityGenerator.generateVanityAddress(
      'x',
      200 // Test with just 200 addresses
    );

    console.log('\n📊 Test 1 Results:');
    console.log(`   Addresses checked: ${result.totalAddressesChecked}`);
    console.log(`   Found: ${result.found ? '✅ YES!' : '❌ No'}`);
    console.log(`   Generation time: ${(result.generationTime / 1000).toFixed(2)}s`);

    if (result.found) {
      console.log(`   🎯 Found address: ${result.address}`);
      console.log(`   Path: ${result.path}`);
      console.log(`   Private key: ${result.privateKey?.substring(0, 20)}...`);
      
      // Save the found address to results directory
      saveVanityResult(result, 'x');
    }

    // Test with a very common suffix (like 'a')
    console.log('\n2. Testing with suffix "a"...');
    console.log('   This should find a match quickly...');
    console.log('');
    
    const result2 = await OptimizedVanityGenerator.generateVanityAddress(
      'a',
      200 // Test with just 200 addresses
    );

    console.log('\n📊 Test 2 Results:');
    console.log(`   Addresses checked: ${result2.totalAddressesChecked}`);
    console.log(`   Found: ${result2.found ? '✅ YES!' : '❌ No'}`);
    console.log(`   Generation time: ${(result2.generationTime / 1000).toFixed(2)}s`);

    if (result2.found) {
      console.log(`   🎯 Found address: ${result2.address}`);
      console.log(`   Path: ${result2.path}`);
      
      // Save the found address to results directory
      saveVanityResult(result2, 'a');
    }

    // Test performance stats
    console.log('\n3. Performance statistics:');
    const stats = OptimizedVanityGenerator.getPerformanceStats();
    console.log(`   Max addresses per seed: ${stats.maxAddressesPerSeed}`);
    console.log(`   Batch size: ${stats.batchSize}`);
    console.log(`   Accounts to check: ${stats.accountsToCheck.join(', ')}`);

    console.log('\n✅ Test completed successfully!');
    console.log('\nTo run the full vanity generation:');
    console.log('npm run vanity');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

/**
 * Save vanity address result to file
 */
function saveVanityResult(result: any, suffix: string): void {
  try {
    const resultsDir = path.join(process.cwd(), 'results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `vanity-found-${suffix}-${timestamp}.json`;
    const filepath = path.join(resultsDir, filename);

    const foundWallet = {
      mnemonic: result.mnemonic,
      address: result.address,
      path: result.path,
      privateKey: result.privateKey,
      totalAddressesChecked: result.totalAddressesChecked,
      totalTimeMs: result.generationTime,
      generationTimeMs: result.generationTime,
      suffix: suffix,
      timestamp: new Date().toISOString(),
      testRun: true
    };

    fs.writeFileSync(filepath, JSON.stringify(foundWallet, null, 2));
    console.log(`   💾 Saved to: results/${filename}`);
  } catch (error) {
    console.error(`   ❌ Failed to save result: ${error}`);
  }
}

// Run the test
testTaprootVanity();
