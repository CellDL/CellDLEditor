<template lang="pug">
    ToolPanel(:id=toolId)
        template(#content)
            div(
                v-if="disabled"
            ) Please select an element or path.
            Accordion(
                v-if="!disabled"
                v-model:value="openPanel"
            )
                AccordionPanel.group(
                    v-for="(group, groupIndex) in groups"
                    :key="group.title"
                    :disabled="disabled"
                    :value="String(groupIndex)"
                )
                    AccordionHeader(
                        v-if="hasContent[groupIndex]"
                    ) {{ group.title }}
                    AccordionContent(
                        v-if="hasContent[groupIndex] && groupIndex < (groups.length - 1)"
                    )
                        InputWidget(
                            v-for="(item, index) in group.items"
                            v-model="item.value"
                            :itemId="item.itemId"
                            :name="item.name"
                            :value="item.value"
                            :units="item.units"
                            :numeric="item.numeric"
                            :maximumValue="item.maximumValue"
                            :minimumValue="item.minimumValue"
                            :possibleValues="item.possibleValues"
                            :stepValue="item.stepValue"
                            @change="updateProperties"
                        )
                    AccordionContent(
                        v-if="hasContent[groupIndex] && groupIndex == (groups.length - 1)"
                    )
                        FillStyle(
                            v-if="objectType === 'node'"
                            :fillStyle="objectStyle"
                            @change="updateNodeStyle"
                        )
                        PathStyle(
                            v-if="objectType === 'path'"
                            :pathStyle="objectStyle"
                            @change="updatePathStyle"
                        )
</template>

<script setup lang="ts">
import * as vue from 'vue'
import { useThemeCssVariables } from '@renderer/common/themeCssVariables'

useThemeCssVariables('accordion')
useThemeCssVariables('accordioncontent')
useThemeCssVariables('accordioncontent')
useThemeCssVariables('accordionpanel')

import type { PropertyGroup, StylingGroup } from '@editor/components/properties'

import ToolPanel from '../toolbar/ToolPanel.vue'
import InputWidget from '../widgets/InputWidget.vue'

import FillStyle from './FillStyle.vue'
import PathStyle from './PathStyle.vue'


import type {
    INodeStyle,
    IPathStyle
} from '@renderer/common/svgUtils'

const props = defineProps<{
    toolId: string
}>()

const groups = vue.inject<vue.Ref<PropertyGroup[]>>('componentProperties')

// Remember last opened AccordionPanel

const openPanel = vue.ref<string>('')

const disabled = vue.computed<boolean>(() => {
    for (const group of groups!.value) {
        if (group.items.length
         || (group.styling
          && 'fillColours' in group.styling
          && group.styling.fillColours
          && Array.isArray(group.styling.fillColours)
          && group.styling.fillColours.length)) {
            return false
        }
    }
    return true
})

const hasContent = vue.computed<boolean[]>(() => {
    return groups!.value.map((group: PropertyGroup) => {
        return (group.items.length > 0
             || (group.styling !== undefined && 'fillColours' in group.styling
                                             && group.styling.fillColours !== undefined
                                             && Array.isArray(group.styling.fillColours)
                                             && group.styling.fillColours.length > 0)
             || (group.styling !== undefined && 'pathStyle' in group.styling)
        )
    })
})

const objectStyle = vue.computed<INodeStyle|IPathStyle|undefined>(() => {
    const stylingGroup: StylingGroup = groups!.value.at(-1)! as StylingGroup
    if ('fillColours' in stylingGroup.styling) {
        const fillColours: string[] = [...(stylingGroup.styling.fillColours || [])]
        let direction = 'H'
        const colours: string[] = []
        if (fillColours.length && ['H', 'V'].includes(fillColours[0]!)) {
            direction = fillColours.shift()!
        }
        if (fillColours.length === 1) {
            colours.push(fillColours[0]!.trim())
        } else if (fillColours.length) {
            fillColours.forEach(colour => {
                colours.push(colour.trim())
            })
        }
        return {
            gradientFill: colours.length > 1,
            colours,
            direction
        } as INodeStyle
    } else if ('pathStyle' in stylingGroup.styling) {
        return stylingGroup.styling.pathStyle!
    }
})

const objectType = vue.computed<string>(() => {
    const stylingGroup: StylingGroup = groups!.value.at(-1)! as StylingGroup
    if ('fillColours' in stylingGroup.styling) {
        return 'node'
    } else if ('pathStyle' in stylingGroup.styling) {
        return 'path'
    }
    return ''
})

const emit = defineEmits(['panel-event', 'style-event'])

function updateProperties(itemId: string, oldValue: number | string, newValue: number | string) {
    vue.nextTick().then(() => {
        emit('panel-event', props.toolId, itemId, oldValue, newValue)
    })
}

function updateNodeStyle(fillStyle: INodeStyle) {
    void vue.nextTick().then(() => {
        const fillColours: string[] = []
        if (fillStyle.gradientFill) {
            fillColours.push(fillStyle.direction || 'H')
        }
        fillColours.push(...fillStyle.colours)
        emit('style-event', props.toolId, 'node', { fillColours })
    })
}

function updatePathStyle(pathStyle: IPathStyle) {
    void vue.nextTick().then(() => {
        emit('style-event', props.toolId, 'path', { pathStyle })
    })
}
</script>

<style>
/* Allow for FloatLabel text of InputWidget */
.p-accordioncontent-content {
    padding-top: 8px !important;
}
</style>
