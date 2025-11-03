import electron from 'electron'

import { isMacOs, isPackaged } from '../renderer/src/common/electron'

import { mainWindow } from '.'
import { clearRecentFiles } from './MainWindow'

let enabledMenu: electron.Menu | null = null
let disabledMenu: electron.Menu | null = null
let recentFilePaths: string[] = []
let hasFiles = false

export function enableDisableMainMenu(enable: boolean): void {
    // Build our menu, if needed.

    if (enable && enabledMenu !== null) {
        electron.Menu.setApplicationMenu(enabledMenu)
    } else if (!enable && disabledMenu !== null) {
        electron.Menu.setApplicationMenu(disabledMenu)
    } else {
        // Some common menu items.

        const settingsMenuItem: electron.MenuItemConstructorOptions = {
            label: 'Settings...',
            accelerator: 'CmdOrCtrl+,',
            click: () => {
                mainWindow?.webContents.send('settings')
            }
        }

        let checkForUpdatesMenuItem: electron.MenuItemConstructorOptions | null = null

        if (isPackaged()) {
            checkForUpdatesMenuItem = {
                label: 'Check For Updates...',
                click: () => {
                    mainWindow?.webContents.send('check-for-updates')
                }
            }
        }

        const aboutEditorMenuItem: electron.MenuItemConstructorOptions = {
            label: 'About the Editor',
            click: () => {
                mainWindow?.webContents.send('about')
            }
        }

        // App menu.

        const appSubMenu: electron.MenuItemConstructorOptions[] = []
        const appMenu: electron.MenuItemConstructorOptions = {
            label: electron.app.name,
            submenu: appSubMenu
        }

        if (isMacOs()) {
            if (enable) {
                appSubMenu.push(aboutEditorMenuItem)

                if (checkForUpdatesMenuItem !== null) {
                    appSubMenu.push({ type: 'separator' })
                    appSubMenu.push(checkForUpdatesMenuItem)
                }

                appSubMenu.push({ type: 'separator' })
                appSubMenu.push(settingsMenuItem)
                appSubMenu.push({ type: 'separator' })
            }

            appSubMenu.push({ role: 'hide' })
            appSubMenu.push({ role: 'hideOthers' })
            appSubMenu.push({ role: 'unhide' })

            if (enable) {
                appSubMenu.push({ type: 'separator' })
                appSubMenu.push({ role: 'quit' })
            }
        }

        // File menu.

        const fileSubMenu: electron.MenuItemConstructorOptions[] = []
        const fileMenu: electron.MenuItemConstructorOptions = {
            label: 'File',
            submenu: fileSubMenu
        }

        fileSubMenu.push({
            label: 'Open...',
            accelerator: 'CmdOrCtrl+O',
            click: () => {
                mainWindow?.open()
            }
        })
        fileSubMenu.push({
            label: 'Open Remote...',
            accelerator: 'CmdOrCtrl+Shift+O',
            click: () => {
                mainWindow?.webContents.send('open-remote')
            }
        })
        fileSubMenu.push({
            label: 'Open Sample',
            submenu: [
                {
                    label: 'Lorenz',
                    click: () => {
                        mainWindow?.webContents.send('open-sample-lorenz')
                    }
                },
                {
                    label: 'Interactive Lorenz',
                    click: () => {
                        mainWindow?.webContents.send('open-sample-interactive-lorenz')
                    }
                }
            ]
        })

        const fileReopenSubMenu: electron.MenuItemConstructorOptions[] = []

        fileReopenSubMenu.push({
            label: 'Most Recent',
            accelerator: 'CmdOrCtrl+Shift+T',
            click: () => {
                mainWindow?.webContents.send('open', recentFilePaths[0])
            },
            enabled: recentFilePaths.length > 0
        })

        if (recentFilePaths.length > 0) {
            fileReopenSubMenu.push({ type: 'separator' })

            recentFilePaths.forEach((filePath: string) => {
                fileReopenSubMenu.push({
                    label: filePath,
                    click: () => {
                        mainWindow?.webContents.send('open', filePath)
                    }
                })
            })
        }

        fileReopenSubMenu.push({ type: 'separator' })
        fileReopenSubMenu.push({
            label: 'Clear Menu',
            click: () => {
                clearRecentFiles()
            },
            enabled: recentFilePaths.length > 0
        })

        fileSubMenu.push({
            id: 'fileReopen',
            label: 'Reopen',
            submenu: fileReopenSubMenu
        })
        fileSubMenu.push({ type: 'separator' })
        fileSubMenu.push({
            id: 'fileClose',
            label: 'Close',
            accelerator: 'CmdOrCtrl+W',
            click: () => {
                mainWindow?.webContents.send('close')
            },
            enabled: hasFiles
        })
        fileSubMenu.push({
            id: 'fileCloseAll',
            label: 'Close All',
            click: () => {
                mainWindow?.webContents.send('close-all')
            },
            enabled: hasFiles
        })

        if (!isMacOs()) {
            fileSubMenu.push({ type: 'separator' })
            fileSubMenu.push({ role: 'quit' })
        }

        // Edit menu.

        const editMenu: electron.MenuItemConstructorOptions = {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                { role: 'delete', accelerator: 'Delete' },
                { type: 'separator' },
                { role: 'selectAll' }
            ]
        }

        // View menu.

        const viewMenu: electron.MenuItemConstructorOptions = {
            label: 'View',
            submenu: [
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        }

        // Tools menu.

        const toolsSubMenu: electron.MenuItemConstructorOptions[] = []
        const toolsMenu: electron.MenuItemConstructorOptions = {
            label: 'Tools',
            submenu: toolsSubMenu
        }

        if (!isMacOs()) {
            toolsSubMenu.push(settingsMenuItem)
            toolsSubMenu.push({ type: 'separator' })
        }

        toolsSubMenu.push({
            label: 'Reset All...',
            click: () => {
                mainWindow?.webContents.send('reset-all')
            }
        })

        // Help menu.

        const helpSubMenu: electron.MenuItemConstructorOptions[] = []
        const helpMenu: electron.MenuItemConstructorOptions = {
            label: 'Help',
            submenu: helpSubMenu
        }

        helpSubMenu.push({
            label: 'Home Page',
            click: () => {
                electron.shell.openExternal('https://github.com/CellDL/CellDLEditor').catch((error: unknown) => {
                    console.error('Failed to open the home page:', error)
                })
            }
        })
        helpSubMenu.push({ type: 'separator' })
        helpSubMenu.push({
            label: 'Report Issue',
            click: () => {
                electron.shell
                    .openExternal('https://github.com/CellDL/CellDLEditor/issues/new')
                    .catch((error: unknown) => {
                        console.error('Failed to report an issue:', error)
                    })
            }
        })

        if (!isMacOs()) {
            if (checkForUpdatesMenuItem !== null) {
                helpSubMenu.push({ type: 'separator' })
                helpSubMenu.push(checkForUpdatesMenuItem)
            }

            helpSubMenu.push({ type: 'separator' })
            helpSubMenu.push(aboutEditorMenuItem)
        }

        // Set our menu.

        const menu: electron.MenuItemConstructorOptions[] = []

        if (enable) {
            if (isMacOs()) {
                menu.push(appMenu)
            }

            menu.push(fileMenu)
            menu.push(editMenu)
            menu.push(viewMenu)
            menu.push(toolsMenu)
            menu.push(helpMenu)

            enabledMenu = electron.Menu.buildFromTemplate(menu)
        } else {
            if (isMacOs()) {
                menu.push(appMenu)
            }

            menu.push(editMenu)

            disabledMenu = electron.Menu.buildFromTemplate(menu)
        }

        electron.Menu.setApplicationMenu(enable ? enabledMenu : disabledMenu)
    }
}

export function enableDisableFileCloseAndCloseAllMenuItems(enable: boolean): void {
    if (enabledMenu !== null) {
        hasFiles = enable

        const fileCloseMenu = enabledMenu.getMenuItemById('fileClose')
        const fileCloseAllMenu = enabledMenu.getMenuItemById('fileCloseAll')

        if (fileCloseMenu !== null && fileCloseAllMenu !== null) {
            fileCloseMenu.enabled = hasFiles
            fileCloseAllMenu.enabled = hasFiles
        }
    }
}

export function updateReopenMenu(filePaths: string[]): void {
    enabledMenu = null
    recentFilePaths = filePaths

    enableDisableMainMenu(true)
}
