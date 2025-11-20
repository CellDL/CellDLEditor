import path from 'node:path'

import * as electronToolkitUtils from '@electron-toolkit/utils'

import electron from 'electron'
import { Conf as ElectronConf } from 'electron-conf'
import process from 'node:process'

import { isDevMode, isMacOs, isPackaged } from '../renderer/src/common/electron'

//==============================================================================

import { enableDisableMainMenu } from './MainMenu'
import { EditorWindow } from './EditorWindow'
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

                electron.ipcMain.handle('FILE_OP', (event, action, filePath, data) => {
                    const currentEditorWindow = <EditorWindow>electron.BrowserWindow.fromWebContents(event.sender)
                    if (currentEditorWindow) {
                        if (action === 'WRITE') {
                            if (currentEditorWindow.writeFileData(filePath, data)) {
                                if (currentEditorWindow.closeOnWrite()) {
                                    currentEditorWindow.close()
                                } else {
                                    electron.app.addRecentDocument(filePath)
                                    if (filePath !== currentEditorWindow.filePath) {
                                        currentEditorWindow.setFilePath(filePath)
                                        this.setEditorWindow(currentEditorWindow)
                                    }
                                }
                            }
                        } else if (action === 'ERROR') {
                            this.#filePathToEditor.delete(filePath)
                            currentEditorWindow.setFilePath('')
                        }
                    }
                })

                electron.ipcMain.handle('EDITOR_OP', (event, action, ...args) => {
                    const currentEditorWindow = <EditorWindow>electron.BrowserWindow.fromWebContents(event.sender)
                    if (currentEditorWindow) {
                        currentEditorWindow.editorAction(action, ...args)
                    }
                })

            electronToolkitUtils.optimizer.registerFramelessWindowIpc()


            // Create an editor window

            this.#createEditorWindow()
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
        this.#createEditorWindow()
    }

    openFile(filePath: string, importSvg: boolean=false) {
        if (filePath) {
            let editorWindow = this.#filePathToEditor.get(filePath)
            if (editorWindow) {
                // An editor window is already open for the file, so
                // bring it into focus without reloading it

                editorWindow.focus()
            } else {
                editorWindow = this.currentWindow
                // Create a new editor window if there is none or if the current one
                // has been modified or has a file associated with it

                if (!editorWindow || editorWindow.modified || editorWindow.filePath !== '') {
                    editorWindow = this.#createEditorWindow()
                } else {
                }
                if (importSvg) {
                    editorWindow.importSvgFile(filePath)
                } else {
                    editorWindow.openFile(filePath)
                }
                this.setEditorWindow(editorWindow)
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

    #createEditorWindow(filePath: string='', options={}): EditorWindow {
        let x, y
        const currentEditorWindow = this.currentWindow
        if (currentEditorWindow) {
            [x, y] = currentEditorWindow.getPosition()
            x += NEW_WINDOW_OFFSET
            y += NEW_WINDOW_OFFSET
        }

        const editorWindow = new EditorWindow(filePath, {
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

        if (!isPackaged() && isMacOs()) {
          electron.app.dock?.setIcon(icon);
        }

        this.#editorsById.set(editorWindow.id, editorWindow)

        editorWindow.once('ready-to-show', () => {
            const menu = enableDisableMainMenu(true)
            if (menu) {
                editorWindow.setMenuItems(menu.items)
            }
            editorWindow.show()
        })

        editorWindow.on('close', event => {
            if (!editorWindow.okToClose()) {
                event.preventDefault()
            } else {
                editorWindow.hide()
            }
        })

        editorWindow.on('closed', () => {
            this.#editorsById.delete(editorWindow.id)
            if (editorWindow.filePath) {
                this.#filePathToEditor.delete(editorWindow.filePath)
            }
        })

        // Load the remote URL for development or the local html file for production.
        if (isDevMode() && process.env['ELECTRON_RENDERER_URL']) {
            editorWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
        } else {
            editorWindow.loadFile(path.resolve(__dirname, '../renderer/index.html'))
        }

        return editorWindow
    }

    setEditorWindow(editorWindow: EditorWindow)
    {
        if (editorWindow.filePath !== '') {
            this.#filePathToEditor.set(editorWindow.filePath, editorWindow)
        }
    }
}
