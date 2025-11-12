import { install as installMac } from './mac/install';
import { install as installWindows } from './windows/install';
import { install as installLinux } from './linux/install';

export async function install(): Promise<void> {
    switch (process.platform) {
        case 'darwin':
            // No sudo required - LaunchAgent installs to user directory
            await installMac();
            break;

        case 'win32':
            // No admin required - Task Scheduler user tasks
            await installWindows();
            break;

        case 'linux':
            // No sudo required - systemd user services
            await installLinux();
            break;

        default:
            throw new Error(`Daemon installation is not supported on platform: ${process.platform}`);
    }
}