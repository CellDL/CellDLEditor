import electron from 'electron'
import * as systemInformation from 'systeminformation'

import type { ISettings } from '../renderer/src/common/common'
import type { ISplashScreenInfo } from '../renderer/src/common/electronApi'

// Some bridging between our main process and renderer process.
// Note: this must be in sync with src/electronApi.ts.

const osInfo = await systemInformation.osInfo()

electron.contextBridge.exposeInMainWorld('electronApi', {
    // Some general methods.

    operatingSystem: () => {
        const architecture = osInfo.arch === 'x64' ? 'Intel' : 'ARM'

        if (osInfo.platform === 'Windows') {
            // Note: osInfo.distro returns something like "Microsoft Windows 11 Pro", but we want it to return
            //       "Windows 11 Pro", so we remove the "Microsoft " part.

            return `${osInfo.distro.replace('Microsoft ', '')} (${architecture})`
        }

        return `${osInfo.distro} ${osInfo.release} (${architecture})`
    },

    // Splash screen window.

    onInitSplashScreenWindow: (callback: (info: ISplashScreenInfo) => void) =>
        electron.ipcRenderer.on('init-splash-screen-window', (_event, info: ISplashScreenInfo) => {
            callback(info)
        }),

    // Renderer process asking the main process to do something for it.

    checkForUpdates: (atStartup: boolean) => electron.ipcRenderer.invoke('check-for-updates', atStartup),
    downloadAndInstallUpdate: () => electron.ipcRenderer.invoke('download-and-install-update'),
    enableDisableMainMenu: (enable: boolean) => electron.ipcRenderer.invoke('enable-disable-main-menu', enable),
    enableDisableFileCloseAndCloseAllMenuItems: (enable: boolean) =>
        electron.ipcRenderer.invoke('enable-disable-file-close-and-close-all-menu-items', enable),
    fileClosed: (filePath: string) => electron.ipcRenderer.invoke('file-closed', filePath),
    fileIssue: (filePath: string) => electron.ipcRenderer.invoke('file-issue', filePath),
    fileOpened: (filePath: string) => electron.ipcRenderer.invoke('file-opened', filePath),
    filePath: (file: File) => electron.webUtils.getPathForFile(file),
    fileSelected: (filePath: string) => electron.ipcRenderer.invoke('file-selected', filePath),
    filesOpened: (filePaths: string[]) => electron.ipcRenderer.invoke('files-opened', filePaths),
    installUpdateAndRestart: () => electron.ipcRenderer.invoke('install-update-and-restart'),
    loadSettings: (): Promise<ISettings> => electron.ipcRenderer.invoke('load-settings'),
    resetAll: () => electron.ipcRenderer.invoke('reset-all'),
    saveSettings: (settings: ISettings) => electron.ipcRenderer.invoke('save-settings', settings),

    // Renderer process listening to the main process.

    onAbout: (callback: () => void) =>
        electron.ipcRenderer.on('about', () => {
            callback()
        }),
    onAction: (callback: (action: string) => void) =>
        electron.ipcRenderer.on('action', (_event, action: string) => {
            callback(action)
        }),
    onCheckForUpdates: (callback: () => void) =>
        electron.ipcRenderer.on('check-for-updates', () => {
            callback()
        }),
    onEnableDisableUi: (callback: (enable: boolean) => void) =>
        electron.ipcRenderer.on('enable-disable-ui', (_event, enable: boolean) => {
            callback(enable)
        }),
    onOpen: (callback: (filePath: string) => void) =>
        electron.ipcRenderer.on('open', (_event, filePath: string) => {
            callback(filePath)
        }),
    onOpenRemote: (callback: () => void) =>
        electron.ipcRenderer.on('open-remote', () => {
            callback()
        }),
    onOpenSampleLorenz: (callback: () => void) =>
        electron.ipcRenderer.on('open-sample-lorenz', () => {
            callback()
        }),
    onOpenSampleInteractiveLorenz: (callback: () => void) =>
        electron.ipcRenderer.on('open-sample-interactive-lorenz', () => {
            callback()
        }),
    onClose: (callback: () => void) =>
        electron.ipcRenderer.on('close', () => {
            callback()
        }),
    onCloseAll: (callback: () => void) =>
        electron.ipcRenderer.on('close-all', () => {
            callback()
        }),
    onResetAll: (callback: () => void) =>
        electron.ipcRenderer.on('reset-all', () => {
            callback()
        }),
    onSelect: (callback: (filePath: string) => void) =>
        electron.ipcRenderer.on('select', (_event, filePath: string) => {
            callback(filePath)
        }),
    onSettings: (callback: () => void) =>
        electron.ipcRenderer.on('settings', () => {
            callback()
        }),
    onUpdateAvailable: (callback: (version: string) => void) =>
        electron.ipcRenderer.on('update-available', (_event, version: string) => {
            callback(version)
        }),
    onUpdateCheckError: (callback: (issue: string) => void) =>
        electron.ipcRenderer.on('update-check-error', (_event, issue: string) => {
            callback(issue)
        }),
    onUpdateDownloaded: (callback: () => void) =>
        electron.ipcRenderer.on('update-downloaded', () => {
            callback()
        }),
    onUpdateDownloadError: (callback: (issue: string) => void) =>
        electron.ipcRenderer.on('update-download-error', (_event, issue: string) => {
            callback(issue)
        }),
    onUpdateDownloadProgress: (callback: (percent: number) => void) =>
        electron.ipcRenderer.on('update-download-progress', (_event, percent: number) => {
            callback(percent)
        }),
    onUpdateNotAvailable: (callback: () => void) =>
        electron.ipcRenderer.on('update-not-available', () => {
            callback()
        })
})
