import { uninstall as uninstallMac } from './mac/uninstall';
import { uninstall as uninstallWindows } from './windows/uninstall';
import { uninstall as uninstallLinux } from './linux/uninstall';

export async function uninstall(): Promise<void> {
    switch (process.platform) {
        case 'darwin':
            // No sudo required - LaunchAgent is in user directory
            await uninstallMac();
            break;

        case 'win32':
            // No admin required - Task Scheduler user tasks
            await uninstallWindows();
            break;

        case 'linux':
            // No sudo required - systemd user services
            await uninstallLinux();
            break;

        default:
            throw new Error(`Daemon uninstallation is not supported on platform: ${process.platform}`);
    }
}