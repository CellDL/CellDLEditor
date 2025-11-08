<template lang="pug">
    .panel(
        ref="tool-panel"
        :class="{ hidden: panelHidden }"
        :style="panelPosition")
        slot
    .ci.tool-button(
        :class="icon"
        v-tooltip="{ value: prompt }"
        :aria-label="prompt"
        @click="toolButtonClick")
</template>

<script setup lang="ts">
import * as vue from "vue"

const props = defineProps<{
    id?: string
    icon?: string
    prompt?: string
}>()


// need to be able to deactivate a toolbutton

const panelHidden = vue.ref()
panelHidden.value = true

const panelPosition = vue.reactive({
    left: '0',
    top: '0'
})

const pointerPos = vue.ref()
vue.provide('pointerPos', vue.readonly(pointerPos))

// Who handles click events?
//
// Us to toggle state and open panel??
// And then emit change event for parent to track what tool is active
//
// Then we need to listen to parent (reactive element) who might deactivate/reset us
//

const emit = defineEmits(['change'])

const panelReference = vue.useTemplateRef('tool-panel')
let panelElement: HTMLElement | null = null

vue.onMounted(() => {
    if (panelReference.value) {
        panelElement = (<HTMLElement>panelReference.value).firstElementChild as HTMLElement
    }
})

async function toolButtonClick(e: MouseEvent) {
    const target: HTMLElement | null = e.target as HTMLElement
    if (target) {
        if (!target.classList.contains('active')) {
            target.classList.add('active')
        } else if (panelElement) {
            if (!panelHidden.value) {
                panelHidden.value = true
            } else {
                const toolBounds = target.getBoundingClientRect()
                panelHidden.value = false
                // Wait for panel to be renderered before getting its height
                await vue.nextTick()
                const panelHeight = panelElement?.clientHeight
                let panelTop = (toolBounds.height - panelHeight)/2

                pointerPos.value = panelHeight/2 - 10  // 10 is half of pointer's height
                if ((toolBounds.top - panelTop) < (20 + window.scrollY)) {
                    // Make sure we are visible when at top of the screen
                    const adjustment = toolBounds.top - (20 + window.scrollY)
                    panelTop += adjustment
                    pointerPos.value += adjustment
                }
                panelPosition.left = '16px'
                panelPosition.top = `${panelTop}px`
            }
        }
        emit('change', target.id, target.classList.contains('active'))
    }
}
</script>

<style scoped>
.tool-button {
    border: 1px solid green;
}
.tool-button:hover {
    background-color: lightgrey;
}

.tool-button.ci {
    width: 36px !important;
    height: 36px !important;
    scale: 1 !important;
    padding: 0;
}

.hidden {
    display: none;
}

.active {
    background-color: var(--p-select-option-selected-focus-background) !important;
}
</style>
