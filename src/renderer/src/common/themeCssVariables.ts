/**
 * Composable utility for injecting PrimeVue theme CSS variables into the DOM.
 *
 * Ex https://github.com/CellDL/CellDLEditor/pull/4/changes from https://github.com/akhuoa
 */

import { onBeforeMount, getCurrentInstance } from 'vue';

/**
 * @param componentName The key name in the preset (e.g., 'card', 'button', 'select')
 */
export function useThemeCssVariables(componentName: string) {
    onBeforeMount(() => {
        const instance = getCurrentInstance();
        const primevue = instance?.appContext.config.globalProperties.$primevue;
        const preset = primevue?.config?.theme?.preset;

        if (preset?.components[componentName]) {
            const styles = generateComponentStyles(preset.components[componentName], componentName);
            injectStyles(`lib-fix-${componentName}`, styles);
        }
    });
}

function injectStyles(id: string, css: string) {
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
}

function resolveReference<T>(value: T|string): T|string {
    if (typeof value !== 'string') return value;
    return value.replace(/\{([^}]+)\}/g, (_, path) => {
        return `var(--p-${path.replace(/\./g, '-')})`;
    });
}

function toKebabCase(str: string) {
    return str.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
}

function generateComponentStyles(tokenObj: object, prefix: string) {
    let css = `:root {`;

    const traverse = (obj: object, parentKey: string) => {
        Object.entries(obj).forEach(([key, value]) => {
            const kebabKey = toKebabCase(key);
            let newKey: string;

            if (key === 'root') {
                newKey = parentKey;
            } else {
                newKey = parentKey ? `${parentKey}-${kebabKey}` : kebabKey;
            }

            if (typeof value === 'object' && value !== null) {
                traverse(value, newKey);
            } else {
                const resolvedValue = resolveReference(value);
                css += `--p-${prefix}-${newKey}: ${resolvedValue};`;
            }
        });
    };

    traverse(tokenObj, '');
    css += `}`;
    return css;
}
