/**
 * Status checker for ZenFlo daemon on Linux
 *
 * Shows whether daemon is installed as systemd service or running via auto-start
 */

import { existsSync } from 'fs';
import { execSync } from 'child_process';
import { logger } from '@/ui/logger';
import os from 'os';
import path from 'path';
import chalk from 'chalk';
import { readDaemonState } from '@/persistence';

const SERVICE_NAME = 'zenflo-daemon';
const SYSTEMD_USER_DIR = path.join(os.homedir(), '.config', 'systemd', 'user');
const SERVICE_FILE = path.join(SYSTEMD_USER_DIR, `${SERVICE_NAME}.service`);

export async function status(): Promise<void> {
    try {
        console.log(chalk.cyan.bold('🔍 ZenFlo Daemon Status\n'));

        // Check if service is installed
        const isServiceInstalled = existsSync(SERVICE_FILE);

        // Get service status if installed
        let serviceStatus = 'Unknown';
        let isServiceRunning = false;
        if (isServiceInstalled) {
            try {
                const output = execSync(`systemctl --user is-active ${SERVICE_NAME}`, {
                    encoding: 'utf-8',
                    stdio: 'pipe'
                }).trim();
                serviceStatus = output;
                isServiceRunning = output === 'active';
            } catch (error) {
                serviceStatus = 'inactive';
            }
        }

        // Check daemon state
        const daemonState = await readDaemonState();

        // Determine mode
        let mode: 'systemd' | 'autostart' | 'none';
        if (isServiceInstalled) {
            mode = 'systemd';
        } else if (daemonState?.pid) {
            mode = 'autostart';
        } else {
            mode = 'none';
        }

        // Display configuration
        console.log(chalk.white.bold('Configuration:'));
        if (mode === 'systemd') {
            console.log(chalk.green('  ✓ systemd Service: Installed'));
            console.log(chalk.dim(`    Service Status: ${serviceStatus}`));
            console.log(chalk.dim('    Runs automatically at login'));
        } else {
            console.log(chalk.dim('  ○ systemd Service: Not installed'));
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
        if (mode === 'systemd') {
            console.log(chalk.dim('  • Check service: ') + chalk.white(`systemctl --user status ${SERVICE_NAME}`));
            console.log(chalk.dim('  • View logs: ') + chalk.white(`journalctl --user -u ${SERVICE_NAME} -f`));
            console.log(chalk.dim('  • Stop service: ') + chalk.white(`systemctl --user stop ${SERVICE_NAME}`));
            console.log(chalk.dim('  • Start service: ') + chalk.white(`systemctl --user start ${SERVICE_NAME}`));
            console.log(chalk.dim('  • Restart: ') + chalk.white(`systemctl --user restart ${SERVICE_NAME}`));
            console.log(chalk.dim('  • Uninstall: ') + chalk.white('zenflo daemon uninstall'));
        } else {
            console.log(chalk.dim('  • Install as service: ') + chalk.white('zenflo daemon install'));
            console.log(chalk.dim('  • Start daemon: ') + chalk.white('zenflo'));
        }
        console.log('');

    } catch (error) {
        console.error(chalk.red('❌ Status check failed:'), error instanceof Error ? error.message : error);
        logger.debug('Failed to check daemon status:', error);
        throw error;
    }
}
