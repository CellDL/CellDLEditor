import type { ISettings } from './common.js'

export interface ISplashScreenInfo {
    copyright: string
    version: string
}

interface IElectronApi {
    // Note: this must be in sync with src/preload/index.ts.

    // Some general methods.

    operatingSystem: () => string

    // Splash screen window.

    onInitSplashScreenWindow: (callback: (info: ISplashScreenInfo) => void) => void

    // Renderer process asking the main process to do something for it.

    checkForUpdates: (atStartup: boolean) => void
    downloadAndInstallUpdate: () => void
    enableDisableMainMenu: (enable: boolean) => void
    enableDisableFileCloseAndCloseAllMenuItems: (enable: boolean) => void
    fileClosed: (filePath: string) => void
    fileIssue: (filePath: string) => void
    fileOpened: (filePath: string) => void
    filePath: (file: File) => string
    fileSelected(filePath: string): void
    filesOpened(filePaths: string[]): void
    installUpdateAndRestart: () => void
    loadSettings: () => Promise<ISettings>
    resetAll: () => void
    saveSettings: (settings: ISettings) => void

    // Renderer process listening to the main process.

    onAbout: (callback: () => void) => void
    onAction: (callback: (action: string) => void) => void
    onCheckForUpdates: (callback: () => void) => void
    onEnableDisableUi: (callback: (enable: boolean) => void) => void
    onOpen: (callback: (filePath: string) => void) => void
    onOpenRemote: (callback: () => void) => void
    onOpenSampleLorenz: (callback: () => void) => void
    onOpenSampleInteractiveLorenz: (callback: () => void) => void
    onClose: (callback: () => void) => void
    onCloseAll: (callback: () => void) => void
    onResetAll: (callback: () => void) => void
    onSelect: (callback: (filePath: string) => void) => void
    onSettings: (callback: () => void) => void
    onUpdateAvailable: (callback: (version: string) => void) => void
    onUpdateCheckError: (callback: (issue: string) => void) => void
    onUpdateDownloaded: (callback: () => void) => void
    onUpdateDownloadError: (callback: (issue: string) => void) => void
    onUpdateDownloadProgress: (callback: (percent: number) => void) => void
    onUpdateNotAvailable: (callback: () => void) => void
}

interface IWindow {
    electronApi: IElectronApi
}

export const electronApi: IElectronApi | undefined = (window as unknown as IWindow).electronApi
