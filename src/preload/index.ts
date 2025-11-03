import { contextBridge, ipcRenderer } from 'electron'
import { exposeElectronAPI } from '@electron-toolkit/preload'

import * as systemInformation from 'systeminformation'

const osInfo = await systemInformation.osInfo()

//==============================================================================

import type { ISettings } from '@renderer/common/common'
import type { ISplashScreenInfo } from '@renderer/common/electronApi'

//==============================================================================

exposeElectronAPI()

contextBridge.exposeInMainWorld('electronAPI', {

    operatingSystem: () => {
        const architecture = osInfo.arch === 'x64' ? 'Intel' : 'ARM'

        if (osInfo.platform === 'Windows') {
            // Note: osInfo.distro returns something like "Microsoft Windows 11 Pro", but we want it to return
            //       "Windows 11 Pro", so we remove the "Microsoft " part.

            return `${osInfo.distro.replace('Microsoft ', '')} (${architecture})`
        }

        return `${osInfo.distro} ${osInfo.release} (${architecture})`
    },

    onInitSplashScreenWindow: (callback: (info: ISplashScreenInfo) => void) =>
        ipcRenderer.on('init-splash-screen-window', (_event, info: ISplashScreenInfo) => {
            callback(info)
        }),

    // Renderer process asking the main process to do something for it.

    checkForUpdates: (atStartup: boolean) => ipcRenderer.invoke('check-for-updates', atStartup),
    downloadAndInstallUpdate: () => ipcRenderer.invoke('download-and-install-update'),
    installUpdateAndRestart: () => ipcRenderer.invoke('install-update-and-restart'),

    loadSettings: (): Promise<ISettings> => ipcRenderer.invoke('load-settings'),
    resetAll: () => ipcRenderer.invoke('reset-all'),
    saveSettings: (settings: ISettings) => ipcRenderer.invoke('save-settings', settings),

    // Renderer process listening to the main process.

    onAbout: (callback: () => void) =>
        ipcRenderer.on('about', () => {
            callback()
        }),
    onSettings: (callback: () => void) =>
        ipcRenderer.on('settings', () => {
            callback()
        }),

    onCheckForUpdates: (callback: () => void) =>
        ipcRenderer.on('check-for-updates', () => {
            callback()
        }),
    onUpdateAvailable: (callback: (version: string) => void) =>
        ipcRenderer.on('update-available', (_event, version: string) => {
            callback(version)
        }),
    onUpdateCheckError: (callback: (issue: string) => void) =>
        ipcRenderer.on('update-check-error', (_event, issue: string) => {
            callback(issue)
        }),
    onUpdateDownloaded: (callback: () => void) =>
        ipcRenderer.on('update-downloaded', () => {
            callback()
        }),
    onUpdateDownloadError: (callback: (issue: string) => void) =>
        ipcRenderer.on('update-download-error', (_event, issue: string) => {
            callback(issue)
        }),
    onUpdateDownloadProgress: (callback: (percent: number) => void) =>
        ipcRenderer.on('update-download-progress', (_event, percent: number) => {
            callback(percent)
        }),
    onUpdateNotAvailable: (callback: () => void) =>
        ipcRenderer.on('update-not-available', () => {
            callback()
        }),

    onFileAction: (callback: () => void) =>
        ipcRenderer.on('FILE_OP', callback),
    onMenuAction: (callback: () => void) =>
        ipcRenderer.on('EDITOR_OP', callback),
    sendEditorAction: (action: string, ...args: any) =>
        ipcRenderer.send('EDITOR_OP', action, ...args),
    sendFileAction: (action: string, path: string, data: string|undefined=undefined) =>
        ipcRenderer.send('FILE_OP', action, path, data)
})

//==============================================================================
//==============================================================================
