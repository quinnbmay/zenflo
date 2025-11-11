#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

// Disable autoupdater (never works really)
process.env.DISABLE_AUTOUPDATER = '1';

// Debug helper - only output when DEBUG=1
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

// Check if we're being called from zenflo (has fd 3 open) or directly from Claude Code extension
let isCalledFromZenflo = false;
try {
    // Try to write to fd 3 - if it exists, we're being called from zenflo
    fs.writeSync(3, '');
    isCalledFromZenflo = true;
} catch (err) {
    // fd 3 doesn't exist, we're being called directly from Claude Code extension
    isCalledFromZenflo = false;
}

// Track session IDs to prevent duplicate notifications
const capturedSessionIds = new Set();
let daemonNotified = false;
let sessionWatcher = null;

// Helper to get project path (same logic as zenflo)
function getProjectPath(workingDirectory) {
    const { join, resolve } = require('path');
    const { homedir } = require('os');
    
    // Resolve and convert to a filesystem-safe path (replace /, \, ., : with -)
    const projectId = resolve(workingDirectory).replace(/[\\\/\.:]/g, '-');
    
    // Get Claude config directory
    const claudeConfigDir = process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude');
    
    // Return project directory path
    return join(claudeConfigDir, 'projects', projectId);
}

// Helper to notify daemon about session (only once per session)
async function notifyDaemon(sessionId) {
    if (daemonNotified || capturedSessionIds.has(sessionId)) {
        return;
    }
    capturedSessionIds.add(sessionId);
    
    try {
        const { readFileSync } = require('fs');
        const { homedir } = require('os');
        
        // Read daemon state to get HTTP port
        const daemonStatePath = path.join(
            process.env.ZENFLO_HOME_DIR || path.join(homedir(), '.happy'),
            'daemon.state.json'
        );
        
        let daemonState;
        try {
            daemonState = JSON.parse(readFileSync(daemonStatePath, 'utf8'));
        } catch (err) {
            // Daemon not running or state file doesn't exist
            return;
        }
        
        if (!daemonState.httpPort) {
            return;
        }
        
        // Notify daemon about the session
        const metadata = {
            path: process.cwd(),
            host: require('os').hostname(),
            hostPid: process.pid,
            startedBy: 'claude-code-extension',
            flavor: 'claude'
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
        // Ignore errors - daemon might not be ready or not running
    }
}

// Helper to handle detected session
function handleSessionFile(sessionId) {
    if (capturedSessionIds.has(sessionId)) {
        return; // Already processed
    }
    capturedSessionIds.add(sessionId);

    // Emit UUID message on fd 3 for session detection (when called from zenflo)
    if (isCalledFromZenflo) {
        writeMessage({ type: 'uuid', value: sessionId });
    }

    // Notify daemon (when called directly)
    if (!isCalledFromZenflo) {
        notifyDaemon(sessionId).catch(() => {});
    }
}

// Helper to start session file watcher
function startSessionWatcher() {
    const { watch, mkdirSync } = require('fs');

    try {
        const cwd = process.cwd();
        const projectDir = getProjectPath(cwd);
        mkdirSync(projectDir, { recursive: true});

        debug('[launcher] Working directory:', cwd);
        debug('[launcher] Watching for sessions in:', projectDir);
        debug('[launcher] Called from zenflo:', isCalledFromZenflo);

        // Watch for MODIFIED session files only (not existing ones)
        // This ensures we only track sessions that are actively being used
        sessionWatcher = watch(projectDir, (eventType, filename) => {
            if (typeof filename === 'string' && filename.toLowerCase().endsWith('.jsonl')) {
                const sessionId = filename.replace('.jsonl', '');

                // Only handle 'change' events (file modifications), not 'rename' (file creation)
                // This prevents tracking empty session files that are created but never used
                if (eventType === 'change') {
                    debug('[launcher] Active session detected:', sessionId);
                    handleSessionFile(sessionId);
                }
            }
        });
    } catch (err) {
        console.error('[launcher] Error starting session watcher:', err.message);
    }
}

// Start watching for session files
// - When called directly (extension): notify daemon
// - When called from zenflo with native binary: emit UUID messages for session detection
// - When called from zenflo with JS module: UUID messages come from crypto interception
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
                // Don't notify daemon from UUID interceptor - let file watcher handle it
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
            // Don't notify daemon from UUID interceptor - let file watcher handle it
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
    
    // Parse URL for privacy
    let hostname = '';
    let pathname = '';
    try {
        const urlObj = new URL(url, 'http://localhost');
        hostname = urlObj.hostname;
        pathname = urlObj.pathname;
    } catch (e) {
        // If URL parsing fails, use defaults
        hostname = 'unknown';
        pathname = url;
    }
    
    // Send fetch start event
    writeMessage({
        type: 'fetch-start',
        id,
        hostname,
        path: pathname,
        method,
        timestamp: Date.now()
    });

    // Execute the original fetch immediately
    const fetchPromise = originalFetch(...args);
    
    // Attach handlers to send fetch end event
    const sendEnd = () => {
        writeMessage({
            type: 'fetch-end',
            id,
            timestamp: Date.now()
        });
    };
    
    // Send end event on both success and failure
    fetchPromise.then(sendEnd, sendEnd);
    
    // Return the original promise unchanged
    return fetchPromise;
};

// Preserve fetch properties
Object.defineProperty(global.fetch, 'name', { value: 'fetch' });
Object.defineProperty(global.fetch, 'length', { value: originalFetch.length });

// Get paths
const scriptDir = __dirname;
const cliDir = path.resolve(scriptDir, '..');
const zenfloBin = path.resolve(cliDir, 'bin', 'zenflo.mjs');
const claudeCodePath = path.resolve(cliDir, 'node_modules', '@anthropic-ai', 'claude-code', 'cli.js');
const claudeCodePathMonorepo = path.resolve(cliDir, '..', 'node_modules', '@anthropic-ai', 'claude-code', 'cli.js');

if (!isCalledFromZenflo) {
    // Called directly from Claude Code extension
    // Just ensure daemon is running, then load Claude Code directly
    // The file watcher will detect the session and notify daemon
    try {
        // Try to start zenflo daemon in background if not already running (non-blocking)
        const daemonProcess = spawn(process.execPath, [zenfloBin, 'daemon', 'start'], {
            detached: true,
            stdio: 'ignore'
        });
        daemonProcess.unref();
        // Give daemon a moment to start before we continue
        setTimeout(() => {}, 500);
    } catch (err) {
        // Ignore errors - daemon might already be running
    }
    // Continue to load Claude Code directly - this creates ONE session
    // The file watcher will detect it and notify daemon
}

// We're being called from zenflo (or fallback) - just load Claude Code with intercepts
// Use require for CommonJS compatibility since this is a .cjs file
try {
    // Check if native binary path was provided by extension wrapper
    const nativeBinary = process.env.CLAUDE_CODE_NATIVE_BINARY;

    // Debug logging to stderr (won't interfere with stdio)
    if (nativeBinary) {
        debug(`[launcher] Native binary path provided: ${nativeBinary}`);
        debug(`[launcher] File exists: ${fs.existsSync(nativeBinary)}`);
    } else {
        debug('[launcher] No CLAUDE_CODE_NATIVE_BINARY env var');
    }

    if (nativeBinary && fs.existsSync(nativeBinary)) {
        debug('[launcher] Spawning native binary...');
        debug('[launcher] Working directory:', process.cwd());
        // Native binary is a compiled executable, need to spawn it instead of require
        // Pass through all arguments, stdio, and working directory
        const child = spawn(nativeBinary, process.argv.slice(2), {
            stdio: 'inherit',
            cwd: process.cwd(), // Ensure native binary uses correct working directory
            env: process.env
        });

        // Forward all termination signals to child
        const killChild = () => {
            if (!child.killed) {
                debug('[launcher] Killing child process...');
                child.kill('SIGTERM');
                // Force kill after 1 second if not dead
                setTimeout(() => {
                    if (!child.killed) {
                        child.kill('SIGKILL');
                    }
                }, 1000);
            }
        };

        process.on('SIGTERM', killChild);
        process.on('SIGINT', killChild);
        process.on('exit', killChild); // Also kill on normal exit (e.g., abort signal)

        // Exit with child's exit code
        child.on('exit', (code, signal) => {
            if (signal) {
                process.kill(process.pid, signal);
            } else {
                process.exit(code || 0);
            }
        });
    } else if (fs.existsSync(claudeCodePath)) {
        debug('[launcher] Loading Claude Code from cli/node_modules');
        require(claudeCodePath);
    } else if (fs.existsSync(claudeCodePathMonorepo)) {
        // Try monorepo root node_modules (Yarn workspace hoisting)
        debug('[launcher] Loading Claude Code from monorepo node_modules');
        require(claudeCodePathMonorepo);
    } else {
        // Fallback: try to use the system claude command
        try {
            const claudePath = execSync('which claude', { encoding: 'utf8' }).trim();
            const resolvedPath = fs.realpathSync(claudePath);
            require(resolvedPath);
        } catch (whichErr) {
            console.error('Failed to find Claude Code CLI');
            console.error('Tried local path:', claudeCodePath);
            console.error('Tried monorepo path:', claudeCodePathMonorepo);
            console.error('Tried system claude command (not found)');
            console.error('Make sure @anthropic-ai/claude-code is installed in node_modules or claude is in PATH');
            process.exit(1);
        }
    }
} catch (err) {
    console.error('Failed to load Claude Code CLI:', err.message);
    console.error('Tried paths:', claudeCodePath, claudeCodePathMonorepo, process.env.CLAUDE_CODE_NATIVE_BINARY);
    process.exit(1);
}
