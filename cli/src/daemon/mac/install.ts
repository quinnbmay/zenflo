/**
 * Installation script for ZenFlo daemon using macOS LaunchAgent
 *
 * This installs the daemon as a user-level LaunchAgent that:
 * - Runs automatically when you log in
 * - No sudo required (installs to ~/Library/LaunchAgents)
 * - Can be granted Full Disk Access in System Settings
 * - Provides better system integration than auto-start
 *
 * Usage:
 *   zenflo daemon install   - Install LaunchAgent
 *   zenflo daemon uninstall - Remove LaunchAgent
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

const PLIST_LABEL = 'com.zenflo.daemon';
const LAUNCH_AGENTS_DIR = path.join(os.homedir(), 'Library', 'LaunchAgents');
const PLIST_FILE = path.join(LAUNCH_AGENTS_DIR, `${PLIST_LABEL}.plist`);

export async function install(): Promise<void> {
    try {
        console.log(chalk.cyan('📦 Installing ZenFlo daemon as LaunchAgent...\n'));

        // Check if already installed
        if (existsSync(PLIST_FILE)) {
            console.log(chalk.yellow('⚠️  LaunchAgent already installed. Uninstalling first...\n'));
            try {
                execSync(`launchctl unload "${PLIST_FILE}"`, { stdio: 'pipe' });
            } catch (error) {
                // Ignore errors - plist might not be loaded
            }
        }

        // Ensure LaunchAgents directory exists
        if (!existsSync(LAUNCH_AGENTS_DIR)) {
            mkdirSync(LAUNCH_AGENTS_DIR, { recursive: true });
        }

        // Get the path to zenflo binary (the symlink in PATH)
        let zenfloBinaryPath: string;
        try {
            zenfloBinaryPath = execSync('which zenflo', { encoding: 'utf-8' }).trim();
        } catch (error) {
            throw new Error('Could not find zenflo binary in PATH. Is ZenFlo installed?');
        }

        // Create plist content
        const plistContent = trimIdent(`
            <?xml version="1.0" encoding="UTF-8"?>
            <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
            <plist version="1.0">
            <dict>
                <key>Label</key>
                <string>${PLIST_LABEL}</string>

                <key>ProgramArguments</key>
                <array>
                    <string>${zenfloBinaryPath}</string>
                    <string>daemon</string>
                    <string>start-sync</string>
                </array>

                <key>RunAtLoad</key>
                <true/>

                <key>KeepAlive</key>
                <dict>
                    <key>SuccessfulExit</key>
                    <false/>
                </dict>

                <key>StandardErrorPath</key>
                <string>${configuration.zenfloHomeDir}/daemon.err</string>

                <key>StandardOutPath</key>
                <string>${configuration.zenfloHomeDir}/daemon.log</string>

                <key>WorkingDirectory</key>
                <string>${os.homedir()}</string>

                <key>ProcessType</key>
                <string>Background</string>

                <key>ThrottleInterval</key>
                <integer>10</integer>
            </dict>
            </plist>
        `);

        // Write plist file
        writeFileSync(PLIST_FILE, plistContent, { mode: 0o644 });
        console.log(chalk.green('✅ Created LaunchAgent plist'));
        console.log(chalk.dim(`   ${PLIST_FILE}\n`));

        // Load the daemon
        try {
            execSync(`launchctl load "${PLIST_FILE}"`, { stdio: 'pipe' });
            console.log(chalk.green('✅ LaunchAgent loaded successfully\n'));
        } catch (error) {
            throw new Error(`Failed to load LaunchAgent: ${error instanceof Error ? error.message : error}`);
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

        console.log(chalk.yellow('💡 Tip: To grant Full Disk Access:'));
        console.log(chalk.dim('  1. Open System Settings → Privacy & Security → Full Disk Access'));
        console.log(chalk.dim('  2. Click the + button'));
        console.log(chalk.dim('  3. Navigate to: ') + chalk.white(zenfloBinaryPath));
        console.log(chalk.dim('  4. Enable the toggle\n'));

    } catch (error) {
        console.error(chalk.red('❌ Installation failed:'), error instanceof Error ? error.message : error);
        logger.debug('Failed to install daemon:', error);
        throw error;
    }
}