import * as electronToolkitUtils from '@electron-toolkit/utils'

import electron from 'electron'
import { Conf as ElectronConf } from 'electron-conf'
import process from 'node:process'

import type { ISettings } from '../renderer/src/common/common'
import { isPackaged } from '../renderer/src/common/electron'

import { enableDisableFileCloseAndCloseAllMenuItems, enableDisableMainMenu } from './MainMenu'
import {
    checkForUpdates,
    downloadAndInstallUpdate,
    fileClosed,
    fileIssue,
    fileOpened,
    fileSelected,
    filesOpened,
    installUpdateAndRestart,
    loadSettings,
    MainWindow,
    resetAll,
    saveSettings
} from './MainWindow'
import { SplashScreenWindow } from './SplashScreenWindow'

// Electron store.

export interface IElectronConfState {
    x: number
    y: number
    width: number
    height: number
    isMaximized: boolean
    isFullScreen: boolean
}

interface IElectronConf {
    app: {
        files: {
            opened: string[]
            recent: string[]
            selected: string
        }
        state: IElectronConfState
    }
    settings: ISettings
}

export let electronConf: ElectronConf<IElectronConf>

// Allow only one instance of the editor.

if (!electron.app.requestSingleInstanceLock()) {
    electron.app.quit()
}

// Take over if another instance of the editor if started.

export let mainWindow: MainWindow | null = null

electron.app.on('second-instance', (_event, argv) => {
    if (mainWindow !== null) {
        if (mainWindow.isMinimized()) {
            mainWindow.restore()
        }

        mainWindow.focus()

        argv.shift() // Remove the first argument, which is the path to the editor.

        mainWindow.handleArguments(argv)
    }
})

// The app is ready, so finalise its initialisation.

electron.app
    .whenReady()
    .then(() => {
        // Set process.env.NODE_ENV to 'production' if we are not the default app.
        // Note: we do this because some packages rely on the value of process.env.NODE_ENV to determine whether they
        //       should run in development mode (default) or production mode.

        if (!process.defaultApp) {
            process.env.NODE_ENV = 'production'
        }

        // Initialise our Electron store.

        const workAreaSize = electron.screen.getPrimaryDisplay().workAreaSize
        const horizontalSpace = Math.round(workAreaSize.width / 13)
        const verticalSpace = Math.round(workAreaSize.height / 13)

        electronConf = new ElectronConf<IElectronConf>({
            defaults: {
                app: {
                    files: {
                        opened: [],
                        recent: [],
                        selected: ''
                    },
                    state: {
                        x: horizontalSpace,
                        y: verticalSpace,
                        width: workAreaSize.width - 2 * horizontalSpace,
                        height: workAreaSize.height - 2 * verticalSpace,
                        isMaximized: false,
                        isFullScreen: false
                    }
                },
                settings: {
                    general: {
                        checkForUpdatesAtStartup: true
                    }
                }
            }
        })

        // Create our splash window.

        const splashScreenWindow = new SplashScreenWindow()

        // Set our app user model id for Windows.

        electronToolkitUtils.electronApp.setAppUserModelId('org.celldl.editor')

        // Enable the F12 shortcut (to show/hide the developer tools) if we are not packaged.

        if (!isPackaged()) {
            electron.app.on('browser-window-created', (_event, window) => {
                electronToolkitUtils.optimizer.watchWindowShortcuts(window)
            })
        }

        // Handle some requests from our renderer process.

        electron.ipcMain.handle('check-for-updates', (_event, atStartup: boolean) => {
            checkForUpdates(atStartup)
        })
        electron.ipcMain.handle('download-and-install-update', () => {
            downloadAndInstallUpdate()
        })
        electron.ipcMain.handle('enable-disable-main-menu', (_event, enable: boolean) => {
            enableDisableMainMenu(enable)
        })
        electron.ipcMain.handle('enable-disable-file-close-and-close-all-menu-items', (_event, enable: boolean) => {
            enableDisableFileCloseAndCloseAllMenuItems(enable)
        })
        electron.ipcMain.handle('file-closed', (_event, filePath: string) => {
            fileClosed(filePath)
        })
        electron.ipcMain.handle('file-issue', (_event, filePath: string) => {
            fileIssue(filePath)
        })
        electron.ipcMain.handle('file-opened', (_event, filePath: string) => {
            fileOpened(filePath)
        })
        electron.ipcMain.handle('file-selected', (_event, filePath: string) => {
            fileSelected(filePath)
        })
        electron.ipcMain.handle('files-opened', (_event, filePaths: string[]) => {
            filesOpened(filePaths)
        })
        electron.ipcMain.handle('install-update-and-restart', () => {
            installUpdateAndRestart()
        })
        electron.ipcMain.handle('load-settings', (): ISettings => {
            return loadSettings()
        })
        electron.ipcMain.handle('reset-all', resetAll)
        electron.ipcMain.handle('save-settings', (_event, settings: ISettings) => {
            saveSettings(settings)
        })

        // Create our main window

        mainWindow = new MainWindow(process.argv, splashScreenWindow)
    })
    .catch((error: unknown) => {
        console.error('Failed to create the main window:', error)
    })
