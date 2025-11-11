# ZenFlo NAS Sync Scripts

Scripts for syncing code between NAS production server and Mac development machine.

## Setup Complete ✓

The NAS now has the full ZenFlo monorepo mirrored at:
```
/home/nas/developer/infrastructure/Zenflo Server/zenflo/
```

## Available Scripts

### `sync-from-nas-git.sh` - Continuous Sync (Recommended)
Automatically syncs backend changes from NAS to Mac every 30 seconds and creates commits.

**Usage:**
```bash
./scripts/sync-from-nas-git.sh
```

**Features:**
- Watches for changes on NAS backend
- Syncs to Mac `/backend` directory
- Auto-creates commits with proper attribution
- Runs continuously (press CTRL+C to stop)
- Logs to `.logs/nas-sync.log`

### `sync-once.sh` - Manual Sync
One-time sync with dry-run preview (uses rsync - may not work due to NAS rsync daemon).

**Note:** This script uses rsync which may conflict with the NAS rsync daemon. Use `sync-from-nas-git.sh` instead.

## NAS Structure

```
/home/nas/developer/infrastructure/Zenflo Server/
├── zenflo/                          # Full monorepo (NEW)
│   ├── backend/                     # Backend code
│   ├── mobile/                      # Mobile app
│   ├── webapp/                      # Web app
│   ├── cli/                         # CLI tool
│   └── zen-mcp/                     # MCP servers
└── zenflo-server-backup-20251110/  # Old backend-only backup
```

## Typical Workflow

1. **Make changes on NAS** (via SSH or docker exec)
   ```bash
   ssh nas@nas-1
   cd "developer/infrastructure/Zenflo Server/zenflo/backend"
   # Edit files, restart containers, etc.
   ```

2. **Start sync service on Mac** (in separate terminal)
   ```bash
   ./scripts/sync-from-nas-git.sh
   ```

3. **Changes automatically sync**
   - Script detects changes on NAS
   - Copies to Mac
   - Creates git commits
   - Ready to push to remote

4. **Push to remote** (when ready)
   ```bash
   git push origin main
   ```

## Configuration

Edit the scripts to change:
- `SYNC_INTERVAL` - How often to check for changes (default: 30s)
- `NAS_HOST` - NAS hostname (default: nas@nas-1)
- `NAS_PATH` - Path on NAS (default: /home/nas/developer/infrastructure/Zenflo Server/zenflo)

## Troubleshooting

### rsync issues
The NAS has an rsync daemon that interferes with SSH-based rsync. The git-based sync script uses `scp` instead, which works reliably.

### Permission errors
Ensure you have SSH key authentication set up:
```bash
ssh-copy-id nas@nas-1
```

### Large files
The sync excludes:
- `node_modules/`
- `dist/` and `build/`
- `.DS_Store` files
- Log files

## Logs

View sync logs:
```bash
tail -f .logs/nas-sync.log
```

Clear old logs:
```bash
rm .logs/nas-sync.log
```
