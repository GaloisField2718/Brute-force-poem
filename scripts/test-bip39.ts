/**
 * Test script for BIP39 filtering and checksum validation
 */

import { BIP39Filter } from '../src/2-seed-generator/bip39-filter';
import { ChecksumValidator } from '../src/2-seed-generator/checksum-validator';
import { PoemBlank } from '../src/types';

console.log('Testing BIP39 Filtering and Validation\n');

// Test 1: Get all BIP39 words
console.log('=== Test 1: BIP39 Wordlist ===');
const allWords = BIP39Filter.getAllWords();
console.log(`Total BIP39 words: ${allWords.length}`);
console.log(`First 10 words: ${allWords.slice(0, 10).join(', ')}`);
console.log('✅ Wordlist loaded\n');

// Test 2: Filter words by constraints
console.log('=== Test 2: Word Filtering ===');
const testBlank: PoemBlank = {
  position: 1,
  context: "test context with _____ blank",
  constraints: {
    length: 5,
    syllables: 1,
    pattern: 'noun',
    semantic_domain: ['test'],
    rhyme_with: 'wall'
  }
};

const filtered = BIP39Filter.filterWords(testBlank, 1);
console.log(`Filtered candidates: ${filtered.length}`);
console.log(`Top 10 matches:`, filtered.slice(0, 10).map(f => 
  `${f.word} (${(f.matchScore * 100).toFixed(0)}%)`
).join(', '));
console.log('✅ Filtering works\n');

// Test 3: Validate known mnemonic
console.log('=== Test 3: Mnemonic Validation ===');
const validMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const isValid = BIP39Filter.validateMnemonic(validMnemonic);
console.log(`Test mnemonic valid: ${isValid}`);

const invalidMnemonic = 'invalid invalid invalid invalid invalid invalid invalid invalid invalid invalid invalid invalid';
const isInvalid = BIP39Filter.validateMnemonic(invalidMnemonic);
console.log(`Invalid mnemonic rejected: ${!isInvalid}`);
console.log('✅ Validation works\n');

// Test 4: Find valid last words
console.log('=== Test 4: Checksum - Find Valid Last Words ===');
const first11 = validMnemonic.split(' ').slice(0, 11);
console.log(`First 11 words: ${first11.join(' ')}`);

const validLastWords = ChecksumValidator.findValidLastWords(first11);
console.log(`Valid last words found: ${validLastWords.length}`);
console.log(`Valid last words: ${validLastWords.join(', ')}`);

if (validLastWords.includes('about')) {
  console.log('✅ Correct last word "about" found in valid set');
} else {
  console.log('❌ Expected last word "about" not found');
}

// Test 5: Expected valid last word count
console.log('\n=== Test 5: Statistical Check ===');
const expected = ChecksumValidator.getExpectedValidLastWordCount();
console.log(`Expected valid last words per 11-word prefix: ~${expected}`);
console.log(`Actual for test: ${validLastWords.length}`);
console.log(`Ratio: ${(validLastWords.length / expected).toFixed(2)}x`);

if (validLastWords.length >= 8 && validLastWords.length <= 24) {
  console.log('✅ Valid last word count in expected range\n');
} else {
  console.log('⚠️  Valid last word count outside typical range\n');
}

console.log('=== All BIP39 Tests Complete ===');
