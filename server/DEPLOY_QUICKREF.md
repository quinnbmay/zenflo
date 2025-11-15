# Backend Deployment Quick Reference

## Common Commands

```bash
# Standard production deployment
./deploy.sh

# Deploy local changes
./deploy.sh --mode local

# Deploy specific branch
./deploy.sh --branch develop

# Fast iteration (no install, no rebuild)
./deploy.sh -m local -s -n

# Deploy with extra logs
./deploy.sh --logs 200

# Show help
./deploy.sh --help
```

## Manual Operations

```bash
# SSH to NAS
ssh nas@nas-1

# Navigate to backend
cd 'developer/infrastructure/ZenFlo Server/zenflo-server'

# Check container status
sudo docker ps | grep zenflo-server

# View logs (last 50 lines)
sudo docker logs zenflo-server --tail 50

# Follow logs live
sudo docker logs -f zenflo-server

# Restart container
sudo docker compose restart zenflo-server

# Rebuild container
sudo docker compose up -d --build zenflo-server

# Check container stats
sudo docker stats zenflo-server

# View errors only
sudo docker logs zenflo-server --tail 200 | grep -i error
```

## Deployment Modes

| Mode | Command | Use Case |
|------|---------|----------|
| Git | `./deploy.sh` | Production (committed changes) |
| Local | `./deploy.sh -m local` | Testing (uncommitted changes) |

## Deployment Script Options

| Option | Description |
|--------|-------------|
| `-m, --mode <git\|local>` | Deployment mode (default: git) |
| `-b, --branch <branch>` | Git branch to pull (default: main) |
| `-s, --skip-install` | Skip npm install step |
| `-n, --no-rebuild` | Skip Docker container rebuild |
| `-l, --logs <lines>` | Number of log lines to show (default: 50) |
| `-h, --help` | Show help message |

## Health Checks

```bash
# Check API health
curl https://happy.zenflo.dev/health

# Check auth endpoint
curl https://happy.zenflo.dev/v1/auth/health

# Test from mobile app
# Open ZenFlo app → Should connect automatically
```

## Troubleshooting

```bash
# Container won't start
ssh nas@nas-1 "sudo docker logs zenflo-server --tail 100"

# Check if ports are available
ssh nas@nas-1 "sudo netstat -tulpn | grep 3005"

# Verify environment variables
ssh nas@nas-1 "cd 'developer/infrastructure/ZenFlo Server/zenflo-server' && cat .env.production"

# Check disk space
ssh nas@nas-1 "df -h"

# Clear npm cache
ssh nas@nas-1 "cd 'developer/infrastructure/ZenFlo Server/zenflo-server' && npm cache clean --force"

# Full rebuild
ssh nas@nas-1 "cd 'developer/infrastructure/ZenFlo Server/zenflo-server' && rm -rf node_modules && npm install && sudo docker compose up -d --build zenflo-server"
```

## Rollback

```bash
# SSH to NAS
ssh nas@nas-1

# Navigate to backend
cd 'developer/infrastructure/ZenFlo Server/zenflo-server'

# View recent commits
git log --oneline -10

# Rollback to specific commit
git checkout <commit-hash>
sudo docker compose up -d --build zenflo-server

# Rollback to previous commit
git checkout HEAD~1
sudo docker compose up -d --build zenflo-server
```

## Pre-Deployment Checklist

- [ ] All tests pass: `yarn test`
- [ ] TypeScript compiles: `yarn build`
- [ ] Changes committed to git (for git mode)
- [ ] Team notified (for production)

## Post-Deployment Checklist

- [ ] Container is running: `docker ps`
- [ ] Health check passes
- [ ] No errors in logs
- [ ] Mobile app connects
- [ ] API endpoints respond

## Infrastructure Details

- **Server:** nas@nas-1
- **Location:** `developer/infrastructure/ZenFlo Server/zenflo-server`
- **Container:** zenflo-server
- **URL:** https://happy.zenflo.dev
- **Port:** 3005

## Full Documentation

See [DEPLOYMENT.md](./DEPLOYMENT.md) for comprehensive deployment guide.
