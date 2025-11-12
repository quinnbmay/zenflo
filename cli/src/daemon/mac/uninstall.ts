/**
 * Uninstallation script for ZenFlo daemon LaunchAgent
 *
 * This removes the LaunchAgent from ~/Library/LaunchAgents and
 * stops the daemon if it's currently running.
 */

import { existsSync, unlinkSync } from 'fs';
import { execSync } from 'child_process';
import { logger } from '@/ui/logger';
import os from 'os';
import path from 'path';
import chalk from 'chalk';

const PLIST_LABEL = 'com.zenflo.daemon';
const LAUNCH_AGENTS_DIR = path.join(os.homedir(), 'Library', 'LaunchAgents');
const PLIST_FILE = path.join(LAUNCH_AGENTS_DIR, `${PLIST_LABEL}.plist`);

export async function uninstall(): Promise<void> {
    try {
        console.log(chalk.cyan('🗑️  Uninstalling ZenFlo daemon LaunchAgent...\n'));

        // Check if plist exists
        if (!existsSync(PLIST_FILE)) {
            console.log(chalk.yellow('⚠️  LaunchAgent not found. Nothing to uninstall.'));
            console.log(chalk.dim(`   Expected location: ${PLIST_FILE}\n`));
            return;
        }

        // Unload the daemon
        try {
            execSync(`launchctl unload "${PLIST_FILE}"`, { stdio: 'pipe' });
            console.log(chalk.green('✅ LaunchAgent unloaded'));
        } catch (error) {
            // Daemon might not be loaded, continue with removal
            console.log(chalk.dim('   (LaunchAgent was not loaded)\n'));
        }

        // Remove the plist file
        unlinkSync(PLIST_FILE);
        console.log(chalk.green('✅ Removed LaunchAgent plist\n'));

        console.log(chalk.green.bold('🎉 Uninstallation complete!\n'));
        console.log(chalk.cyan('The daemon will no longer:'));
        console.log(chalk.dim('  • Start automatically at login'));
        console.log(chalk.dim('  • Run in the background\n'));

        console.log(chalk.cyan('Note: ') + chalk.dim('Auto-start will still work when you run ') + chalk.white('zenflo\n'));

    } catch (error) {
        console.error(chalk.red('❌ Uninstallation failed:'), error instanceof Error ? error.message : error);
        logger.debug('Failed to uninstall daemon:', error);
        throw error;
    }
}