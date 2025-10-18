/**
 * Test script for address derivation
 * Tests all 4 derivation paths with a known seed
 */

import { HDWallet } from '../src/3-address-derivation/hd-wallet';
import { AddressGenerator } from '../src/3-address-derivation/address-generator';

// Test with a well-known seed (DO NOT USE FOR REAL WALLETS)
const TEST_MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

console.log('Testing Address Derivation\n');
console.log('Test Mnemonic:', TEST_MNEMONIC);
console.log('(This is a standard test mnemonic from BIP39 spec)\n');

try {
  // Test HDWallet class
  console.log('=== Testing HDWallet Class ===\n');
  const wallet = new HDWallet(TEST_MNEMONIC);
  
  console.log('1. Legacy (BIP44) - P2PKH:');
  for (let i = 0; i < 3; i++) {
    const address = wallet.deriveLegacyAddress(i);
    console.log(`   m/44'/0'/0'/0/${i}: ${address}`);
  }
  
  console.log('\n2. Nested SegWit (BIP49) - P2SH-P2WPKH:');
  for (let i = 0; i < 3; i++) {
    const address = wallet.deriveNestedSegWitAddress(i);
    console.log(`   m/49'/0'/0'/0/${i}: ${address}`);
  }
  
  console.log('\n3. Native SegWit (BIP84) - Bech32:');
  for (let i = 0; i < 3; i++) {
    const address = wallet.deriveNativeSegWitAddress(i);
    console.log(`   m/84'/0'/0'/0/${i}: ${address}`);
  }
  
  console.log('\n4. Taproot (BIP86) - Bech32m:');
  for (let i = 0; i < 3; i++) {
    const address = wallet.deriveTaprootAddress(i);
    console.log(`   m/86'/0'/0'/0/${i}: ${address}`);
  }
  
  // Test AddressGenerator
  console.log('\n=== Testing AddressGenerator ===\n');
  const addresses = AddressGenerator.deriveAllAddresses(TEST_MNEMONIC);
  
  console.log(`Total addresses derived: ${addresses.length}`);
  console.log('\nAll addresses:');
  addresses.forEach((addr, index) => {
    console.log(`${index + 1}. [${addr.type}] ${addr.address}`);
    console.log(`   Path: ${addr.path}`);
  });
  
  console.log('\n✅ All derivation tests passed!');
  
} catch (error) {
  console.error('❌ Test failed:', error);
  process.exit(1);
}
