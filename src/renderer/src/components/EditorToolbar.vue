<template>
    <Toolbar class="vertical">
        <template #start>
            <ToggleButton onIcon="pi pi-plus" offIcon="pi pi-plus" class="mr-2" />
            <ToggleButton onIcon="pi pi-print" offIcon="pi pi-print" class="mr-2" severity="secondary" text />
            <ToggleButton onIcon="pi pi-upload" offIcon="pi pi-upload" severity="secondary" text />
        </template>
    </Toolbar>
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
