import electron from 'electron'
import { autoUpdater, type ProgressInfo, type UpdateCheckResult } from 'electron-updater'
import path from 'node:path'
import process from 'node:process'

import type { ISettings } from '../renderer/src/common/common'
import { LONG_DELAY, SHORT_DELAY } from '../renderer/src/common/constants'
import { isDevMode, isLinux, isMacOs, isPackaged, isWindows } from '../renderer/src/common/electron'

import icon from './assets/icon.png?asset'
import { ApplicationWindow } from './ApplicationWindow'
import { electronConf, type IElectronConfState } from './index'
import { enableDisableMainMenu, updateReopenMenu } from './MainMenu'
import type { SplashScreenWindow } from './SplashScreenWindow'

autoUpdater.autoDownload = false
autoUpdater.logger = null

export function checkForUpdates(atStartup: boolean): void {
    // Check for updates, if requested and if the editor is packaged.

    if (isPackaged() && electronConf.get('settings.general.checkForUpdatesAtStartup')) {
        autoUpdater
            .checkForUpdates()
            .then((result: UpdateCheckResult | null) => {
                const updateAvailable = result?.isUpdateAvailable ?? false

                if (updateAvailable) {
                    MainWindow.instance?.webContents.send('update-available', result?.updateInfo.version)
                } else if (!atStartup) {
                    MainWindow.instance?.webContents.send('update-not-available')
                }
            })
            .catch((error: unknown) => {
                MainWindow.instance?.webContents.send(
                    'update-check-error',
                    error instanceof Error ? error.message : String(error)
                )
            })
    }
}

autoUpdater.on('download-progress', (info: ProgressInfo) => {
    MainWindow.instance?.webContents.send('update-download-progress', info.percent)
})

export function downloadAndInstallUpdate(): void {
    autoUpdater
        .downloadUpdate()
        .then(() => {
            MainWindow.instance?.webContents.send('update-downloaded')
        })
        .catch((error: unknown) => {
            MainWindow.instance?.webContents.send(
                'update-download-error',
                error instanceof Error ? error.message : String(error)
            )
        })
}

export function installUpdateAndRestart(): void {
    autoUpdater.quitAndInstall(true, true)
}

export function loadSettings(): ISettings {
    return electronConf.get('settings')
}

export function saveSettings(settings: ISettings): void {
    electronConf.set('settings', settings)
}

let _resetAll = false

export function resetAll(): void {
    _resetAll = true

    electron.app.relaunch()
    electron.app.quit()
}

let recentFilePaths: string[] = []

export function clearRecentFiles(): void {
    recentFilePaths = []

    updateReopenMenu(recentFilePaths)
}

export function fileClosed(filePath: string): void {
    recentFilePaths.unshift(filePath)
    recentFilePaths = recentFilePaths.slice(0, 10)

    updateReopenMenu(recentFilePaths)
}

export function fileIssue(filePath: string): void {
    recentFilePaths = recentFilePaths.filter((recentFilePath) => recentFilePath !== filePath)

    updateReopenMenu(recentFilePaths)
}

export function fileOpened(filePath: string): void {
    recentFilePaths = recentFilePaths.filter((recentFilePath) => recentFilePath !== filePath)

    updateReopenMenu(recentFilePaths)

    // A file has been opened, but it may have been opened while reopening files during startup, in which case we
    // need to reopen the next file, hence our call to reopenFilePathsAndSelectFilePath(), which will do nothing if there
    // are no more files to reopen.

    MainWindow.instance?.reopenFilePathsAndSelectFilePath()
}

let openedFilePaths: string[] = []

export function filesOpened(filePaths: string[]): void {
    openedFilePaths = filePaths

    if (filePaths.length === 0) {
        selectedFilePath = null
    }
}

let selectedFilePath: string | null = null

export function fileSelected(filePath: string): void {
    selectedFilePath = filePath
}

export class MainWindow extends ApplicationWindow {
    // Properties.

    static instance: MainWindow | null = null

    private _splashScreenWindowClosed = false

    private _openedFilePaths: string[] = []
    private _selectedFilePath = ''

    // Constructor.

    constructor(commandLine: string[], splashScreenWindow: SplashScreenWindow) {
        // Initialise ourselves.

        const state: IElectronConfState = electronConf.get('app.state')

        super({
            x: state.x,
            y: state.y,
            width: state.width,
            height: state.height,
            minWidth: 640,
            minHeight: 480,
            ...(isMacOs() ? {} : { icon: icon })
        })

        // Keep track of the current isntance.

        MainWindow.instance = this

        // Set our dock icon (macOS only).

        if (isMacOs()) {
            electron.app.dock?.setIcon(icon)
        }

        // Restore our state, if needed.

        if (state.isMaximized) {
            this.maximize()
        } else if (state.isFullScreen) {
            this.setFullScreen(true)
        }

        // Ask for the splash screen window to be closed with a short delay once we are visible and handle our command line
        // (also with a short delay if needed).

        this.once('show', () => {
            let handleCommandLineDelay = SHORT_DELAY

            if (!this._splashScreenWindowClosed) {
                this._splashScreenWindowClosed = true

                handleCommandLineDelay = LONG_DELAY

                setTimeout(() => {
                    splashScreenWindow.close()
                }, LONG_DELAY)
            }

            setTimeout(() => {
                // Retrieve the recently opened files and our Reopen menu.

                recentFilePaths = electronConf.get('app.files.recent')

                updateReopenMenu(recentFilePaths)

                // Reopen previously opened files, if any, and select the previously selected file.

                this._openedFilePaths = electronConf.get('app.files.opened')
                this._selectedFilePath = electronConf.get('app.files.selected')

                this.reopenFilePathsAndSelectFilePath()

                // Remove the first argument and then the second argument, but only
                // if we are not packaged.

                commandLine.shift()

                if (!isPackaged()) {
                    commandLine.shift()
                }

                // When auto updating the editor, we may end up with an extra argument that we need to ignore.

                if ((isWindows() || isMacOs()) && commandLine[0] === '--updated') {
                    commandLine.shift()
                } else if (isLinux() && commandLine[0] === '--no-sandbox') {
                    commandLine.shift()
                }

                this.handleArguments(commandLine)
            }, handleCommandLineDelay)
        })

        // Keep track of our settings unless we are resetting all.

        this.on('close', () => {
            if (_resetAll) {
                electronConf.clear()
            } else {
                // Main window state.

                if (!this.isMaximized() && !this.isMinimized() && !this.isFullScreen()) {
                    state.x = this.getPosition()[0]
                    state.y = this.getPosition()[1]
                    state.width = this.getContentSize()[0]
                    state.height = this.getContentSize()[1]
                }

                state.isMaximized = this.isMaximized()
                state.isFullScreen = this.isFullScreen()

                electronConf.set('app.state', state)

                // Recent files.

                electronConf.set('app.files.recent', recentFilePaths)

                // Opened files and selected file.

                electronConf.set('app.files.opened', openedFilePaths)
                electronConf.set('app.files.selected', selectedFilePath)
            }
        })

        // Enable our main menu.

        enableDisableMainMenu(true)

        // Make sure that our menu bar is always visible.

        this.setAutoHideMenuBar(false)
        this.setMenuBarVisibility(true)

        // Open external links in the default browser.

        this.webContents.setWindowOpenHandler((details) => {
            electron.shell.openExternal(details.url).catch((error: unknown) => {
                console.error('Failed to open external URL:', error)
            })

            return {
                action: 'deny'
            }
        })

        // Load the remote URL for development or the local HTML file for production.

        if (isDevMode()) {
            // @ts-expect-error (isDevMode() is true which means that process.env.ELECTRON_RENDERER_URL is defined)
            this.loadURL(process.env.ELECTRON_RENDERER_URL).catch((error: unknown) => {
                console.error('Failed to load URL:', error)
            })
        } else {
            this.loadFile('./out/renderer/index.html').catch((error: unknown) => {
                console.error('Failed to load file:', error)
            })
        }
    }

    // Reopen previously opened files, if any, and select the previously selected file.
    // Note: we reopen one file at a time since a file may be a remote file which means that it may take some time to
    //       reopen. So, we need to wait for the file to be reopened before reopening the next one.

    reopenFilePathsAndSelectFilePath(): void {
        if (this._openedFilePaths.length > 0) {
            const filePath = this._openedFilePaths[0]

            this.webContents.send('open', filePath)

            this._openedFilePaths = this._openedFilePaths.slice(1)

            if (this._openedFilePaths.length > 0) {
                return
            }
        }

        if (this._selectedFilePath !== '') {
            this.webContents.send('select', this._selectedFilePath)

            this._selectedFilePath = ''
        }
    }

    // Handle our command line arguments.

    handleArguments(commandLine: string[]): void {
        if (commandLine.length === 0) {
            return
        }

        commandLine.forEach((argument: string) => {
            if (argument !== '--allow-file-access-from-files' && argument !== '--enable-avfoundation') {
                // The argument is not an action (and not --allow-file-access-from-files or --enable-avfoundation either), so it
                // must be a file to open. But, first, check whether the argument is a relative path and, if so, convert it to
                // an absolute path.

                if (!path.isAbsolute(argument)) {
                    argument = path.resolve(argument)
                }

                this.webContents.send('open', argument)
            }
        })
    }

    // Enable/disable our UI.

    enableDisableUi(enable: boolean): void {
        enableDisableMainMenu(enable)

        this.webContents.send('enable-disable-ui', enable)
    }

    // Handle our File|Open menu.

    open(): void {
        this.enableDisableUi(false)

        electron.dialog
            .showOpenDialog({
                properties: ['openFile', 'multiSelections']
            })
            .then(({ filePaths }) => {
                for (const filePath of filePaths) {
                    this.webContents.send('open', filePath)
                }

                this.enableDisableUi(true)
            })
            .catch((error: unknown) => {
                console.error('Failed to open file(s):', error)

                this.enableDisableUi(true)
            })
    }
}
