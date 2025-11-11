/**
 * Global configuration for ZenFlo CLI
 * 
 * Centralizes all configuration including environment variables and paths
 * Environment files should be loaded using Node's --env-file flag
 */

import { existsSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import packageJson from '../package.json'

class Configuration {
  public readonly serverUrl: string
  public readonly webappUrl: string
  public readonly isDaemonProcess: boolean

  // Directories and paths (from persistence)
  public readonly zenfloHomeDir: string
  public readonly logsDir: string
  public readonly settingsFile: string
  public readonly privateKeyFile: string
  public readonly daemonStateFile: string
  public readonly daemonLockFile: string
  public readonly currentCliVersion: string

  public readonly isExperimentalEnabled: boolean
  public readonly disableCaffeinate: boolean

  constructor() {
    // Server configuration - priority: parameter > environment > default
    this.serverUrl = process.env.ZENFLO_SERVER_URL || 'https://zenflo.combinedmemory.com'
    this.webappUrl = process.env.ZENFLO_WEBAPP_URL || 'https://app.combinedmemory.com'

    // Check if we're running as daemon based on process args
    const args = process.argv.slice(2)
    this.isDaemonProcess = args.length >= 2 && args[0] === 'daemon' && (args[1] === 'start-sync')

    // Directory configuration
    if (process.env.ZENFLO_HOME_DIR) {
      // Expand ~ to home directory if present
      const expandedPath = process.env.ZENFLO_HOME_DIR.replace(/^~/, homedir())
      this.zenfloHomeDir = expandedPath
    } else {
      this.zenfloHomeDir = join(homedir(), '.zenflo')
    }

    this.logsDir = join(this.zenfloHomeDir, 'logs')
    this.settingsFile = join(this.zenfloHomeDir, 'settings.json')
    this.privateKeyFile = join(this.zenfloHomeDir, 'access.key')
    this.daemonStateFile = join(this.zenfloHomeDir, 'daemon.state.json')
    this.daemonLockFile = join(this.zenfloHomeDir, 'daemon.state.json.lock')

    this.isExperimentalEnabled = ['true', '1', 'yes'].includes(process.env.ZENFLO_EXPERIMENTAL?.toLowerCase() || '');
    this.disableCaffeinate = ['true', '1', 'yes'].includes(process.env.ZENFLO_DISABLE_CAFFEINATE?.toLowerCase() || '');

    this.currentCliVersion = packageJson.version

    if (!existsSync(this.zenfloHomeDir)) {
      mkdirSync(this.zenfloHomeDir, { recursive: true })
    }
    // Ensure directories exist
    if (!existsSync(this.logsDir)) {
      mkdirSync(this.logsDir, { recursive: true })
    }
  }
}

export const configuration: Configuration = new Configuration()
