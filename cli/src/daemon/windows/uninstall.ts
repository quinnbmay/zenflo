/**
 * Uninstallation script for ZenFlo daemon Windows Task Scheduler task
 *
 * This removes the scheduled task and stops the daemon if it's currently running.
 */

import { execSync } from 'child_process';
import { logger } from '@/ui/logger';
import chalk from 'chalk';

const TASK_NAME = 'ZenFlo Daemon';

export async function uninstall(): Promise<void> {
    try {
        console.log(chalk.cyan('🗑️  Uninstalling ZenFlo daemon scheduled task...\n'));

        // Check if task exists
        try {
            execSync(`schtasks /Query /TN "${TASK_NAME}"`, { stdio: 'pipe' });
        } catch (error) {
            console.log(chalk.yellow('⚠️  Scheduled task not found. Nothing to uninstall.\n'));
            return;
        }

        // Stop the task if it's running
        try {
            execSync(`schtasks /End /TN "${TASK_NAME}"`, { stdio: 'pipe' });
            console.log(chalk.green('✅ Task stopped'));
        } catch (error) {
            // Task might not be running, continue with removal
            console.log(chalk.dim('   (Task was not running)\n'));
        }

        // Delete the task
        try {
            execSync(`schtasks /Delete /TN "${TASK_NAME}" /F`, { stdio: 'pipe' });
            console.log(chalk.green('✅ Scheduled task removed\n'));
        } catch (error) {
            throw new Error(`Failed to delete scheduled task: ${error instanceof Error ? error.message : error}`);
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
