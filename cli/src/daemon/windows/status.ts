/**
 * Status checker for ZenFlo daemon on Windows
 *
 * Shows whether daemon is installed as Task Scheduler task or running via auto-start
 */

import { execSync } from 'child_process';
import { logger } from '@/ui/logger';
import chalk from 'chalk';
import { readDaemonState } from '@/persistence';

const TASK_NAME = 'ZenFlo Daemon';

export async function status(): Promise<void> {
    try {
        console.log(chalk.cyan.bold('🔍 ZenFlo Daemon Status\n'));

        // Check if task exists
        let isTaskInstalled = false;
        let taskStatus = 'Unknown';
        try {
            const output = execSync(`schtasks /Query /TN "${TASK_NAME}" /FO LIST /V`, { encoding: 'utf-8' });
            isTaskInstalled = true;

            // Parse task status
            const statusMatch = output.match(/Status:\s+(.+)/);
            if (statusMatch) {
                taskStatus = statusMatch[1].trim();
            }
        } catch (error) {
            isTaskInstalled = false;
        }

        // Check daemon state
        const daemonState = await readDaemonState();

        // Determine mode
        let mode: 'task' | 'autostart' | 'none';
        if (isTaskInstalled) {
            mode = 'task';
        } else if (daemonState?.pid) {
            mode = 'autostart';
        } else {
            mode = 'none';
        }

        // Display configuration
        console.log(chalk.white.bold('Configuration:'));
        if (mode === 'task') {
            console.log(chalk.green('  ✓ Task Scheduler: Installed'));
            console.log(chalk.dim(`    Task Status: ${taskStatus}`));
            console.log(chalk.dim('    Runs automatically at login'));
        } else {
            console.log(chalk.dim('  ○ Task Scheduler: Not installed'));
            console.log(chalk.dim('    Using auto-start mode (starts with zenflo command)'));
        }
        console.log('');

        // Display daemon status
        console.log(chalk.white.bold('Daemon Status:'));
        if (daemonState?.pid) {
            console.log(chalk.green('  ✓ Running'));
            console.log(chalk.dim(`    PID: ${daemonState.pid}`));
            if (daemonState.httpPort) {
                console.log(chalk.dim(`    Port: ${daemonState.httpPort}`));
            }
            if (daemonState.startTime) {
                const uptime = Math.floor((Date.now() - new Date(daemonState.startTime).getTime()) / 1000 / 60);
                console.log(chalk.dim(`    Uptime: ${uptime} minutes`));
            }
        } else {
            console.log(chalk.yellow('  ○ Not running'));
            console.log(chalk.dim('    Start with: zenflo'));
        }
        console.log('');

        // Display available commands
        console.log(chalk.white.bold('Available Commands:'));
        if (mode === 'task') {
            console.log(chalk.dim('  • View in Task Scheduler: ') + chalk.white('taskschd.msc'));
            console.log(chalk.dim('  • Stop task: ') + chalk.white(`schtasks /End /TN "${TASK_NAME}"`));
            console.log(chalk.dim('  • Start task: ') + chalk.white(`schtasks /Run /TN "${TASK_NAME}"`));
            console.log(chalk.dim('  • Uninstall: ') + chalk.white('zenflo daemon uninstall'));
        } else {
            console.log(chalk.dim('  • Install as task: ') + chalk.white('zenflo daemon install'));
            console.log(chalk.dim('  • Start daemon: ') + chalk.white('zenflo'));
        }
        console.log('');

    } catch (error) {
        console.error(chalk.red('❌ Status check failed:'), error instanceof Error ? error.message : error);
        logger.debug('Failed to check daemon status:', error);
        throw error;
    }
}
