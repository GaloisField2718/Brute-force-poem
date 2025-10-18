# Deployment Guide

## Server Deployment

### Requirements

- Ubuntu 20.04+ or similar Linux distribution
- Node.js 20+
- At least 2GB RAM
- Stable internet connection

### Installation Steps

1. **Clone Repository**
```bash
git clone <repository-url>
cd bitcoin-seed-recovery
```

2. **Install Dependencies**
```bash
npm install
```

3. **Configure Environment**
```bash
cp .env.example .env
nano .env
```

Add your OpenRouter API key:
```
OPENROUTER_API_KEY=sk-or-v1-your-key-here
```

4. **Build Project**
```bash
npm run build
```

5. **Test Configuration**
```bash
# Verify configs exist
ls -la config/
cat config/poem.json
```

### Running with PM2 (Recommended)

PM2 keeps the process running in the background and handles crashes.

1. **Install PM2**
```bash
npm install -g pm2
```

2. **Start Application**
```bash
pm2 start dist/main.js --name seed-recovery
```

3. **Monitor Logs**
```bash
pm2 logs seed-recovery
```

4. **Monitor Process**
```bash
pm2 monit
```

5. **Stop Application**
```bash
pm2 stop seed-recovery
```

6. **Restart Application**
```bash
pm2 restart seed-recovery
```

7. **Auto-Start on Boot**
```bash
pm2 startup
pm2 save
```

### Running Directly

If you don't want to use PM2:

```bash
npm start
```

Or in the background:
```bash
nohup npm start > output.log 2>&1 &
```

### Monitoring

#### Real-time Logs
```bash
# All logs
tail -f logs/combined-*.log

# Errors only
tail -f logs/error-*.log

# Progress updates
tail -f logs/combined-*.log | grep "Progress Update"
```

#### System Resources
```bash
# CPU and memory usage
htop

# Disk usage
df -h

# Network connections
netstat -an | grep ESTABLISHED
```

#### PM2 Dashboard (if using PM2)
```bash
pm2 monit
```

### Results

Results are saved in the `results/` directory:

- `results-*.jsonl` - All checked seeds (mnemonics hashed)
- `found-wallets-*.json` - Found wallets with full seed phrase
- `summary-*.json` - Performance statistics

**IMPORTANT**: Secure the `found-wallets-*.json` file immediately if a wallet is found!

### Troubleshooting

#### High Memory Usage

Reduce beam width:
```bash
# In .env
BEAM_WIDTH=100
WORKER_COUNT=4
```

#### Low Throughput

Check API status:
```bash
# Test each API manually
curl https://mempool.space/api/address/bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh
```

#### Worker Crashes

Check logs:
```bash
cat logs/error-*.log
```

Reduce workers:
```bash
# In .env
WORKER_COUNT=4
```

### Security

1. **Protect .env file**
```bash
chmod 600 .env
```

2. **Protect results directory**
```bash
chmod 700 results/
```

3. **Backup found wallets immediately**
```bash
cp results/FOUND-*.json ~/secure-backup/
```

4. **Use firewall**
```bash
sudo ufw enable
sudo ufw allow ssh
```

### Performance Tuning

#### For High-Performance Server (8+ cores, 16GB+ RAM)
```bash
# .env
WORKER_COUNT=16
BEAM_WIDTH=300
TOP_K_PER_POSITION=20
MAX_SEEDS_TO_CHECK=50000
```

#### For Low-End Server (2-4 cores, 4GB RAM)
```bash
# .env
WORKER_COUNT=2
BEAM_WIDTH=100
TOP_K_PER_POSITION=10
MAX_SEEDS_TO_CHECK=5000
```

### Stopping Gracefully

```bash
# If using PM2
pm2 stop seed-recovery

# If running directly
kill -SIGTERM <pid>
```

The application will finish current checks and save progress.

### Cleanup

Remove old logs:
```bash
find logs/ -name "*.log" -mtime +7 -delete
```

Remove old results:
```bash
# Be careful with this!
find results/ -name "results-*.jsonl" -mtime +30 -delete
```

### Updates

To update the code:

```bash
git pull
npm install
npm run build
pm2 restart seed-recovery
```

### Health Checks

Create a health check script:

```bash
#!/bin/bash
# health-check.sh

if pm2 describe seed-recovery | grep -q "online"; then
    echo "OK: Application running"
    exit 0
else
    echo "ERROR: Application not running"
    pm2 start dist/main.js --name seed-recovery
    exit 1
fi
```

Run every 5 minutes:
```bash
crontab -e
# Add:
*/5 * * * * /path/to/health-check.sh
```

### Estimating Runtime

- **Small search**: 1,000 seeds ≈ 10 minutes (at 1.5 seeds/s)
- **Medium search**: 10,000 seeds ≈ 2 hours
- **Large search**: 50,000 seeds ≈ 10 hours

Actual time depends on:
- Worker count
- Network speed
- API response times
- System resources

### Cost Estimation

**OpenRouter API (Claude 3.5 Sonnet)**:
- ~12 requests (one per blank position)
- ~500 tokens per request
- Cost: ~$0.10-0.20 per run

**Bitcoin APIs**:
- Free public endpoints
- Rate limited (respect the limits!)

### Best Practices

1. **Start Small**: Test with low MAX_SEEDS_TO_CHECK first
2. **Monitor First Hour**: Watch logs for any issues
3. **Check API Health**: Ensure all APIs responding
4. **Backup Results**: Regularly backup results directory
5. **Secure Access**: Use SSH keys, no password auth
6. **Use Screen/Tmux**: For interactive monitoring

### Support

For issues:
1. Check logs in `logs/`
2. Review configuration in `config/`
3. Test API connectivity
4. Check system resources
5. Review README.md

---

**Last Updated**: 2025-10-18
