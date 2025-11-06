import path from 'node:path'

import * as electronToolkitUtils from '@electron-toolkit/utils'

import electron from 'electron'
import { Conf as ElectronConf } from 'electron-conf'
import process from 'node:process'

import type { ISettings } from '../renderer/src/common/common'
import { isDevMode, isMacOs, isPackaged } from '../renderer/src/common/electron'

//==============================================================================

import {
    enableDisableFileCloseAndCloseAllMenuItems,
    enableDisableMainMenu
} from './MainMenu'
import {
    checkForUpdates,
    downloadAndInstallUpdate,
    EditorWindow,
    installUpdateAndRestart,
    loadSettings,
    resetAll,
    saveSettings
} from './EditorWindow'
import icon from './assets/icon.png?asset';

//==============================================================================

const NEW_WINDOW_OFFSET = 50    // screen pixels

//==============================================================================

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

//==============================================================================

export const application = new class Application
{
    #editorsById: Map<number, EditorWindow> = new Map()
    #filePathToEditor: Map<string, EditorWindow> = new Map()
    #focusedEditorId: number = 0
    #quitting = false

    constructor()
    {
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

                electron.ipcMain.on('FILE_OP', (event, action, filePath, data) => {
                    const currentEditor = <EditorWindow>electron.BrowserWindow.fromWebContents(event.sender)
                    if (currentEditor) {
                        if (action === 'WRITE') {
                            if (currentEditor.writeFileData(filePath, data)) {
                                if (currentEditor.closeOnWrite()) {
                                    currentEditor.close()
                                } else {
                                    electron.app.addRecentDocument(filePath)
                                    if (filePath !== currentEditor.filePath) {
                                        currentEditor.setFilePath(filePath)
                                        this.setEditor(currentEditor)
                                    }
                                }
                            }
                        } else if (action === 'ERROR') {
                            this.#filePathToEditor.delete(filePath)
                            currentEditor.setFilePath('')
                        }
                    }
                })

                electron.ipcMain.on('EDITOR_OP', (event, action, ...args) => {
                    const currentEditor = <EditorWindow>electron.BrowserWindow.fromWebContents(event.sender)
                    if (currentEditor) {
                        currentEditor.editorAction(action, ...args)
                    }
                })

            electronToolkitUtils.optimizer.registerFramelessWindowIpc()


            // Create an editor window

            this.#createEditor()
        })
        .catch((error: unknown) => {
            console.error('Failed to create an editor window:', error)
        })

        electron.app.on('open-file', (event, filePath) => {
            event.preventDefault()
            this.openFile(filePath)
        })

        electron.app.on('window-all-closed', () => {
            if (this.#quitting || process.platform !== 'darwin') {
                electron.app.quit()
            }
        })

        electron.app.on('browser-window-focus', (_event, window: electron.BrowserWindow) => {
            this.#focusedEditorId = window.id
        })

        electron.app.on('before-quit', () => {
            this.#quitting = true
        })
    }

    get currentWindow(): EditorWindow | undefined {
        return this.#editorsById.get(this.#focusedEditorId)
    }

    newFile() {
        this.#createEditor()
    }

    openFile(filePath: string, importSvg: boolean=false) {
        if (filePath) {
            const browser = this.#filePathToEditor.get(filePath)
            if (browser) {
                browser.focus()
            } else {
                const editor = this.currentWindow
                if (editor) {
                    if (editor && editor.filePath === '' && !editor.modified) {
                        // Reuse the current window if its empty
                        if (importSvg) {
                            editor.importSvgFile(filePath)
                        } else {
                            editor.openFile(filePath)
                        }
                        this.setEditor(editor)
                        return
                    }
                }
                this.#createEditor(filePath, { importSvg })
            }
        }
    }

    openFileFromMenu(importSvg: boolean=false)
    {
        const options = importSvg ? {
            title: 'Import SVG file',
            filters: [
                { name: 'SVG files', extensions: ['svg'] },
                { name: 'All files', extensions: ['*'] }
            ]
        } : {
            title: 'Open CellDL file',
            filters: [
                { name: 'CellDL files', extensions: ['celldl', 'svg'] },
                { name: 'All files', extensions: ['*'] }
            ]
        }
        const paths = electron.dialog.showOpenDialogSync(this.currentWindow!, options)
        if (paths) {
            this.openFile(paths[0], importSvg)
        }
    }


    #createEditor(filePath: string='', options={}) {
        let x, y
        const currentEditor = this.currentWindow
        if (currentEditor) {
            [x, y] = currentEditor.getPosition()
            x += NEW_WINDOW_OFFSET
            y += NEW_WINDOW_OFFSET
        }

        const editor = new EditorWindow(filePath, {
            ...options,
            title: 'New file',
            x, y,
            width: 1200,
            height: 800,
            minWidth: 640,
            minHeight: 420,
            useContentSize: true,
            show: false,
            frame: true,
            titleBarStyle: 'default',
            webPreferences: {
                preload: path.resolve(__dirname, '../preload/index.mjs'),
                webSecurity: false,
                sandbox: false
            },
            ...(isMacOs() ? {} : { icon: icon })
        })

        // Set our dock icon (macOS only).

        if (isMacOs()) {
          electron.app.dock?.setIcon(icon);
        }

        this.#editorsById.set(editor.id, editor)

        editor.once('ready-to-show', () => {
            const menu = enableDisableMainMenu(true)
            if (menu) {
                editor.setMenuItems(menu.items)
            }
            editor.show()
        })

        editor.on('close', event => {
            if (!editor.okToClose()) {
                event.preventDefault()
            } else {
                editor.hide()
            }
        })

        editor.on('closed', () => {
            this.#editorsById.delete(editor.id)
            if (editor.filePath) {
                this.#filePathToEditor.delete(editor.filePath)
            }
        })

        // Load the remote URL for development or the local html file for production.
        if (isDevMode() && process.env['ELECTRON_RENDERER_URL']) {
            editor.loadURL(process.env['ELECTRON_RENDERER_URL'])
        } else {
            editor.loadFile(path.resolve(__dirname, '../renderer/index.html'))
        }
    }

    setEditor(editor: EditorWindow)
    {
        if (editor.filePath !== '') {
            this.#filePathToEditor.set(editor.filePath, editor)
        }
    }
}
