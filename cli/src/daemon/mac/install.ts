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

import { writeFileSync, mkdirSync, existsSync, copyFileSync } from 'fs';
import { execSync } from 'child_process';
import { logger } from '@/ui/logger';
import { trimIdent } from '@/utils/trimIdent';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { configuration } from '@/configuration';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PLIST_LABEL = 'com.zenflo.daemon';
const LAUNCH_AGENTS_DIR = path.join(os.homedir(), 'Library', 'LaunchAgents');
const PLIST_FILE = path.join(LAUNCH_AGENTS_DIR, `${PLIST_LABEL}.plist`);
const APP_BUNDLE_DIR = path.join(os.homedir(), 'Library', 'Application Support', 'ZenFlo');
const APP_BUNDLE_PATH = path.join(APP_BUNDLE_DIR, 'ZenFlo Daemon.app');

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

        // Create app bundle for proper icon display
        console.log(chalk.cyan('Creating app bundle with ZenFlo icon...'));

        // Create app bundle structure
        const contentsDir = path.join(APP_BUNDLE_PATH, 'Contents');
        const macosDir = path.join(contentsDir, 'MacOS');
        const resourcesDir = path.join(contentsDir, 'Resources');

        mkdirSync(macosDir, { recursive: true });
        mkdirSync(resourcesDir, { recursive: true });

        // Find and copy icon (try multiple strategies, prioritize Icon Exports)
        const possibleIconPaths = [
            // PRIMARY: Icon Exports directory (user's actual branding)
            '/Users/quinnmay/developer/zenflo/Icon Exports/ZenFlo.icns',
            path.join(process.cwd(), 'Icon Exports', 'ZenFlo.icns'),
            path.join(__dirname, '..', '..', '..', 'Icon Exports', 'ZenFlo.icns'),
            // Fallback: Tauri icons (old location)
            '/Users/quinnmay/developer/zenflo/mobile/src-tauri/icons/icon.icns',
            '/Users/quinnmay/developer/zenflo/webapp/src-tauri/icons/icon.icns',
            path.join(process.cwd(), 'mobile', 'src-tauri', 'icons', 'icon.icns'),
            path.join(process.cwd(), 'webapp', 'src-tauri', 'icons', 'icon.icns'),
            path.join(__dirname, '..', '..', '..', 'mobile', 'src-tauri', 'icons', 'icon.icns'),
            path.join(__dirname, '..', '..', '..', 'webapp', 'src-tauri', 'icons', 'icon.icns'),
        ];

        let iconCopied = false;
        for (const iconPath of possibleIconPaths) {
            if (existsSync(iconPath)) {
                copyFileSync(iconPath, path.join(resourcesDir, 'AppIcon.icns'));
                console.log(chalk.green('✅ Copied ZenFlo icon'));
                console.log(chalk.dim(`   Source: ${iconPath}`));
                iconCopied = true;
                break;
            }
        }

        if (!iconCopied) {
            console.log(chalk.yellow('⚠️  Could not find icon.icns (will use default icon)'));
        }

        // Force macOS to refresh icon cache
        try {
            // Touch the app bundle to invalidate cache
            execSync(`touch "${APP_BUNDLE_PATH}"`);
            // Reset icon services cache
            execSync('killall Dock 2>/dev/null || true', { stdio: 'pipe' });
            execSync('killall Finder 2>/dev/null || true', { stdio: 'pipe' });
            console.log(chalk.green('✅ Refreshed icon cache\n'));
        } catch (error) {
            // Not critical, continue
            console.log(chalk.dim('   (Icon cache refresh skipped)\n'));
        }

        // Create Info.plist for app bundle
        const infoPlistContent = trimIdent(`
            <?xml version="1.0" encoding="UTF-8"?>
            <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
            <plist version="1.0">
            <dict>
                <key>CFBundleExecutable</key>
                <string>zenflo-daemon</string>
                <key>CFBundleIconFile</key>
                <string>AppIcon.icns</string>
                <key>CFBundleIdentifier</key>
                <string>com.zenflo.daemon</string>
                <key>CFBundleName</key>
                <string>ZenFlo Daemon</string>
                <key>CFBundlePackageType</key>
                <string>APPL</string>
                <key>CFBundleShortVersionString</key>
                <string>1.0.0</string>
                <key>LSBackgroundOnly</key>
                <true/>
                <key>LSUIElement</key>
                <true/>
            </dict>
            </plist>
        `);

        writeFileSync(path.join(contentsDir, 'Info.plist'), infoPlistContent);
        console.log(chalk.green('✅ Created app bundle Info.plist'));

        // Get absolute paths for wrapper script (resolves symlinks)
        let nodePath: string;
        let zenfloScriptPath: string;

        try {
            nodePath = execSync('which node', { encoding: 'utf-8' }).trim();
        } catch (error) {
            throw new Error('Could not find node binary in PATH. Is Node.js installed?');
        }

        try {
            // Follow symlink chain to get absolute path
            const symlinkTarget = execSync(`readlink "${zenfloBinaryPath}"`, { encoding: 'utf-8' }).trim();
            const symlinkDir = path.dirname(zenfloBinaryPath);
            // Resolve relative symlink to absolute path
            zenfloScriptPath = path.resolve(symlinkDir, symlinkTarget);
        } catch (error) {
            // Not a symlink, use as-is
            zenfloScriptPath = zenfloBinaryPath;
        }

        // Create wrapper script with absolute paths (critical for LaunchAgent)
        const wrapperScript = trimIdent(`
            #!/bin/bash
            # Use absolute paths to avoid issues when launched from / by LaunchAgent
            exec "${nodePath}" "${zenfloScriptPath}" daemon start-sync
        `);

        const wrapperPath = path.join(macosDir, 'zenflo-daemon');
        writeFileSync(wrapperPath, wrapperScript, { mode: 0o755 });
        console.log(chalk.green('✅ Created launcher script\n'));

        // Create plist content (launches app bundle using open for proper icon display)
        const plistContent = trimIdent(`
            <?xml version="1.0" encoding="UTF-8"?>
            <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
            <plist version="1.0">
            <dict>
                <key>Label</key>
                <string>${PLIST_LABEL}</string>

                <key>ProgramArguments</key>
                <array>
                    <string>/usr/bin/open</string>
                    <string>-a</string>
                    <string>${APP_BUNDLE_PATH}</string>
                    <string>--background</string>
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
        console.log(chalk.dim('  • Restart automatically if it crashes'));
        console.log(chalk.dim('  • Display with ZenFlo branding in Activity Monitor\n'));

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