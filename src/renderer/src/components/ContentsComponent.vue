<template>
  <div v-if="simulationOnly" class="h-full">
    <div v-for="(fileTab, index) in fileTabs" :key="`tabPanel_${fileTab.file.path()}`" :value="fileTab.file.path()">
      <IssuesView
        v-if="fileTab.file.issues().length !== 0"
        :width="width"
        :height="height"
        :issues="fileTab.file.issues()"
      />
      <SimulationExperimentView
        v-else-if="fileTab.uiJson === undefined"
        :width="width"
        :height="height"
        :isActive="isActive"
        :uiEnabled="uiEnabled"
        :file="fileTabs[index]?.file"
        :isActiveFile="fileTab.file.path() === activeFile"
        :simulationOnly="simulationOnly"
      />
      <SimulationExperimentUiView
        v-else
        :width="width"
        :height="height"
        :file="fileTabs[index]?.file"
        :uiJson="fileTabs[index]?.uiJson"
      />
    </div>
  </div>
  <div v-else class="h-full">
    <BackgroundComponent v-show="fileTabs.length === 0" :style="{ height: height + 'px' }" />
    <Tabs
      v-show="fileTabs.length !== 0"
      id="fileTabs"
      v-model:value="activeFile"
      :scrollable="true"
      :selectOnFocus="true"
    >
      <TabList :id="fileTablistId" class="border-b border-b-(--p-primary-color)">
        <Tab
          v-for="fileTab in fileTabs"
          :id="`tab_${fileTab.file.path()}`"
          :key="`tab_${fileTab.file.path()}`"
          :value="fileTab.file.path()"
        >
          <div class="flex gap-2 items-center">
            <div>
              {{
                fileTab.file
                  .path()
                  .split(/(\\|\/)/g)
                  .pop()
              }}
            </div>
            <div class="pi pi-times remove-button" @mousedown.prevent @click.stop="closeFile(fileTab.file.path())" />
          </div>
        </Tab>
      </TabList>
      <TabPanels class="p-0!">
        <TabPanel
          v-for="(fileTab, index) in fileTabs"
          :key="`tabPanel_${fileTab.file.path()}`"
          :value="fileTab.file.path()"
        >
          <IssuesView
            v-if="fileTab.file.issues().length !== 0"
            :width="width"
            :height="heightMinusFileTablist"
            :issues="fileTab.file.issues()"
          />
          <SimulationExperimentView
            v-else-if="fileTab.uiJson === undefined"
            :width="width"
            :height="heightMinusFileTablist"
            :isActive="isActive"
            :uiEnabled="uiEnabled"
            :file="fileTabs[index]?.file"
            :isActiveFile="fileTab.file.path() === activeFile"
          />
          <SimulationExperimentUiView
            v-else
            :width="width"
            :height="heightMinusFileTablist"
            :file="fileTabs[index]?.file"
            :uiJson="fileTabs[index]?.uiJson"
          />
        </TabPanel>
      </TabPanels>
    </Tabs>
  </div>
</template>

<script setup lang="ts">
import * as vueusecore from '@vueuse/core'

import * as vue from 'vue'

import * as common from '../common/common'
import { SHORT_DELAY } from '../common/constants'
import { electronApi } from '../common/electronApi'
import * as vueCommon from '../common/vueCommon'

const props = defineProps<{
    width: number
    height: number
    isActive: boolean
    uiEnabled: boolean
    simulationOnly?: boolean
}>()
defineExpose({ openFile, closeCurrentFile, closeAllFiles, hasFile, hasFiles, selectFile })

export interface IContentsComponent {
    openFile(file: locApi.File): void
    closeCurrentFile(): void
    closeAllFiles(): void
    hasFile(filePath: string): boolean
    hasFiles(): boolean
    selectFile(filePath: string): void
}

const fileTablistId = vue.ref('contentsComponentFileTablist')
const fileTabs = vue.ref<IFileTab[]>([])
const activeFile = vue.ref<string>('')
const heightMinusFileTablist = vue.ref<number>(0)

const filePaths = vue.computed(() => {
    const res: string[] = []

    for (const fileTab of fileTabs.value) {
        res.push(fileTab.file.path())
    }

    return res
})

vue.watch(filePaths, (newFilePaths: string[]) => {
    electronApi?.filesOpened(newFilePaths)
})

vue.watch(activeFile, (newActiveFile: string) => {
    // Note: activeFile can get updated by clicking on a tab or by calling selectFile(), hence we need to watch it to let
    //       people know that a file has been selected.

    electronApi?.fileSelected(newActiveFile)
})

function openFile(file: locApi.File): void {
    const filePath = file.path()
    const prevActiveFile = activeFile.value

    selectFile(filePath)

    fileTabs.value.splice(fileTabs.value.findIndex((fileTab) => fileTab.file.path() === prevActiveFile) + 1, 0, {
        file: file,
        uiJson: file.uiJson()
    })

    electronApi?.fileOpened(filePath)
}

function hasFile(filePath: string): boolean {
    return fileTabs.value.find((fileTab) => fileTab.file.path() === filePath) !== undefined
}

function hasFiles(): boolean {
    return fileTabs.value.length > 0
}

function selectFile(filePath: string): void {
    activeFile.value = filePath
}

function selectNextFile(): void {
    const crtFileTabIndex = fileTabs.value.findIndex((fileTab) => fileTab.file.path() === activeFile.value)
    const nextFileTabIndex = (crtFileTabIndex + 1) % fileTabs.value.length
    const nextFileTab = fileTabs.value[nextFileTabIndex]

    if (nextFileTab !== undefined) {
        selectFile(nextFileTab.file.path())
    }
}

function selectPreviousFile(): void {
    const crtFileTabIndex = fileTabs.value.findIndex((fileTab) => fileTab.file.path() === activeFile.value)
    const nextFileTabIndex = (crtFileTabIndex - 1 + fileTabs.value.length) % fileTabs.value.length
    const nextFileTab = fileTabs.value[nextFileTabIndex]

    if (nextFileTab !== undefined) {
        selectFile(nextFileTab.file.path())
    }
}

function closeFile(filePath: string): void {
    locApi.fileManager.unmanage(filePath)

    const fileTabIndex = fileTabs.value.findIndex((fileTab) => fileTab.file.path() === filePath)

    fileTabs.value.splice(fileTabIndex, 1)

    if (activeFile.value === filePath && fileTabs.value.length > 0) {
        const nextFileTab = fileTabs.value[Math.min(fileTabIndex, fileTabs.value.length - 1)]

        if (nextFileTab !== undefined) {
            selectFile(nextFileTab.file.path())
        }
    }

    electronApi?.fileClosed(filePath)
}

function closeCurrentFile(): void {
    closeFile(activeFile.value)
}

function closeAllFiles(): void {
    while (fileTabs.value.length > 0) {
        closeCurrentFile()
    }
}

// Various things that need to be done once we are mounted.

const crtInstance = vue.getCurrentInstance()

vue.onMounted(() => {
    // Customise our IDs.

    fileTablistId.value = `contentsComponentFileTablist${String(crtInstance?.uid)}`

    // Track the height of our file tablist.

    let fileTablistResizeObserver: ResizeObserver | undefined

    setTimeout(() => {
        fileTablistResizeObserver = vueCommon.trackElementHeight(fileTablistId.value)
    }, SHORT_DELAY)

    // Monitor "our" contents size.

    function resizeOurselves() {
        heightMinusFileTablist.value = props.height - vueCommon.trackedCssVariableValue(fileTablistId.value)
    }

    vue.watch(
        () => props.height,
        () => {
            resizeOurselves()
        }
    )

    let oldFileTablistHeight = vueCommon.trackedCssVariableValue(fileTablistId.value)

    const mutationObserver = new MutationObserver(() => {
        const newFileTablistHeight = vueCommon.trackedCssVariableValue(fileTablistId.value)

        if (newFileTablistHeight !== oldFileTablistHeight) {
            oldFileTablistHeight = newFileTablistHeight

            resizeOurselves()
        }
    })

    mutationObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] })

    vue.onUnmounted(() => {
        mutationObserver.disconnect()

        fileTablistResizeObserver?.disconnect()
    })
})

// Keyboard shortcuts.

if (common.isDesktop()) {
    vueusecore.onKeyStroke((event: KeyboardEvent) => {
        if (!props.isActive || !props.uiEnabled || fileTabs.value.length === 0) {
            return
        }

        if (event.ctrlKey && !event.shiftKey && event.code === 'Tab') {
            event.preventDefault()

            selectNextFile()
        } else if (event.ctrlKey && event.shiftKey && event.code === 'Tab') {
            event.preventDefault()

            selectPreviousFile()
        }
    })
}
</script>

<style scoped>
.p-tab {
  padding: 0.125rem 0.5rem;
  border-right: 1px solid var(--p-content-border-color);
}

.p-tab:first-of-type {
  border-left: 1px solid var(--p-content-border-color);
}

.p-tab:hover {
  background-color: var(--p-content-hover-background) !important;
}

.p-tab .remove-button {
  visibility: hidden;
}

.p-tab:hover .remove-button,
.p-tab-active .remove-button {
  visibility: visible;
}

.p-tab-active,
.p-tab-active:hover {
  background-color: var(--p-primary-color) !important;
  color: var(--p-primary-contrast-color);
}

:deep(.p-tablist-active-bar) {
  display: none;
}

.remove-button {
  padding: 0.15rem;
  font-size: 0.75rem;
}

.remove-button:hover {
  border-radius: var(--p-border-radius-sm);
  background-color: var(--p-red-500);
  color: var(--p-red-50);
}

@media (prefers-color-scheme: dark) {
  .remove-button:hover {
    background-color: var(--p-red-400);
  }
}
</style>
