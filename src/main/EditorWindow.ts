/******************************************************************************

CellDL Editor

Copyright (c) 2022 - 2025 David Brooks

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

******************************************************************************/

import fs from 'node:fs'
import path from 'node:path'

import electron from 'electron'
import { autoUpdater, type ProgressInfo, type UpdateCheckResult } from 'electron-updater'

//==============================================================================

import { isPackaged } from '../renderer/src/common/electron'

import { application, electronConf } from '.'
import { ApplicationWindow } from './ApplicationWindow'
import { updateReopenMenu } from './MainMenu';

//==============================================================================

export const EDITOR_REDO = 'redo'
export const EDITOR_UNDO = 'undo'
export const SHOW_GRID = 'showGrid'

const EDITOR_ACTIONS = [
    EDITOR_REDO,
    EDITOR_UNDO,
    SHOW_GRID,
]

const FILE_SAVE    = 'fileSave'
//const FILE_SAVE_AS = 'fileSaveAs'

//==============================================================================

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
                    // to applications current editor windoe\w
                    application.currentWindow?.send('update-available', result?.updateInfo.version)
                } else if (!atStartup) {
                    application.currentWindow?.send('update-not-available')
                }
            })
            .catch((error: unknown) => {
                application.currentWindow?.send(
                    'update-check-error',
                    error instanceof Error ? error.message : String(error)
                )
            })
    }
}

autoUpdater.on('download-progress', (info: ProgressInfo) => {
    application.currentWindow?.send('update-download-progress', info.percent)
})

export function downloadAndInstallUpdate(): void {
    autoUpdater
        .downloadUpdate()
        .then(() => {
            application.currentWindow?.send('update-downloaded')
        })
        .catch((error: unknown) => {
            application.currentWindow?.send(
                'update-download-error',
                error instanceof Error ? error.message : String(error)
            )
        })
}

export function installUpdateAndRestart(): void {
    autoUpdater.quitAndInstall(true, true)
}


let recentFilePaths: string[] = []

export function clearRecentFiles(): void {
    recentFilePaths = []

    updateReopenMenu(recentFilePaths)
}

//==============================================================================

// Debugging
let lastWinNumber: number = 0

export class EditorWindow extends ApplicationWindow
{
    #filePath: string = ''
    #fileName: string = 'New file'
    #importPath: string = ''
    #menuItemsById: Map<string, electron.MenuItem> = new Map()
    #modified: boolean = false
    #pendingClose: boolean = false
    #saveFilePath: string = ''
    winNumber: number

    constructor(filePath: string, options)
    {
        super(options)
        if (options.importSvg || false) {
            this.#importPath = filePath
        } else {
            this.setFilePath(filePath)
        }
        lastWinNumber += 1
        this.winNumber = lastWinNumber
console.log('Created window number', this.winNumber)
    }

    get filePath() {
        return this.#filePath
    }

    setFilePath(filePath: string) {
        // An empty path means we are creating a new file
console.log('set file path', filePath, 'was', this.#filePath)
        if (filePath !== this.#filePath) {
            this.#filePath = filePath
            this.#fileName = filePath ? filePath.split(path.sep).at(-1)! : 'New file'
            this.title = this.#fileName
            application?.setEditorWindow(this)
        }
    }

    get modified() {
        return this.#modified
    }
    set modified(modified: boolean) {
        this.documentEdited = modified
        this.#modified = modified
        if (modified && !this.title.endsWith(' *')) {
            this.title += ' *'
        } else if (!modified && this.title.endsWith(' *')) {
            this.title = this.title.slice(0, -2)
        }
    }

    send(type: string, ...args: unknown[]) {
console.log('SEND to browser from win', this.winNumber, type, args[0])
        this.webContents.send(type, ...args)
    }

    editorAction(action: string, ...args) {
        if (this.#menuItemsById.size === 0) {
            return
        } else if (action === 'READY') {
            if (this.#importPath !== '') {
                this.importSvgFile(this.#importPath)
            } else {
                this.openFile(this.#filePath)
            }
        } else if (action === 'DIRTY') {
            this.modified = true
            this.#menuItemsById.get(EDITOR_UNDO)!.enabled = true
            this.#menuItemsById.get(FILE_SAVE)!.enabled = true
        } else if (action === 'CLEAN') {
            this.modified = false
            this.#menuItemsById.get(EDITOR_UNDO)!.enabled = false
            this.#menuItemsById.get(FILE_SAVE)!.enabled = false
        } else if (action === 'REDO') {
            this.#menuItemsById.get(EDITOR_REDO)!.enabled = true
        } else if (action === 'REDONE') {
            this.#menuItemsById.get(EDITOR_REDO)!.enabled = false
        } else if (action === 'SHOWGRID') {
            if (args.length) {
                if (args[0] === null) {
                    this.#menuItemsById.get(SHOW_GRID)!.checked = false
                    this.#menuItemsById.get(SHOW_GRID)!.enabled = false
                } else {
                    this.#menuItemsById.get(SHOW_GRID)!.checked = args[0]
                    this.#menuItemsById.get(SHOW_GRID)!.enabled = true
                }
            } else {
                this.#menuItemsById.get(SHOW_GRID)!.checked = true
                this.#menuItemsById.get(SHOW_GRID)!.enabled = true
            }
        }
    }

    menuEvent(menuItemId: string, state?: boolean) {
        if (EDITOR_ACTIONS.includes(menuItemId)) {
            this.send('EDITOR_OP', menuItemId, state)
        }
    }

    #addMenuItem(item: electron.MenuItem) {
        const itemId = item.id || item.role
        if (itemId) {
            this.#menuItemsById.set(itemId, item)
        }
        if (item.type === 'submenu') {
            for (const subItem of item.submenu!.items) {
                this.#addMenuItem(subItem)
            }
        }
    }

    setMenuItems(items: electron.MenuItem[]) {
        for (const item of items) {
            this.#addMenuItem(item)
        }
    }

    #confirmUnsavedChanges(): string {
        const buttons = ['Save', "Don't Save", 'Cancel']
        return buttons[electron.dialog.showMessageBoxSync(this, {
            message: `Do you want to save the changes you made to ${this.#fileName}?`,
            detail: "Your changes will be lost if you don't save them.",
            type: 'question',
            buttons: buttons,
            defaultId: 0,
            cancelId: 2
        })]
    }

    closeOnWrite() {
        return this.#pendingClose
    }

    okToClose(): boolean {
        if (this.#modified) {
            const confirmation = this.#confirmUnsavedChanges()
            if (confirmation === 'Cancel') {
                return false
            } else if (confirmation === 'Save'
                    && this.saveFileFromMenu(false) !== '') {
                this.#pendingClose = true
                return false
            }
        }
        return true
    }

    importSvgFile(filePath: string) {
        if (filePath) {
            // Add ``.celldl`` into the file's name
            let celldlName: string
            const parts = filePath.split('.')
            if (parts.length === 1) {
                celldlName = `${filePath}.celldl.svg`
            } else {
                parts.splice(-1, 0, 'celldl')
                celldlName = parts.join('.')
            }
            this.#saveFilePath = celldlName
            this.setRepresentedFilename(this.#saveFilePath)
            const data = fs.readFileSync(filePath, 'utf8')
            this.send('FILE_OP', 'IMPORT', '', data)
        }
    }

    openFile(filePath: string) {
        this.setFilePath(filePath)
console.log('opening', filePath)
        if (this.#filePath) {
            electron.app.addRecentDocument(this.#filePath)
            this.setRepresentedFilename(this.#filePath)
            const data = fs.readFileSync(this.#filePath, 'utf8')
console.log('sending data:', data.substr(0, 100))
            this.send('FILE_OP', 'OPEN', this.#filePath, data)
        }
    }

    writeFileData(filePath: string, data: string): boolean {
        if (filePath) {
            try {
                fs.writeFileSync(filePath, data, 'utf-8')
                this.modified = false
                return true
            } catch(err) {
                console.log(err)
            }
        }
        return false
    }

    saveFileFromMenu(saveAs: boolean): string {
        const saveFileOptions = {
            title: 'Save file',
            filters: [
                { name: 'CellDL files', extensions: ['celldl', 'svg'] },
                { name: 'All files', extensions: ['*'] }
            ]
        }
        let filePath = this.#filePath
        if (this.#saveFilePath !== '') {
            saveFileOptions['defaultPath'] = this.#saveFilePath
        }
        if (saveAs) {
            filePath = electron.dialog.showSaveDialogSync(this, saveFileOptions) // Save As
        } else if (!this.modified) {
            return filePath                        // Do nothing if Save of unmodified file
        } else if (filePath === '') {
            filePath = electron.dialog.showSaveDialogSync(this, saveFileOptions) // Save
        }
        if (filePath) {                      // Dialog wasn't cancelled
            this.send('FILE_OP', 'GET_DATA', filePath)
        }
        return filePath
    }
}

//==============================================================================
//==============================================================================

