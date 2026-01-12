<template lang="pug">
    Menubar(ref="menuBar" :model="items")
        template(#item="{ item, props }")
            a(v-bind="props.action")
                .p-icon(
                    v-if="item.icon !== undefined"
                    :class="item.icon"
                )
                div.p-menubar-item-label {{ item.label }}
                .ml-auto.p-icon.p-menubar-submenu-icon(
                    v-if="item.items !== undefined"
                    content="url(/icons/Chevron.svg)"
                )
                .ml-auto.border.rounded.shortcut(
                    v-if="item.shortcut !== undefined"
                    class="text-xs/3"
                ) {{ item.shortcut }}
</template>

<script setup lang="ts">
import * as vue from 'vue'
import * as vueusecore from '@vueuse/core'

import type Menubar from 'primevue/menubar'

//==============================================================================

import * as common from '@renderer/common/common'
import { type EditorState } from '@renderer/common/EditorTypes'

const props = defineProps<{
    haveFile: boolean
    fileModified: boolean  // to become part of editor state
    editorState: EditorState
    noPython?: boolean
}>()

const emit = defineEmits([
    'about',
    'edit-action',
    'export-action',
    'file-action',
    'settings'
])

const isWindowsOrLinux = common.isWindows() || common.isLinux()
const isMacOs = common.isMacOs()

//==============================================================================

const items = [
    {
        label: 'File',
        items: [
            {
                label: 'New File',
                shortcut: isWindowsOrLinux ? 'Ctrl+N' : isMacOs ? '⌘N' : undefined,
                command: () => {
                    emit('file-action', 'new')
                }
            },
            {
                label: 'Open...',
                shortcut: isWindowsOrLinux ? 'Ctrl+O' : isMacOs ? '⌘O' : undefined,
                command: () => {
                    emit('file-action', 'open')
                }
            },
            { separator: true },
            {
                label: 'Save...',
                shortcut: isWindowsOrLinux ? 'Ctrl+S' : isMacOs ? '⌘S' : undefined,
                command: () => {
                    emit('file-action', 'save')
                },
                disabled: () => !(props.haveFile && props.fileModified)
            },
            {
                label: 'Save As...',
                command: () => {
                    emit('file-action', 'save-as')
                },
                disabled: () => !props.haveFile
            },
            { separator: true },
            {
                label: 'Generate CellML...',
                command: () => {
                    emit('export-action', 'cellml')
                },
                disabled: () => !(props.haveFile && !props.fileModified),
                visible: () => !props.noPython
            }
        ]
    },
    {
        label: 'Edit',
        items: [
            {
                label: 'Undo',
                icon: 'pi pi-undo',
                shortcut: isWindowsOrLinux ? 'Ctrl+Z' : isMacOs ? '⌘Z' : undefined,
                command: () => {
                    emit('edit-action', 'undo')
                },
                disabled: !props.editorState.fileModified
            },
            {
                label: 'Redo',
                shortcut: isWindowsOrLinux ? 'Ctrl+Shift+O' : isMacOs ? '⇧⌘O' : undefined,
                command: () => {
                    emit('edit-action', 'redo')
                },
                disabled: !props.editorState.redoContents
            },
            { separator: true },
            {
                label: 'Cut',
                icon: 'pi pi-file-export',
                shortcut: isWindowsOrLinux ? 'Ctrl+X' : isMacOs ? '⌘X' : undefined,
                command: () => {
                    emit('edit-action', 'cut')
                },
                disabled: !props.editorState.itemSelected
            },
            {
                label: 'Copy',
                icon: 'pi pi-copy',
                shortcut: isWindowsOrLinux ? 'Ctrl+C' : isMacOs ? '⌘C' : undefined,
                command: () => {
                    emit('edit-action', 'copy')
                },
                disabled: !props.editorState.itemSelected
            },
            {
                label: 'Paste',
                icon: 'pi pi-clipboard',
                shortcut: isWindowsOrLinux ? 'Ctrl+V' : isMacOs ? '⌘V' : undefined,
                command: () => {
                    emit('edit-action', 'paste')
                },
                disabled: !props.editorState.pasteContents
            },
            {
                label: 'Delete',
                icon: 'pi pi-trash',
                shortcut: isWindowsOrLinux ? 'Del' : isMacOs ? '⌦' : undefined,
                command: () => {
                    emit('edit-action', 'delete')
                },
                disabled: !props.editorState.itemSelected
            }
        ]
    },    {
        label: 'Help',
        items: [
            {
                label: 'Home Page',
                command: () => {
                    window.open('https://github.com/CellDL/CellDLEditor')
                }
            },
            { separator: true },
            {
                label: 'Report Issue',
                command: () => {
                    window.open('https://github.com/CellDL/CellDLEditor/issues/new')
                }
            },
            { separator: true },
            {
                label: 'About the Editor',
                command: () => {
                    emit('about')
                }
            }
        ]
    }
]


//==============================================================================

// Keyboard shortcuts.

if (common.isDesktop()) {
    vueusecore.onKeyStroke((event: KeyboardEvent) => {
        if (common.isCtrlOrCmd(event) && !event.shiftKey && event.code === 'KeyN') {
            event.preventDefault()
            emit('file-action', 'new')
        } else if (common.isCtrlOrCmd(event) && !event.shiftKey && event.code === 'KeyO') {
            event.preventDefault()
            emit('file-action', 'open')
        } else if (props.haveFile && common.isCtrlOrCmd(event) && !event.shiftKey && event.code === 'KeyS') {
            event.preventDefault()
            emit('file-action', 'save')
        }
    })
}

//==============================================================================

// A few things that can only be done when the component is mounted.

const menuBar = vue.ref<(vue.ComponentPublicInstance<typeof Menubar> & { hide: () => void }) | null>(null)

vue.onMounted(() => {
    if (menuBar.value !== null) {
        // Ensure that the menubar never gets the 'p-menubar-mobile' class, which would turn it into a hamburger menu.

        const menuBarElement = menuBar.value.$el as HTMLElement
        const mutationObserver = new MutationObserver(() => {
            if (menuBarElement.classList.contains('p-menubar-mobile')) {
                menuBarElement.classList.remove('p-menubar-mobile')
            }
        })

        mutationObserver.observe(menuBarElement, { attributes: true, attributeFilter: ['class'] })

        // Close the menu when clicking clicking on the menubar but outside of the main menu items.

        function onClick(event: MouseEvent) {
            const target = event.target as Node

            if (
                menuBarElement.contains(target) &&
                !menuBarElement.querySelector('.p-menubar-root-list')?.contains(target) &&
                !Array.from(document.querySelectorAll('.p-menubar-submenu')).some((submenu) => submenu.contains(target))
            ) {
                menuBar.value?.hide()
            }
        }

        document.addEventListener('click', onClick)

        // Clean up the mutation observer and event listener when the component is unmounted.

        vue.onBeforeUnmount(() => {
            mutationObserver.disconnect()

            document.removeEventListener('click', onClick)
        })
    }
})

//==============================================================================

</script>

<style scoped>
.p-menubar {
  padding: 0.1rem;
  border: none;
  border-radius: 0;
  border-bottom: 1px solid var(--border-color);
}

.p-menubar
  > .p-menubar-root-list
  > .p-menubar-item
  > .p-menubar-item-content
  > .p-menubar-item-link
  .p-menubar-submenu-icon {
  display: none;
}

:deep(.p-menubar-submenu .p-menubar-item-link:hover:not(:has(.p-menubar-submenu))) {
  border-radius: var(--p-menubar-item-border-radius);
  background-color: var(--p-primary-color);
  color: var(--p-primary-contrast-color);
}

:deep(.p-menubar-submenu .p-menubar-item-link:hover:not(:has(.p-menubar-submenu)) .shortcut) {
  border-color: var(--p-primary-contrast-color);
  background-color: var(--p-primary-color);
  color: var(--p-primary-contrast-color);
}

:deep(.p-menubar-submenu .p-menubar-item-link:hover:not(:has(.p-menubar-submenu)) > .p-menubar-submenu-icon) {
  color: var(--p-primary-contrast-color) !important;
}

.p-menubar-item-link {
  padding: 0.25rem 0.5rem !important;
}

:deep(.p-menubar-root-list) {
  gap: 0.1rem;
}

:deep(.p-menubar-submenu) {
  padding: 0.1rem;
  z-index: 10;
}

.shortcut {
  border-color: var(--p-content-border-color);
  background: var(--p-content-hover-background);
  color: var(--p-text-muted-color);
}
</style>
