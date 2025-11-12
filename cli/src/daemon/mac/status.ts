/**
 * Status check for ZenFlo daemon installation
 *
 * Shows whether daemon is running via LaunchAgent or auto-start,
 * and provides helpful information about the current setup.
 */

import { existsSync } from 'fs';
import { execSync } from 'child_process';
import os from 'os';
import path from 'path';
import chalk from 'chalk';
import { readDaemonState } from '@/persistence';

const PLIST_LABEL = 'com.zenflo.daemon';
const LAUNCH_AGENTS_DIR = path.join(os.homedir(), 'Library', 'LaunchAgents');
const PLIST_FILE = path.join(LAUNCH_AGENTS_DIR, `${PLIST_LABEL}.plist`);

export async function status(): Promise<void> {
    console.log(chalk.cyan.bold('📊 ZenFlo Daemon Status\n'));

    // Check if LaunchAgent is installed
    const isLaunchAgentInstalled = existsSync(PLIST_FILE);
    let isLaunchAgentLoaded = false;

    if (isLaunchAgentInstalled) {
        try {
            const output = execSync('launchctl list', { encoding: 'utf-8' });
            isLaunchAgentLoaded = output.includes(PLIST_LABEL);
        } catch (error) {
            // Ignore errors
        }
    }

    // Check if daemon is currently running
    const daemonState = await readDaemonState();
    const isDaemonRunning = daemonState !== null;

    // Determine mode
    let mode: 'launchagent' | 'autostart' | 'none';
    if (isLaunchAgentInstalled && isLaunchAgentLoaded) {
        mode = 'launchagent';
    } else if (isDaemonRunning) {
        mode = 'autostart';
    } else {
        mode = 'none';
    }

    // Display status
    if (mode === 'launchagent') {
        console.log(chalk.green('✅ LaunchAgent Mode') + chalk.dim(' (installed & loaded)\n'));
        console.log(chalk.cyan('Configuration:'));
        console.log(chalk.dim('  • Mode: ') + chalk.white('LaunchAgent'));
        console.log(chalk.dim('  • Location: ') + chalk.white(PLIST_FILE));
        console.log(chalk.dim('  • Auto-start: ') + chalk.green('Yes') + chalk.dim(' (at login)'));
        console.log(chalk.dim('  • System integration: ') + chalk.green('Enabled'));

        if (isDaemonRunning && daemonState) {
            console.log(chalk.dim('  • Status: ') + chalk.green('Running'));
            console.log(chalk.dim('  • PID: ') + chalk.white(daemonState.pid.toString()));
            console.log(chalk.dim('  • HTTP Port: ') + chalk.white(daemonState.httpPort.toString()));
            console.log(chalk.dim('  • Started: ') + chalk.white(daemonState.startTime));
            if (daemonState.lastHeartbeat) {
                console.log(chalk.dim('  • Last heartbeat: ') + chalk.white(daemonState.lastHeartbeat));
            }
        } else {
            console.log(chalk.dim('  • Status: ') + chalk.yellow('Not running'));
        }
    } else if (mode === 'autostart') {
        console.log(chalk.green('✅ Auto-Start Mode') + chalk.dim(' (default)\n'));
        console.log(chalk.cyan('Configuration:'));
        console.log(chalk.dim('  • Mode: ') + chalk.white('Auto-Start'));
        console.log(chalk.dim('  • Auto-start: ') + chalk.green('Yes') + chalk.dim(' (when running zenflo)'));
        console.log(chalk.dim('  • System integration: ') + chalk.yellow('Limited'));

        if (daemonState) {
            console.log(chalk.dim('  • Status: ') + chalk.green('Running'));
            console.log(chalk.dim('  • PID: ') + chalk.white(daemonState.pid.toString()));
            console.log(chalk.dim('  • HTTP Port: ') + chalk.white(daemonState.httpPort.toString()));
            console.log(chalk.dim('  • Started: ') + chalk.white(daemonState.startTime));
            if (daemonState.lastHeartbeat) {
                console.log(chalk.dim('  • Last heartbeat: ') + chalk.white(daemonState.lastHeartbeat));
            }
        }
    } else {
        console.log(chalk.yellow('⚠️  Daemon Not Running\n'));
        console.log(chalk.cyan('Configuration:'));
        console.log(chalk.dim('  • LaunchAgent: ') + chalk.red('Not installed'));
        console.log(chalk.dim('  • Daemon: ') + chalk.red('Not running'));
        console.log(chalk.dim('  • Mode: ') + chalk.white('Auto-Start') + chalk.dim(' (will start when you run zenflo)'));
    }

    console.log('\n' + chalk.cyan('Available Commands:'));
    if (mode === 'launchagent') {
        console.log(chalk.dim('  • Uninstall: ') + chalk.white('zenflo daemon uninstall'));
        console.log(chalk.dim('  • Stop daemon: ') + chalk.white('zenflo daemon stop'));
        console.log(chalk.dim('  • View logs: ') + chalk.white('tail -f ~/.zenflo/daemon.log'));
    } else if (mode === 'autostart') {
        console.log(chalk.dim('  • Install LaunchAgent: ') + chalk.white('zenflo daemon install'));
        console.log(chalk.dim('  • Stop daemon: ') + chalk.white('zenflo daemon stop'));
        console.log(chalk.dim('  • View logs: ') + chalk.white('tail -f ~/.zenflo/daemon.log'));
    } else {
        console.log(chalk.dim('  • Install LaunchAgent: ') + chalk.white('zenflo daemon install'));
        console.log(chalk.dim('  • Start daemon manually: ') + chalk.white('zenflo daemon start'));
        console.log(chalk.dim('  • Run ZenFlo: ') + chalk.white('zenflo'));
    }

    console.log('');
}
