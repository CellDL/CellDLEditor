import * as vueusecore from '@vueuse/core'

import * as vue from 'vue'

import type { Theme } from '../../index.js'

// A constant to know the UID of the active instance of the CellDL Editor.

export const activeInstanceUid = vueusecore.createGlobalState(() => vue.ref<string | null>(null))

// Theme composable to know whether the CellDL Editor uses light mode or dark mode.

export function useTheme() {
    const prefersColorScheme = window.matchMedia('(prefers-color-scheme: light)')
    const isLightMode = vue.ref(prefersColorScheme.matches)
    const isDarkMode = vue.ref(!prefersColorScheme.matches)
    let theme: Theme = 'system'

    function onChange(event) {
        if (theme === 'system') {
            isLightMode.value = event.matches
            isDarkMode.value = !event.matches
        }
    }

    vue.onMounted(() => {
        prefersColorScheme.addEventListener('change', onChange)
    })

    vue.onUnmounted(() => {
        prefersColorScheme.removeEventListener('change', onChange)
    })

    function setTheme(newTheme: Theme) {
        theme = newTheme

        if (theme === 'light') {
            isLightMode.value = true
            isDarkMode.value = false
        } else if (theme === 'dark') {
            isLightMode.value = false
            isDarkMode.value = true
        }
    }

    function useLightMode(): boolean {
        return isLightMode.value
    }

    function useDarkMode(): boolean {
        return isDarkMode.value
    }

    return {
        setTheme,
        useLightMode,
        useDarkMode
    }
}

// A method to retrieve the name of a tracked CSS variable.

export function trackedCssVariableName(id: string): string {
    return `--${(id.split('_')[0] ?? '').replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()}-height`
}

// A method to track the height of a given element.

export function trackElementHeight(id: string): ResizeObserver | undefined {
    const element = document.getElementById(id)

    if (element !== null) {
        const resizeObserver = new ResizeObserver(() => {
            let elementHeight = window.getComputedStyle(element).height

            if (elementHeight === '' || elementHeight === 'auto') {
                elementHeight = '0px'
            }

            const cssVariableName = trackedCssVariableName(id)
            const oldElementHeight = document.documentElement.style.getPropertyValue(cssVariableName)

            if (oldElementHeight === '' || (elementHeight !== '0px' && oldElementHeight !== elementHeight)) {
                document.documentElement.style.setProperty(cssVariableName, elementHeight)
            }
        })

        resizeObserver.observe(element)

        return resizeObserver
    }

    return undefined
}

// A method to retrieve the value of a tracked CSS variable.

export function trackedCssVariableValue(id: string): number {
    const propertyValue = document.documentElement.style.getPropertyValue(trackedCssVariableName(id))

    return propertyValue ? parseFloat(propertyValue) : 0
}
