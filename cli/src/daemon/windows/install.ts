/**
 * Installation script for ZenFlo daemon using Windows Task Scheduler
 *
 * This installs the daemon as a user-level scheduled task that:
 * - Runs automatically when you log in
 * - No admin rights required (user tasks only)
 * - Provides system integration via Task Scheduler
 * - Restarts automatically if it crashes
 *
 * Usage:
 *   zenflo daemon install   - Install scheduled task
 *   zenflo daemon uninstall - Remove scheduled task
 *   zenflo daemon status    - Check installation status
 *
 * Note: Auto-start remains the default behavior. This is an optional
 * enhancement for users who want daemon running 24/7.
 */

import { execSync } from 'child_process';
import { logger } from '@/ui/logger';
import { trimIdent } from '@/utils/trimIdent';
import chalk from 'chalk';
import { configuration } from '@/configuration';
import path from 'path';
import { writeFileSync, existsSync } from 'fs';
import os from 'os';

const TASK_NAME = 'ZenFlo Daemon';

export async function install(): Promise<void> {
    try {
        console.log(chalk.cyan('📦 Installing ZenFlo daemon as Windows Task Scheduler task...\n'));

        // Check if already installed
        try {
            execSync(`schtasks /Query /TN "${TASK_NAME}"`, { stdio: 'pipe' });
            console.log(chalk.yellow('⚠️  Task already installed. Uninstalling first...\n'));
            try {
                execSync(`schtasks /Delete /TN "${TASK_NAME}" /F`, { stdio: 'pipe' });
            } catch (error) {
                // Ignore errors - task might not exist
            }
        } catch (error) {
            // Task doesn't exist, continue with installation
        }

        // Get the path to zenflo binary
        let zenfloBinaryPath: string;
        try {
            zenfloBinaryPath = execSync('where zenflo', { encoding: 'utf-8' }).trim().split('\n')[0];
        } catch (error) {
            throw new Error('Could not find zenflo binary in PATH. Is ZenFlo installed?');
        }

        // Get node.exe path
        let nodePath: string;
        try {
            nodePath = execSync('where node', { encoding: 'utf-8' }).trim().split('\n')[0];
        } catch (error) {
            throw new Error('Could not find node.exe in PATH. Is Node.js installed?');
        }

        // Create XML file for task definition
        const xmlPath = path.join(configuration.zenfloHomeDir, 'daemon-task.xml');
        const xmlContent = trimIdent(`
            <?xml version="1.0" encoding="UTF-16"?>
            <Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
              <RegistrationInfo>
                <Date>2025-01-01T00:00:00</Date>
                <Author>${os.userInfo().username}</Author>
                <Description>ZenFlo AI coding assistant daemon service</Description>
              </RegistrationInfo>
              <Triggers>
                <LogonTrigger>
                  <Enabled>true</Enabled>
                  <UserId>${os.userInfo().username}</UserId>
                </LogonTrigger>
              </Triggers>
              <Principals>
                <Principal id="Author">
                  <UserId>${os.userInfo().username}</UserId>
                  <LogonType>InteractiveToken</LogonType>
                  <RunLevel>LeastPrivilege</RunLevel>
                </Principal>
              </Principals>
              <Settings>
                <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
                <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
                <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
                <AllowHardTerminate>true</AllowHardTerminate>
                <StartWhenAvailable>true</StartWhenAvailable>
                <RunOnlyIfNetworkAvailable>false</RunOnlyIfNetworkAvailable>
                <IdleSettings>
                  <StopOnIdleEnd>false</StopOnIdleEnd>
                  <RestartOnIdle>false</RestartOnIdle>
                </IdleSettings>
                <AllowStartOnDemand>true</AllowStartOnDemand>
                <Enabled>true</Enabled>
                <Hidden>false</Hidden>
                <RunOnlyIfIdle>false</RunOnlyIfIdle>
                <WakeToRun>false</WakeToRun>
                <ExecutionTimeLimit>PT0S</ExecutionTimeLimit>
                <Priority>7</Priority>
                <RestartOnFailure>
                  <Interval>PT1M</Interval>
                  <Count>3</Count>
                </RestartOnFailure>
              </Settings>
              <Actions Context="Author">
                <Exec>
                  <Command>"${nodePath}"</Command>
                  <Arguments>"${zenfloBinaryPath}" daemon start-sync</Arguments>
                  <WorkingDirectory>${os.homedir()}</WorkingDirectory>
                </Exec>
              </Actions>
            </Task>
        `);

        // Write XML file
        writeFileSync(xmlPath, xmlContent, { encoding: 'utf-16le' });
        console.log(chalk.green('✅ Created task definition XML'));
        console.log(chalk.dim(`   ${xmlPath}\n`));

        // Create the task
        try {
            execSync(`schtasks /Create /XML "${xmlPath}" /TN "${TASK_NAME}"`, { stdio: 'pipe' });
            console.log(chalk.green('✅ Task created successfully\n'));
        } catch (error) {
            throw new Error(`Failed to create scheduled task: ${error instanceof Error ? error.message : error}`);
        }

        // Run the task immediately
        try {
            execSync(`schtasks /Run /TN "${TASK_NAME}"`, { stdio: 'pipe' });
            console.log(chalk.green('✅ Task started successfully\n'));
        } catch (error) {
            console.log(chalk.yellow('⚠️  Could not start task immediately (will start at next login)\n'));
        }

        // Print success message
        console.log(chalk.green.bold('🎉 Installation complete!\n'));
        console.log(chalk.cyan('The daemon will now:'));
        console.log(chalk.dim('  • Start automatically when you log in'));
        console.log(chalk.dim('  • Run in the background 24/7'));
        console.log(chalk.dim('  • Restart automatically if it crashes (up to 3 times)\n'));

        console.log(chalk.cyan('Next steps:'));
        console.log(chalk.dim('  • Check status: ') + chalk.white('zenflo daemon status'));
        console.log(chalk.dim('  • View logs: ') + chalk.white(`type ${configuration.zenfloHomeDir}\\daemon.log`));
        console.log(chalk.dim('  • Uninstall: ') + chalk.white('zenflo daemon uninstall\n'));

        console.log(chalk.yellow('💡 Tip: View task in Task Scheduler:'));
        console.log(chalk.dim('  1. Press Win+R and type: taskschd.msc'));
        console.log(chalk.dim('  2. Find "ZenFlo Daemon" in Task Scheduler Library'));
        console.log(chalk.dim('  3. View history, logs, and configuration\n'));

    } catch (error) {
        console.error(chalk.red('❌ Installation failed:'), error instanceof Error ? error.message : error);
        logger.debug('Failed to install daemon:', error);
        throw error;
    }
}
