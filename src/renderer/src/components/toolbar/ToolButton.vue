<template lang="pug">
    .panel(
        ref="tool-panel"
        :class="{ hidden: panelHidden }"
        :style="{ top: panelTop }")
        slot
    .ci.tool-button(
        :class="buttonClasses"
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
    modal?: boolean
}>()

const buttonClasses = vue.computed(() => {
    const classes = [props.icon]
    if (props.modal) {
        classes.push('modal')
    }
    return classes.join(' ')
})

// need to be able to deactivate a toolbutton

const panelHidden = vue.ref()
panelHidden.value = true

const panelTop = vue.ref()

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
                panelHidden.value = false

                // Wait for panel to be renderered before getting its height
                await vue.nextTick()

                const panelHeight = panelElement?.clientHeight
                let top = target.offsetTop + (target.clientWidth - panelHeight)/2
                pointerPos.value = panelHeight/2 - 10  // 10 is half of pointer's height

                if (top < (20 + window.scrollY)) {
                    // Make sure our top is at least 20px below top containing element
                    const adjustment = (20 + window.scrollY) - top
                    top = (20 + window.scrollY)
                    pointerPos.value -= adjustment
                }
                panelTop.value = `${top}px`
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

.tool-button.modal::before {
    content: url("/icons/ModalButton.svg");
    display: inline-block;
    position: absolute;
    width: 10px;
    right: 0;
    bottom: -4px;
}

.hidden {
    display: none;
}

.panel {
    position: absolute;
}

.active {
    background-color: var(--p-select-option-selected-focus-background) !important;
}
</style>
