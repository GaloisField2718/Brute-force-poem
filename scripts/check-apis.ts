/**
 * Test script to check Bitcoin API connectivity
 */

import axios from 'axios';

const TEST_ADDRESS = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh'; // Known address with transactions

interface ApiTest {
  name: string;
  url: string;
  parseBalance: (data: any) => number;
}

const apis: ApiTest[] = [
  {
    name: 'Mempool.space',
    url: `https://mempool.space/api/address/${TEST_ADDRESS}`,
    parseBalance: (data) => {
      const funded = data.chain_stats?.funded_txo_sum || 0;
      const spent = data.chain_stats?.spent_txo_sum || 0;
      return funded - spent;
    }
  },
  {
    name: 'Blockstream',
    url: `https://blockstream.info/api/address/${TEST_ADDRESS}`,
    parseBalance: (data) => {
      const funded = data.chain_stats?.funded_txo_sum || 0;
      const spent = data.chain_stats?.spent_txo_sum || 0;
      return funded - spent;
    }
  },
  {
    name: 'Blockchain.info',
    url: `https://blockchain.info/balance?active=${TEST_ADDRESS}`,
    parseBalance: (data) => {
      return data[TEST_ADDRESS]?.final_balance || 0;
    }
  },
  {
    name: 'BlockCypher',
    url: `https://api.blockcypher.com/v1/btc/main/addrs/${TEST_ADDRESS}/balance`,
    parseBalance: (data) => {
      return data.balance || 0;
    }
  }
];

async function testApi(api: ApiTest): Promise<void> {
  console.log(`\nTesting ${api.name}...`);
  console.log(`URL: ${api.url}`);
  
  try {
    const startTime = Date.now();
    const response = await axios.get(api.url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Bitcoin-Seed-Recovery-Test/1.0'
      }
    });
    const duration = Date.now() - startTime;
    
    const balance = api.parseBalance(response.data);
    
    console.log(`✅ ${api.name}: OK`);
    console.log(`   Response time: ${duration}ms`);
    console.log(`   Balance: ${balance} satoshis`);
    console.log(`   Status: ${response.status}`);
  } catch (error: any) {
    console.log(`❌ ${api.name}: FAILED`);
    console.log(`   Error: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data:`, JSON.stringify(error.response.data).slice(0, 100));
    }
  }
}

async function main() {
  console.log('=== Bitcoin API Connectivity Test ===');
  console.log(`Test Address: ${TEST_ADDRESS}`);
  console.log(`Total APIs to test: ${apis.length}`);
  
  for (const api of apis) {
    await testApi(api);
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n=== Test Complete ===');
  console.log('If all APIs are working, you can proceed with the main application.');
  console.log('If some APIs failed, the system will automatically use available ones.');
}

main();
