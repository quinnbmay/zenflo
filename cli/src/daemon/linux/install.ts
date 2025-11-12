/**
 * Installation script for ZenFlo daemon using systemd user service
 *
 * This installs the daemon as a user-level systemd service that:
 * - Runs automatically when you log in
 * - No sudo required (user services only)
 * - Provides system integration via systemd
 * - Restarts automatically if it crashes
 *
 * Usage:
 *   zenflo daemon install   - Install systemd service
 *   zenflo daemon uninstall - Remove systemd service
 *   zenflo daemon status    - Check installation status
 *
 * Note: Auto-start remains the default behavior. This is an optional
 * enhancement for users who want daemon running 24/7.
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { logger } from '@/ui/logger';
import { trimIdent } from '@/utils/trimIdent';
import os from 'os';
import path from 'path';
import chalk from 'chalk';
import { configuration } from '@/configuration';

const SERVICE_NAME = 'zenflo-daemon';
const SYSTEMD_USER_DIR = path.join(os.homedir(), '.config', 'systemd', 'user');
const SERVICE_FILE = path.join(SYSTEMD_USER_DIR, `${SERVICE_NAME}.service`);

export async function install(): Promise<void> {
    try {
        console.log(chalk.cyan('📦 Installing ZenFlo daemon as systemd user service...\n'));

        // Check if already installed
        if (existsSync(SERVICE_FILE)) {
            console.log(chalk.yellow('⚠️  Service already installed. Uninstalling first...\n'));
            try {
                execSync(`systemctl --user stop ${SERVICE_NAME}`, { stdio: 'pipe' });
                execSync(`systemctl --user disable ${SERVICE_NAME}`, { stdio: 'pipe' });
            } catch (error) {
                // Ignore errors - service might not be enabled/running
            }
        }

        // Ensure systemd user directory exists
        if (!existsSync(SYSTEMD_USER_DIR)) {
            mkdirSync(SYSTEMD_USER_DIR, { recursive: true });
        }

        // Get the path to zenflo binary
        let zenfloBinaryPath: string;
        try {
            zenfloBinaryPath = execSync('which zenflo', { encoding: 'utf-8' }).trim();
        } catch (error) {
            throw new Error('Could not find zenflo binary in PATH. Is ZenFlo installed?');
        }

        // Create service file content
        const serviceContent = trimIdent(`
            [Unit]
            Description=ZenFlo AI Coding Assistant Daemon
            After=network.target

            [Service]
            Type=simple
            ExecStart=${zenfloBinaryPath} daemon start-sync
            Restart=on-failure
            RestartSec=10
            StandardOutput=append:${configuration.zenfloHomeDir}/daemon.log
            StandardError=append:${configuration.zenfloHomeDir}/daemon.err
            WorkingDirectory=${os.homedir()}

            [Install]
            WantedBy=default.target
        `);

        // Write service file
        writeFileSync(SERVICE_FILE, serviceContent, { mode: 0o644 });
        console.log(chalk.green('✅ Created systemd service file'));
        console.log(chalk.dim(`   ${SERVICE_FILE}\n`));

        // Reload systemd daemon
        try {
            execSync('systemctl --user daemon-reload', { stdio: 'pipe' });
            console.log(chalk.green('✅ Reloaded systemd configuration'));
        } catch (error) {
            throw new Error(`Failed to reload systemd: ${error instanceof Error ? error.message : error}`);
        }

        // Enable the service (auto-start at login)
        try {
            execSync(`systemctl --user enable ${SERVICE_NAME}`, { stdio: 'pipe' });
            console.log(chalk.green('✅ Service enabled (auto-start at login)'));
        } catch (error) {
            throw new Error(`Failed to enable service: ${error instanceof Error ? error.message : error}`);
        }

        // Start the service now
        try {
            execSync(`systemctl --user start ${SERVICE_NAME}`, { stdio: 'pipe' });
            console.log(chalk.green('✅ Service started successfully\n'));
        } catch (error) {
            throw new Error(`Failed to start service: ${error instanceof Error ? error.message : error}`);
        }

        // Print success message
        console.log(chalk.green.bold('🎉 Installation complete!\n'));
        console.log(chalk.cyan('The daemon will now:'));
        console.log(chalk.dim('  • Start automatically when you log in'));
        console.log(chalk.dim('  • Run in the background 24/7'));
        console.log(chalk.dim('  • Restart automatically if it crashes\n'));

        console.log(chalk.cyan('Next steps:'));
        console.log(chalk.dim('  • Check status: ') + chalk.white('zenflo daemon status'));
        console.log(chalk.dim('  • View logs: ') + chalk.white(`tail -f ${configuration.zenfloHomeDir}/daemon.log`));
        console.log(chalk.dim('  • Uninstall: ') + chalk.white('zenflo daemon uninstall\n'));

        console.log(chalk.yellow('💡 Tip: systemd commands:'));
        console.log(chalk.dim('  • Check status: ') + chalk.white(`systemctl --user status ${SERVICE_NAME}`));
        console.log(chalk.dim('  • View logs: ') + chalk.white(`journalctl --user -u ${SERVICE_NAME} -f`));
        console.log(chalk.dim('  • Restart: ') + chalk.white(`systemctl --user restart ${SERVICE_NAME}\n`));

    } catch (error) {
        console.error(chalk.red('❌ Installation failed:'), error instanceof Error ? error.message : error);
        logger.debug('Failed to install daemon:', error);
        throw error;
    }
}
