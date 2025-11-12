/**
 * Uninstallation script for ZenFlo daemon systemd user service
 *
 * This removes the systemd service and stops the daemon if it's currently running.
 */

import { existsSync, unlinkSync } from 'fs';
import { execSync } from 'child_process';
import { logger } from '@/ui/logger';
import os from 'os';
import path from 'path';
import chalk from 'chalk';

const SERVICE_NAME = 'zenflo-daemon';
const SYSTEMD_USER_DIR = path.join(os.homedir(), '.config', 'systemd', 'user');
const SERVICE_FILE = path.join(SYSTEMD_USER_DIR, `${SERVICE_NAME}.service`);

export async function uninstall(): Promise<void> {
    try {
        console.log(chalk.cyan('🗑️  Uninstalling ZenFlo daemon systemd service...\n'));

        // Check if service file exists
        if (!existsSync(SERVICE_FILE)) {
            console.log(chalk.yellow('⚠️  Service not found. Nothing to uninstall.'));
            console.log(chalk.dim(`   Expected location: ${SERVICE_FILE}\n`));
            return;
        }

        // Stop the service
        try {
            execSync(`systemctl --user stop ${SERVICE_NAME}`, { stdio: 'pipe' });
            console.log(chalk.green('✅ Service stopped'));
        } catch (error) {
            // Service might not be running, continue with removal
            console.log(chalk.dim('   (Service was not running)'));
        }

        // Disable the service
        try {
            execSync(`systemctl --user disable ${SERVICE_NAME}`, { stdio: 'pipe' });
            console.log(chalk.green('✅ Service disabled'));
        } catch (error) {
            // Service might not be enabled, continue with removal
            console.log(chalk.dim('   (Service was not enabled)'));
        }

        // Remove the service file
        unlinkSync(SERVICE_FILE);
        console.log(chalk.green('✅ Removed service file\n'));

        // Reload systemd daemon
        try {
            execSync('systemctl --user daemon-reload', { stdio: 'pipe' });
            console.log(chalk.green('✅ Reloaded systemd configuration\n'));
        } catch (error) {
            // Not critical, continue
            console.log(chalk.dim('   (Could not reload systemd)\n'));
        }

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
