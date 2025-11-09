# CRITICAL BUG - Happy CLI Daemon Spawn Args Issue

**Date:** 2025-11-07 10:44 PST
**Project:** happy-coder (Happy CLI)
**Severity:** CRITICAL - Broke all daemon-spawned sessions

## Issue

Commit `c5a3e0e` "feat: Add Qwen Code integration" broke daemon session spawning by adding extra 'claude' argument.

## What Broke

1. **Daemon-spawned sessions** (from webapp/mobile): Died immediately with "Process exited unexpectedly"
2. **Terminal session messages**: Stopped appearing in webapp UI

## Root Cause

The daemon spawn args in `src/daemon/run.ts` was changed to include the agent name:

### Working Code (0.11.2)
```typescript
const args = [
  '--happy-starting-mode', 'remote',
  '--started-by', 'daemon'
];
```

### Broken Code (c5a3e0e)
```typescript
const args = [
  options.agent === 'claude' ? 'claude' : options.agent === 'gemini' ? 'gemini' : 'codex',
  '--happy-starting-mode', 'remote',
  '--started-by', 'daemon'
];
```

**Why it broke:**
- The launcher script (`scripts/claude_local_launcher.cjs`) already runs `claude code`
- Passing `'claude'` as first arg created: `claude code --append-system-prompt "..." claude`
- The extra `claude` at the end broke the command

## Impact

- **Webapp:** Could not create new sessions (404 errors, zombie sessions)
- **Terminal:** Messages not syncing to webapp UI
- **Cost:** Wasted 30 minutes debugging instead of checking git log first

## Fix

```bash
git reset --hard 4a9ba96  # Revert to "Release version 0.11.2"
yarn build
happy daemon stop && happy daemon start
```

## Files Affected

- `src/daemon/run.ts` - Daemon spawn args
- `scripts/claude_local_launcher.cjs` - Already handles 'claude code'

## Lesson Learned

**When Happy CLI breaks:**
1. ✅ IMMEDIATELY check `git log --oneline -10`
2. ✅ Look for recent feature commits
3. ✅ Revert and rebuild to confirm
4. ❌ DON'T waste time debugging when git history shows the answer

## Prevention

Before adding agent support:
- Understand that `happy` defaults to Claude (no arg needed)
- The launcher script already handles the `claude code` command
- Only non-default agents (gemini, codex, qwen) need explicit arg

## Related Issues

- Removing `/usr/local/lib/node_modules/happy-coder` was fine
- Symlink structure is correct
- The Qwen integration commit was the sole cause
