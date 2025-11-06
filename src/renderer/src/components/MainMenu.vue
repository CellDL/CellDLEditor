<template lang="pug">
  Menubar(ref="menuBar" :model="items")
    template(#item="{ item, props }")
      a(v-bind="props.action")
        div.p-menubar-item-label {{ item.label }}
        svg.ml-auto.p-icon.p-menubar-submenu-icon(
          v-if="item.items !== undefined"
          width="14"
          height="14"
          viewBox="0 0 14 14"
          class="")
          path(
            d="M5.25 11.1728C5.14929 11.1694 5.05033 11.1455 4.9592 11.1025C4.86806 11.0595 4.78666 10.9984 4.72 10.9228C4.57955 10.7822 4.50066 10.5916 4.50066 10.3928C4.50066 10.1941 4.57955 10.0035 4.72 9.86283L7.72 6.86283L4.72 3.86283C4.66067 3.71882 4.64765 3.55991 4.68275 3.40816C4.71785 3.25642 4.79932 3.11936 4.91585 3.01602C5.03238 2.91268 5.17819 2.84819 5.33305 2.83149C5.4879 2.81479 5.64411 2.84671 5.78 2.92283L9.28 6.42283C9.42045 6.56346 9.49934 6.75408 9.49934 6.95283C9.49934 7.15158 9.42045 7.34221 9.28 7.48283L5.78 10.9228C5.71333 10.9984 5.63193 11.0595 5.5408 11.1025C5.44966 11.1455 5.35071 11.1694 5.25 11.1728Z"
            fill="currentColor")
</template>

<script setup lang="ts">
import * as vueusecore from '@vueuse/core';

import type Menubar from 'primevue/menubar';
import * as vue from 'vue';

import * as common from '../common/common';

const props = defineProps<{
  isActive: boolean;
  uiEnabled: boolean;
  hasFiles: boolean;
}>();

const emit = defineEmits([
  'about',
  'close',
  'closeAll',
  'open',
  'settings'
]);
const isWindowsOrLinux = common.isWindows() || common.isLinux();
const isMacOs = common.isMacOs();

const items = [
  {
    label: 'File',
    items: [
      {
        label: 'Open...',
        shortcut: isWindowsOrLinux ? 'Ctrl+Alt+O' : isMacOs ? '⌘⌥O' : undefined,
        command: () => {
          emit('open');
        }
      },
      { separator: true },
      {
        label: 'Close',
        shortcut: isWindowsOrLinux ? 'Ctrl+Alt+W' : isMacOs ? '⌘⌥W' : undefined,
        command: () => {
          emit('close');
        },
        disabled: () => !props.hasFiles
      },
      {
        label: 'Close All',
        command: () => {
          emit('closeAll');
        },
        disabled: () => !props.hasFiles
      }
    ]
  },
  {
    label: 'Help',
    items: [
      {
        label: 'Home Page',
        command: () => {
          window.open('https://github.com/CellDL/CellDLEditor');
        }
      },
      { separator: true },
      {
        label: 'Report Issue',
        command: () => {
          window.open('https://github.com/CellDL/CellDLEditor/issues/new');
        }
      },
      { separator: true },
      {
        label: 'About the Editor',
        command: () => {
          emit('about');
        }
      }
    ]
  }
];

// A few things that can only be done when the component is mounted.

const menuBar = vue.ref<(vue.ComponentPublicInstance<typeof Menubar> & { hide: () => void }) | null>(null);

vue.onMounted(() => {
  if (menuBar.value !== null) {
    // Ensure that the menubar never gets the 'p-menubar-mobile' class, which would turn it into a hamburger menu.

    const menuBarElement = menuBar.value.$el as HTMLElement;
    const mutationObserver = new MutationObserver(() => {
      if (menuBarElement.classList.contains('p-menubar-mobile')) {
        menuBarElement.classList.remove('p-menubar-mobile');
      }
    });

    mutationObserver.observe(menuBarElement, { attributes: true, attributeFilter: ['class'] });

    // Close the menu when clicking clicking on the menubar but outside of the main menu items.

    function onClick(event: MouseEvent) {
      const target = event.target as Node;

      if (
        menuBarElement.contains(target) &&
        !menuBarElement.querySelector('.p-menubar-root-list')?.contains(target) &&
        !Array.from(document.querySelectorAll('.p-menubar-submenu')).some((submenu) => submenu.contains(target))
      ) {
        menuBar.value?.hide();
      }
    }

    document.addEventListener('click', onClick);

    // Clean up the mutation observer and event listener when the component is unmounted.

    vue.onBeforeUnmount(() => {
      mutationObserver.disconnect();

      document.removeEventListener('click', onClick);
    });
  }
});

// Keyboard shortcuts.

if (common.isDesktop()) {
  vueusecore.onKeyStroke((event: KeyboardEvent) => {
    if (!props.isActive || !props.uiEnabled) {
      return;
    }

    if (common.isCtrlOrCmd(event) && !event.shiftKey && event.code === 'KeyO') {
      event.preventDefault();

      emit('open');
    } else if (props.hasFiles && common.isCtrlOrCmd(event) && !event.shiftKey && event.code === 'KeyW') {
      event.preventDefault();

      emit('close');
    } else if (common.isCtrlOrCmd(event) && !event.shiftKey && event.code === 'Comma') {
      event.preventDefault();

      emit('settings');
    }
  });
}
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
