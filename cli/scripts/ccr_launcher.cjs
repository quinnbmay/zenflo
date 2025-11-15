#!/usr/bin/env node

// CCR launcher for ZenFlo
// This script wraps ccr code to work within ZenFlo's session management

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

// Disable autoupdater
process.env.DISABLE_AUTOUPDATER = '1';

// Debug helper
const DEBUG = process.env.DEBUG === '1' || process.env.DEBUG === 'true';
function debug(...args) {
    if (DEBUG) {
        console.error(...args);
    }
}

// Helper to write JSON messages to fd 3
function writeMessage(message) {
    try {
        fs.writeSync(3, JSON.stringify(message) + '\n');
    } catch (err) {
        // fd 3 not available, ignore
    }
}

// Check if being called from zenflo
let isCalledFromZenflo = false;
try {
    fs.writeSync(3, '');
    isCalledFromZenflo = true;
} catch (err) {
    isCalledFromZenflo = false;
}

// Track session IDs
const capturedSessionIds = new Set();
let daemonNotified = false;
let sessionWatcher = null;

// Helper to get project path
function getProjectPath(workingDirectory) {
    const { join, resolve } = require('path');
    const { homedir } = require('os');

    const projectId = resolve(workingDirectory).replace(/[\\\/\.:]/g, '-');
    const claudeConfigDir = process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude');

    return join(claudeConfigDir, 'projects', projectId);
}

// Helper to notify daemon about session
async function notifyDaemon(sessionId) {
    if (daemonNotified || capturedSessionIds.has(sessionId)) {
        return;
    }
    capturedSessionIds.add(sessionId);

    try {
        const { readFileSync } = require('fs');
        const { homedir } = require('os');

        const daemonStatePath = path.join(
            process.env.ZENFLO_HOME_DIR || path.join(homedir(), '.happy'),
            'daemon.state.json'
        );

        let daemonState;
        try {
            daemonState = JSON.parse(readFileSync(daemonStatePath, 'utf8'));
        } catch (err) {
            return;
        }

        if (!daemonState.httpPort) {
            return;
        }

        const metadata = {
            path: process.cwd(),
            host: require('os').hostname(),
            hostPid: process.pid,
            startedBy: 'zenflo-cli',
            flavor: 'ccr'  // Mark this session as CCR flavor
        };

        const response = await fetch(`http://127.0.0.1:${daemonState.httpPort}/session-started`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, metadata })
        });

        if (response.ok) {
            daemonNotified = true;
        }
    } catch (err) {
        // Ignore errors
    }
}

// Handle detected session
function handleSessionFile(sessionId) {
    if (capturedSessionIds.has(sessionId)) {
        return;
    }
    capturedSessionIds.add(sessionId);

    if (isCalledFromZenflo) {
        writeMessage({ type: 'uuid', value: sessionId });
    }

    if (!isCalledFromZenflo) {
        notifyDaemon(sessionId).catch(() => {});
    }
}

// Start session file watcher
function startSessionWatcher() {
    const { watch, mkdirSync } = require('fs');

    try {
        const cwd = process.cwd();
        const projectDir = getProjectPath(cwd);
        mkdirSync(projectDir, { recursive: true});

        debug('[ccr-launcher] Working directory:', cwd);
        debug('[ccr-launcher] Watching for sessions in:', projectDir);
        debug('[ccr-launcher] Called from zenflo:', isCalledFromZenflo);

        sessionWatcher = watch(projectDir, (eventType, filename) => {
            if (typeof filename === 'string' && filename.toLowerCase().endsWith('.jsonl')) {
                const sessionId = filename.replace('.jsonl', '');

                if (eventType === 'change') {
                    debug('[ccr-launcher] Active session detected:', sessionId);
                    handleSessionFile(sessionId);
                }
            }
        });
    } catch (err) {
        console.error('[ccr-launcher] Error starting session watcher:', err.message);
    }
}

// Start watching
startSessionWatcher();

// Intercept crypto.randomUUID
const originalRandomUUID = crypto.randomUUID;
Object.defineProperty(global, 'crypto', {
    configurable: true,
    enumerable: true,
    get() {
        return {
            randomUUID: () => {
                const uuid = originalRandomUUID();
                writeMessage({ type: 'uuid', value: uuid });
                return uuid;
            }
        };
    }
});
Object.defineProperty(crypto, 'randomUUID', {
    configurable: true,
    enumerable: true,
    get() {
        return () => {
            const uuid = originalRandomUUID();
            writeMessage({ type: 'uuid', value: uuid });
            return uuid;
        }
    }
});

// Intercept fetch to track activity
const originalFetch = global.fetch;
let fetchCounter = 0;

global.fetch = function(...args) {
    const id = ++fetchCounter;
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
    const method = args[1]?.method || 'GET';

    let hostname = '';
    let pathname = '';
    try {
        const urlObj = new URL(url, 'http://localhost');
        hostname = urlObj.hostname;
        pathname = urlObj.pathname;
    } catch (e) {
        hostname = 'unknown';
        pathname = url;
    }

    writeMessage({
        type: 'fetch-start',
        id,
        hostname,
        path: pathname,
        method,
        timestamp: Date.now()
    });

    const fetchPromise = originalFetch(...args);

    const sendEnd = () => {
        writeMessage({
            type: 'fetch-end',
            id,
            timestamp: Date.now()
        });
    };

    fetchPromise.then(sendEnd, sendEnd);

    return fetchPromise;
};

Object.defineProperty(global.fetch, 'name', { value: 'fetch' });
Object.defineProperty(global.fetch, 'length', { value: originalFetch.length });

if (!isCalledFromZenflo) {
    // Start zenflo daemon in background
    const scriptDir = __dirname;
    const cliDir = path.resolve(scriptDir, '..');
    const zenfloBin = path.resolve(cliDir, 'bin', 'zenflo.mjs');

    try {
        const daemonProcess = spawn(process.execPath, [zenfloBin, 'daemon', 'start'], {
            detached: true,
            stdio: 'ignore'
        });
        daemonProcess.unref();
        setTimeout(() => {}, 500);
    } catch (err) {
        // Ignore errors
    }
}

// Check if CCR is available
try {
    execSync('which ccr', { encoding: 'utf8', stdio: 'pipe' });
} catch (err) {
    console.error('❌ Claude Code Router (ccr) not found!');
    console.error('');
    console.error('Please install CCR first:');
    console.error('  npm install -g @musistudio/claude-code-router');
    console.error('');
    console.error('Or use the local installation at:');
    console.error('  /Users/quinnmay/claude-code-router/ccr-claude');
    process.exit(1);
}

// Check if CCR is running
try {
    const status = execSync('ccr status', { encoding: 'utf8', stdio: 'pipe' });
    if (!status.includes('Running')) {
        debug('[ccr-launcher] Starting CCR service...');
        execSync('ccr start', { stdio: 'ignore' });
        // Give it a moment to start
        const start = Date.now();
        while (Date.now() - start < 5000) {
            try {
                const check = execSync('ccr status', { encoding: 'utf8', stdio: 'pipe' });
                if (check.includes('Running')) {
                    break;
                }
            } catch (e) {
                // Keep waiting
            }
            // Sleep for 100ms
            execSync('sleep 0.1', { stdio: 'ignore' });
        }
    }
} catch (err) {
    console.error('[ccr-launcher] Failed to start CCR:', err.message);
    process.exit(1);
}

// Set environment to route through CCR
process.env.ANTHROPIC_BASE_URL = 'http://localhost:3456';
process.env.ANTHROPIC_API_KEY = 'ccr-proxy-key';

debug('[ccr-launcher] CCR is running, launching Claude Code...');
debug('[ccr-launcher] ANTHROPIC_BASE_URL:', process.env.ANTHROPIC_BASE_URL);

// Find Claude Code binary
let claudeCodePath;
try {
    const claudePath = execSync('which claude', { encoding: 'utf8', stdio: 'pipe' }).trim();
    claudeCodePath = fs.realpathSync(claudePath);
} catch (err) {
    console.error('Failed to find Claude Code CLI');
    console.error('Make sure claude is installed: npm install -g @anthropic-ai/claude-code');
    process.exit(1);
}

// Load Claude Code
try {
    debug('[ccr-launcher] Loading Claude Code from:', claudeCodePath);
    require(claudeCodePath);
} catch (err) {
    console.error('Failed to load Claude Code CLI:', err.message);
    process.exit(1);
}
