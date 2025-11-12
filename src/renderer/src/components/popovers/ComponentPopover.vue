<template lang="pug">
    ToolPopover
        template(#content)
            .component-library(v-for="library in libraries")
                .library-title {{ library.name }}
                .library-icons
                    img.library-icon(
                        v-for="component in library.components"
                        :class="{ selected: component.selected }"
                        :library="library.id"
                        :id="component.id"
                        :src="component.image"
                        :aria-label="component.label"
                        :title="component.label"
                        draggable="true"
                        @click="selected"
                        @mousedown="selected")
</template>

<script setup lang="ts">
import * as vue from 'vue'

import { type ComponentLibrary, type ComponentTemplate } from '@editor/plugins/components'

import ToolPopover from '../toolbar/ToolPopover.vue'

const libraries = vue.inject<ComponentLibrary[]>('componentLibraries')

const props = defineProps<{
    toolId: string
}>()

const idToComponent: Map<string, ComponentTemplate> = new Map()
let selectedId: string | undefined = undefined

vue.onMounted(() => {
    libraries.value.forEach((library: ComponentLibrary) => {
        library.components.forEach((component: ComponentTemplate) => {
            idToComponent.set(component.id, component)
            if (component.selected) {
                selectedId = component.id
            }
        })
    })
})

const emit = defineEmits(['popover-event'])

function selected(e: MouseEvent) {
    const componentId = (<HTMLElement>e.target).id
    const component = idToComponent.get(componentId)
    if (componentId && component) {
        if (selectedId) {
            idToComponent.get(selectedId)!.selected = false
        }
        component.selected = true
        selectedId = componentId
    }
    emit('popover-event', props.toolId, component)
}
</script>

<style scoped>
.component-library
{
    width: 160px;
    display: flex;
    flex-direction: column;
    border: var(--p-accordion-header-border-width) solid var(--p-content-border-color);
}
.library-title {
    padding: 2px;
    border-bottom: 1px solid green;
    font-size: var(--p-card-title-font-size);
    font-weight: var(--p-card-title-font-weight);
}
.library-icons
{
    display: flex;
    flex-wrap: wrap;
    align-items: start;
    justify-content: space-between;
    gap: 5px;
    overflow-y: auto;
    margin: 2px;
}
.library-icon
{
    width: 45px;
    height: 45px;
    border: 1px solid lightgrey;
    background: var(--p-content-background);
    margin: 0;
    padding: 2px;
}
.library-icon:hover {
    background-color: lightgrey;
}
.library-icon.selected
{
    background: var(--p-select-option-selected-focus-background); /* #3584e4; */
}
</style>
