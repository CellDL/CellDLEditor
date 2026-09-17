<template lang="pug">
    Dialog.w-139(header=" "
        v-model:visible="visibleModel"
        :modal="true"
        appendTo="self"
        :dismissableMask="true"
        :pt:mask:style="{ position: 'absolute' }"
    )
      .space-y-7
        .text-center
          .text-3xl.font-bold CellDL Editor {{ currentVersion }}
        .space-y-2
          div
            | #[a(href="https://github.com/CellDL/CellDLEditor", target="_blank", rel="noopener") CellDL Editor] is an editor that can be used to create #[a(href="https://en.wikipedia.org/wiki/SVG", target="_blank", rel="noopener") SVG]-based #[a(href="https://en.wikipedia.org/wiki/Bond_graph", target="_blank", rel="noopener") bond graph] diagrams and generate #[a(href="https://cellml.org/", target="_blank", rel="noopener") CellML] files from them.
          .space-y-0
      template(v-slot:footer)
        Button(label="OK", autofocus, @click="$emit('close')")
</template>

<script setup lang="ts">
import { currentVersion } from '../../common/version.ts'

const visibleModel = defineModel('visible', { type: Boolean })

function close() {
    visibleModel.value = false
}
</script>
