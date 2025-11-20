import { contextBridge, ipcRenderer } from 'electron'
import { exposeElectronAPI } from '@electron-toolkit/preload'

//==============================================================================

export interface IElectronAPI {
  onFileAction: (callback) => Promise<void>,
  onMenuAction: (callback) => Promise<void>,
  sendEditorAction: (action: string, ...args) => Promise<void>,
  sendFileAction: (action: string, path: string, data: string|undefined) => Promise<void>,
}

declare global {
  interface Window {
    electronAPI: IElectronAPI
  }
}


exposeElectronAPI()




contextBridge.exposeInMainWorld('electronAPI', {
    // Renderer listening to events from the main process

    onFileAction: (callback) => ipcRenderer.on('FILE_OP', callback),
    onMenuAction: (callback) => ipcRenderer.on('EDITOR_OP', callback),

    // Renderer sending events to the main process

    sendEditorAction: (action: string, ...args) => ipcRenderer.invoke('EDITOR_OP', action, ...args),
    sendFileAction: (action: string, path: string, data: string|undefined=undefined) =>
                                                    ipcRenderer.invoke('FILE_OP', action, path, data)
})

//==============================================================================
//==============================================================================
