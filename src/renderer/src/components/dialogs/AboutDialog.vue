<template lang="pug">
    Dialog(
        :modal="true"
        appendTo="self"
        :pt:mask:style="{ position: 'absolute' }"
    )
        div(class="text-2xl font-bold text-centre") CellDL Editor
        div(class="text text-centre") Version {{ version }}
</template>


<script setup lang="ts">
defineEmits<(event: 'close') => void>()

import { version } from '../../../package.json'
</script>
