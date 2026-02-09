<template lang="pug">
    Dialog(
        :modal="true"
        appendTo="self"
        :pt:mask:style="{ position: 'absolute' }"
    )
        div(class="text-2xl font-bold") CellDL Editor
        div.text-xs Copyright (c) 2022 - 2025 David Brooks
        div.text Version {{ currentVersion }}
</template>

<script setup lang="ts">
import { currentVersion } from '../../common/version.ts'

defineEmits<(event: 'close') => void>()
</script>
