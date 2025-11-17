<template lang="pug">
    .popover(
        v-if="type === 'popover'"
        ref="tool-popover"
        :class="{ hidden: !popoverVisible }"
        :style="{ top: popoverTop }"
    )
        slot
    .ci.tool-button(
        :id="toolId"
        :class="buttonClasses"
        :style="buttonStyle"
        v-tooltip="{ value: prompt }"
        :aria-label="prompt"
        @click="toolButtonClick"
    )
</template>

<script setup lang="ts">
import * as vue from 'vue'

const props = defineProps<{
    toolId?: string
    active?: boolean
    icon?: string
    image?: string
    prompt?: string
    modal?: boolean
    type?: string
    panel?: vue.Raw<vue.Component>
}>()

const buttonClasses = vue.computed(() => {
    const classes = []
    if (props.icon) {
        classes.push(props.icon)
    }
    if (props.active) {
        classes.push('active')
    }
    if (props.type === 'popover' && props.modal) {
        classes.push('modal')
    }
    if (props.image) {
        classes.push('image')
    }
    return classes.join(' ')
})

const buttonStyle = vue.computed(() => {
    const style = []
    if (props.image) {
        style.push(`background: url("${props.image}");`)
    }
    return style.join(' ')
})

const popoverVisible = vue.ref()
popoverVisible.value = false

const popoverTop = vue.ref()

const pointerPos = vue.ref()
vue.provide('pointerPos', vue.readonly(pointerPos))

const popoverReference = vue.useTemplateRef('tool-popover')
let popoverElement: HTMLElement | null = null

vue.onMounted(() => {
    if (popoverReference.value) {
        popoverElement = (<HTMLElement>popoverReference.value).firstElementChild as HTMLElement
    }
})

// Make sure popover is closed when button is deactivated
vue.watch(
    () => props.active,
    () => {
        if (!props.active) {
            popoverVisible.value = false
        }
    }
)

const emit = defineEmits(['button-event'])

async function toolButtonClick(e: MouseEvent) {
    const target: HTMLElement | null = e.target as HTMLElement
    if (target) {
        if (props.type === 'panel') {
            // Simply toggle the panel button; event emission controls panel visibility

            target.classList.toggle('active')
        } else {
            if (!target.classList.contains('active')) {
                target.classList.add('active')
            } else if (popoverElement) {
                if (popoverVisible.value) {
                    popoverVisible.value = false
                } else {
                    popoverVisible.value = true

                    // Wait for panel to be rendered before getting its height
                    await vue.nextTick()

                    const popoverHeight = popoverElement?.clientHeight
                    let top = target.offsetTop + (target.clientWidth - popoverHeight) / 2
                    pointerPos.value = popoverHeight / 2 - 10 // 10 is half of pointer's height

                    if (top < (20 + window.scrollY)) {
                        // Make sure our top is at least 20px below top containing element
                        const adjustment = (20 + window.scrollY) - top
                        top = (20 + window.scrollY)
                        pointerPos.value -= adjustment
                    }
                    popoverTop.value = `${top}px`
                }
            }
        }
        emit('button-event', target.id, target.classList.contains('active'), props.panel || null)
    }
}
</script>

<style scoped>
.tool-button {
    border-style: solid;
    border-color: grey;
    border-width: 0 1px 2px;
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

.tool-button.image {
    background-size: 100% 100% !important;
}

.tool-button.modal::before {
    content: url("/icons/ModalButton.svg");
    display: inline-block;
    position: relative;
    transform: scale(0.3);
    width: 10px;
    height: 10px;
    top: 22px;
    left: 22px;
}

.hidden {
    display: none;
}

.popover {
    position: absolute;
}

.active {
    background-color: #3584e4 !important;
}
</style>
