<template lang="pug">
    Toolbar.vertical
        template(#start)
            ToggleButton.mr-2(
                onIcon="pi pi-plus"
                offIcon="pi pi-plus")
            ToggleButton.mr-2(
                onIcon="pi pi-print"
                offIcon="pi pi-print"
                severity="secondary"
                text)
            ToggleButton.mr-2(
                onIcon="pi pi-upload"
                offIcon="pi pi-upload"
                severity="secondary"
                text)
</template>

<script setup lang="ts">
import ToggleButton from 'primevue/togglebutton'
</script>

<style>
.p-toolbar.vertical,
.p-toolbar.vertical > .p-toolbar-start {
    flex-direction: column !important;
}

.p-togglebutton-label {
    display: none;
}
</style>
