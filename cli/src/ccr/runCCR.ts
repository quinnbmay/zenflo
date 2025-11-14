import { Credentials } from '@/persistence';
import { StartOptions, runClaude } from '@/claude/runClaude';
import { logger } from '@/ui/logger';
import { execSync } from 'node:child_process';

/**
 * Run Claude Code through Claude Code Router (CCR) with Z.ai GLM
 * This provides an alternative AI model option in ZenFlo
 */
export async function runCCR(opts: {
    credentials: Credentials;
    startedBy?: 'daemon' | 'terminal';
}): Promise<void> {
    // Log startup
    logger.debug(`[ccr] Starting CCR mode with options: startedBy=${opts.startedBy || 'terminal'}`);

    // Check if CCR is installed
    try {
        execSync('which ccr', { stdio: 'pipe' });
    } catch (err) {
        console.error('❌ Claude Code Router (ccr) not found!');
        console.error('');
        console.error('Please install CCR first:');
        console.error('  npm install -g @musistudio/claude-code-router');
        console.error('');
        console.error('Or configure the local installation at:');
        console.error('  /Users/quinnmay/claude-code-router');
        process.exit(1);
    }

    // Check if CCR is running, start if needed
    try {
        const status = execSync('ccr status', { encoding: 'utf8', stdio: 'pipe' });
        if (!status.includes('Running')) {
            logger.debug('[ccr] Starting CCR service...');
            console.log('🚀 Starting Claude Code Router...');
            execSync('ccr start', { stdio: 'inherit' });

            // Wait for CCR to be ready
            const startTime = Date.now();
            const maxWait = 10000; // 10 seconds
            while (Date.now() - startTime < maxWait) {
                try {
                    const check = execSync('ccr status', { encoding: 'utf8', stdio: 'pipe' });
                    if (check.includes('Running')) {
                        logger.debug('[ccr] CCR service started successfully');
                        console.log('✅ Claude Code Router is ready');
                        break;
                    }
                } catch (e) {
                    // Keep waiting
                }
                // Sleep for 100ms
                execSync('sleep 0.1', { stdio: 'ignore' });
            }
        } else {
            logger.debug('[ccr] CCR service is already running');
        }
    } catch (err) {
        console.error('❌ Failed to start CCR service');
        console.error('Error:', err instanceof Error ? err.message : String(err));
        process.exit(1);
    }

    // Set environment variables to route through CCR
    const claudeEnvVars = {
        ANTHROPIC_BASE_URL: 'http://localhost:3456',
        ANTHROPIC_API_KEY: 'ccr-proxy-key', // Any value works - CCR handles auth
    };

    logger.debug('[ccr] Environment configured:');
    logger.debug(`[ccr]   ANTHROPIC_BASE_URL=${claudeEnvVars.ANTHROPIC_BASE_URL}`);
    logger.debug('[ccr]   ANTHROPIC_API_KEY=ccr-proxy-key (placeholder)');

    // Build start options with CCR environment
    const startOptions: StartOptions = {
        claudeEnvVars,
        startedBy: opts.startedBy,
        flavor: 'ccr', // Mark this session as CCR flavor
    };

    // Run Claude Code with CCR routing
    logger.debug('[ccr] Launching Claude Code with CCR routing...');
    console.log('🎯 Launching Claude Code with Z.ai GLM via CCR...');

    await runClaude(opts.credentials, startOptions);
}
