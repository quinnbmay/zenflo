# ZenFlo Backend Deployment Guide

**Last Updated:** 2025-11-10

This guide covers deploying the ZenFlo backend to the NAS server using the automated deployment script.

## Quick Start

```bash
# Deploy from git (most common)
./deploy.sh

# Deploy local changes
./deploy.sh --mode local

# Deploy specific branch
./deploy.sh --branch develop
```

## Deployment Script

The `deploy.sh` script automates the entire deployment process, including:

- SSH connection to NAS
- Pulling latest changes or syncing local files
- Installing dependencies (if package.json changed)
- Rebuilding Docker container
- Verifying deployment
- Showing logs

### Prerequisites

1. **SSH Access:** Passwordless SSH access to `nas@nas-1` must be configured
2. **Docker:** Docker and docker-compose must be installed on NAS
3. **Permissions:** User must have sudo privileges on NAS

### Usage

```bash
./deploy.sh [OPTIONS]
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `-m, --mode <git\|local>` | Deployment mode | `git` |
| `-b, --branch <branch>` | Git branch to pull | `main` |
| `-s, --skip-install` | Skip npm install step | `false` |
| `-n, --no-rebuild` | Skip Docker container rebuild | `false` |
| `-l, --logs <lines>` | Number of log lines to show | `50` |
| `-h, --help` | Show help message | - |

### Deployment Modes

#### Git Mode (Default)

Pulls the latest changes from the git repository on the NAS.

```bash
# Deploy from main branch
./deploy.sh

# Deploy from specific branch
./deploy.sh --branch develop

# Deploy without rebuilding (for testing)
./deploy.sh --no-rebuild
```

**When to use:**
- Changes are committed and pushed to git
- Deploying to production
- Coordinating with team members

#### Local Mode

Syncs local files directly to the NAS, bypassing git.

```bash
# Deploy local changes
./deploy.sh --mode local

# Deploy without npm install (faster for quick iterations)
./deploy.sh --mode local --skip-install
```

**When to use:**
- Testing uncommitted changes
- Rapid development iterations
- Debugging production issues

**Files excluded from sync:**
- `node_modules/`
- `.git/`
- `dist/`
- `.logs/`
- `.pgdata/`
- `.minio/`
- `*.log`

### Examples

```bash
# Standard production deployment
./deploy.sh

# Quick local test (no install, no rebuild)
./deploy.sh -m local -s -n

# Deploy feature branch with extra logs
./deploy.sh --branch feature/new-api --logs 100

# Deploy local changes with full rebuild
./deploy.sh --mode local
```

## Manual Deployment

If you need to deploy manually without the script:

### 1. SSH to NAS

```bash
ssh nas@nas-1
```

### 2. Navigate to Backend Directory

```bash
cd 'developer/infrastructure/ZenFlo Server/zenflo-server'
```

### 3. Pull Latest Changes (Git Mode)

```bash
git fetch origin
git checkout main
git pull origin main
```

### 4. Install Dependencies (if package.json changed)

```bash
npm install
```

### 5. Rebuild Docker Container

```bash
sudo docker compose up -d --build zenflo-server
```

### 6. Verify Deployment

```bash
# Check container status
sudo docker ps | grep zenflo-server

# View logs
sudo docker logs zenflo-server --tail 50

# Follow logs in real-time
sudo docker logs -f zenflo-server
```

## Post-Deployment

### Health Check

```bash
# Check if server is responding
curl https://happy.combinedmemory.com/health

# Test authentication endpoint
curl https://happy.combinedmemory.com/v1/auth/health
```

### Monitoring

```bash
# View live logs
ssh nas@nas-1 "sudo docker logs -f zenflo-server"

# Check container resource usage
ssh nas@nas-1 "sudo docker stats zenflo-server"

# View recent errors
ssh nas@nas-1 "sudo docker logs zenflo-server --tail 200 | grep -i error"
```

### Rollback

If deployment fails, rollback to previous version:

```bash
ssh nas@nas-1
cd 'developer/infrastructure/ZenFlo Server/zenflo-server'

# View recent commits
git log --oneline -10

# Rollback to specific commit
git checkout <commit-hash>
sudo docker compose up -d --build zenflo-server
```

## Troubleshooting

### SSH Connection Issues

**Problem:** Cannot connect to NAS via SSH

**Solutions:**
1. Check if NAS is running: `ping nas-1`
2. Verify SSH config in `~/.ssh/config`:
   ```
   Host nas-1
       HostName <nas-ip-address>
       User nas
       IdentityFile ~/.ssh/id_rsa
   ```
3. Test SSH manually: `ssh nas@nas-1 echo "Connected"`

### Container Won't Start

**Problem:** Docker container fails to start after rebuild

**Solutions:**
1. Check logs for errors: `ssh nas@nas-1 "sudo docker logs zenflo-server --tail 100"`
2. Verify environment variables: `ssh nas@nas-1 "cd '$NAS_PATH' && cat .env.production"`
3. Check if ports are available: `ssh nas@nas-1 "sudo netstat -tulpn | grep 3005"`
4. Try manual restart: `ssh nas@nas-1 "cd '$NAS_PATH' && sudo docker compose restart zenflo-server"`

### TypeScript Compilation Errors

**Problem:** Container fails to start due to TypeScript errors

**Solutions:**
1. Run type check locally: `yarn build`
2. Fix TypeScript errors before deploying
3. Check if all dependencies are installed: `ssh nas@nas-1 "cd '$NAS_PATH' && npm list"`

### Database Connection Issues

**Problem:** "Response from the Engine was empty" errors

**Solutions:**
1. Check if PostgreSQL is running: `ssh nas@nas-1 "sudo docker ps | grep postgres"`
2. Verify database credentials in `.env.production`
3. Test database connection: `ssh nas@nas-1 "cd '$NAS_PATH' && npm run migrate"`

### npm Install Fails

**Problem:** Dependencies fail to install on NAS

**Solutions:**
1. Check disk space: `ssh nas@nas-1 "df -h"`
2. Clear npm cache: `ssh nas@nas-1 "cd '$NAS_PATH' && npm cache clean --force"`
3. Remove node_modules and reinstall: `ssh nas@nas-1 "cd '$NAS_PATH' && rm -rf node_modules && npm install"`

## Deployment Checklist

Before deploying to production:

- [ ] All tests pass locally: `yarn test`
- [ ] TypeScript compiles without errors: `yarn build`
- [ ] Changes are committed and pushed to git
- [ ] Environment variables are configured on NAS
- [ ] Database migrations are up to date
- [ ] Breaking changes are documented
- [ ] Team is notified of deployment

After deployment:

- [ ] Health check passes
- [ ] Container is running: `docker ps`
- [ ] Logs show no errors
- [ ] API endpoints respond correctly
- [ ] Mobile app can connect
- [ ] WebSocket connections work
- [ ] Database queries succeed

## Automation

### GitHub Actions

To set up automated deployments on git push:

1. Create `.github/workflows/deploy-backend.yml`:

```yaml
name: Deploy Backend to NAS

on:
  push:
    branches:
      - main
    paths:
      - 'backend/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Deploy to NAS
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.NAS_HOST }}
          username: ${{ secrets.NAS_USER }}
          key: ${{ secrets.NAS_SSH_KEY }}
          script: |
            cd 'developer/infrastructure/ZenFlo Server/zenflo-server'
            git pull origin main
            npm install
            sudo docker compose up -d --build zenflo-server
```

2. Add secrets to GitHub repository:
   - `NAS_HOST`: NAS server IP/hostname
   - `NAS_USER`: SSH username (nas)
   - `NAS_SSH_KEY`: Private SSH key

## Best Practices

1. **Test Locally First:** Always test changes locally before deploying
2. **Use Git Mode for Production:** Local mode should only be used for debugging
3. **Monitor Logs:** Watch logs for a few minutes after deployment
4. **Deploy During Low Traffic:** Schedule deployments during off-peak hours
5. **Keep Backups:** Ensure database backups are up to date
6. **Document Changes:** Update CHANGELOG.md with deployment notes
7. **Communicate:** Notify team before deploying breaking changes

## Architecture

### Backend Infrastructure

```
┌─────────────────────────────────────────┐
│           NAS Server (nas-1)            │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  Docker Container: zenflo-server  │ │
│  │                                   │ │
│  │  • Node.js/TypeScript             │ │
│  │  • Fastify Web Framework          │ │
│  │  • PostgreSQL (Prisma ORM)        │ │
│  │  • Redis (Caching/Pub-Sub)        │ │
│  │  • Socket.io (WebSocket)          │ │
│  │  • Port: 3005                     │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │      PostgreSQL Database          │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │         Redis Cache               │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
         │
         │ HTTPS (happy.combinedmemory.com)
         │
         ▼
┌─────────────────────────────────────────┐
│           Clients                       │
│  • Mobile App (iOS/Android)             │
│  • Web App (Browser)                    │
│  • CLI (Terminal)                       │
└─────────────────────────────────────────┘
```

### Deployment Flow

```
┌──────────────┐
│  Local Dev   │
└──────┬───────┘
       │
       ├─────────────────────────────────┐
       │                                 │
       ▼                                 ▼
┌──────────────┐                  ┌──────────────┐
│  Git Mode    │                  │  Local Mode  │
└──────┬───────┘                  └──────┬───────┘
       │                                 │
       ├─ git push                       ├─ rsync files
       │                                 │
       ▼                                 ▼
┌─────────────────────────────────────────────┐
│              NAS Server                     │
├─────────────────────────────────────────────┤
│  1. git pull / receive files               │
│  2. npm install (if package.json changed)   │
│  3. docker compose up -d --build            │
│  4. Container restart                       │
└─────────────────────────────────────────────┘
       │
       ▼
┌──────────────┐
│  Production  │
└──────────────┘
```

## Environment Variables

The backend uses environment-specific configuration files:

- `.env` - Base configuration
- `.env.dev` - Development overrides
- `.env.production` - Production overrides (on NAS)

Key variables:

```bash
# Server
PORT=3005
NODE_ENV=production

# Database
DATABASE_URL="postgresql://..."

# Redis
REDIS_URL="redis://..."

# S3/MinIO
S3_ENDPOINT="..."
S3_ACCESS_KEY="..."
S3_SECRET_KEY="..."
S3_BUCKET="..."

# Authentication
JWT_SECRET="..."

# External Services
ELEVENLABS_API_KEY="..."
GITHUB_TOKEN="..."
```

## Related Documentation

- **Backend Development:** `CLAUDE.md`
- **Project Overview:** `../CLAUDE.md`
- **API Documentation:** `README.md`
- **Infrastructure:** `../INFRASTRUCTURE.md` (in workspace root)

## Support

If you encounter issues with deployment:

1. Check the troubleshooting section above
2. Review deployment logs: `ssh nas@nas-1 "sudo docker logs zenflo-server"`
3. Consult backend documentation: `CLAUDE.md`
4. Contact the development team

## Changelog

### 2025-11-10
- Created automated deployment script (`deploy.sh`)
- Added comprehensive deployment documentation
- Implemented git and local deployment modes
- Added error handling and verification steps
