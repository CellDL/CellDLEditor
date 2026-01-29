<template lang="pug">
    ToolPopover
        template(#content)
            .component-library(v-for="library in libraries")
                .library-title {{ library.name }}
                .library-icons
                    img.library-icon(
                        v-for="template in library.templates"
                        :class="{ selected: template.selected }"
                        :library="library.id"
                        :id="fullId(library, template)"
                        :src="template.image"
                        :aria-label="template.name"
                        v-tippy="{ content: template.name, placement: 'right' }"
                        draggable="true"
                        @dragstart="dragstart"
                        @mousedown="selected"
                    )
</template>

<script setup lang="ts">
import * as vue from 'vue'

import {
    type ComponentLibrary,
    type LibraryComponentTemplate,
    getTemplateEventDetails
} from '@editor/components/index'

import ToolPopover from '../toolbar/ToolPopover.vue'

const libraries = vue.inject<vue.Ref<ComponentLibrary[]>>('componentLibraries')

const props = defineProps<{
    toolId: string
}>()

const idToComponent: Map<string, LibraryComponentTemplate> = new Map()
let selectedId: string | undefined

function fullId(library: ComponentLibrary, template: LibraryComponentTemplate): string {
    return `${library.id}/${template.id}`
}

vue.onMounted(() => {
    libraries.value.forEach((library: ComponentLibrary) => {
        library.templates.forEach((template: LibraryComponentTemplate) => {
            const id = fullId(library, template)
            idToComponent.set(id, template)
            if (template.selected) {
                selectedId = id
            }
        })
    })
    if (selectedId) {
        const selectedElement = document.getElementById(selectedId) as HTMLImageElement
        if (selectedElement) {
            document.dispatchEvent(
                new CustomEvent('component-selected', {
                    detail: getTemplateEventDetails(selectedId, selectedElement, null)
                })
            )
        }
    }
})

const emit = defineEmits(['popover-event'])

function selected(e: MouseEvent) {
    const target = e.target as HTMLImageElement
    const component = idToComponent.get(target.id)
    if (target.id && component) {
        if (selectedId) {
            idToComponent.get(selectedId)!.selected = false
        }
        component.selected = true
        selectedId = target.id
    }
    // Tell the editor what template has been selected
    document.dispatchEvent(
        new CustomEvent('component-selected', {
            detail: getTemplateEventDetails(target.id, target, e)
        })
    )
    // Tell the toolbar what component template has been selected
    emit('popover-event', props.toolId, component)
}

function dragstart(e: DragEvent) {
    const target = e.target as HTMLImageElement
    e.dataTransfer!.items.add(JSON.stringify(getTemplateEventDetails(target.id, target, e)), 'text/plain')
    document.dispatchEvent(
        new CustomEvent('component-drag', {
            detail: {
                type: 'dragstart',
                source: props.toolId,
                value: target.id
            }
        })
    )
}
</script>

<style scoped>
.component-library
{
    width: 150px;
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
    gap: 3px;
    overflow-y: auto;
    margin: 1px;
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
    background: #3584e4;
}
</style>
