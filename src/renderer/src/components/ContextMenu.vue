<template lang="pug">
    ContextMenu(
        ref="menu" :model="items"
    )
</template>


<script setup lang="ts">
import * as vue from 'vue'
import { useThemeCssVariables } from '@renderer/common/themeCssVariables'

useThemeCssVariables('contextmenu')

import { CONTEXT_MENU } from '@editor/editor'

const menu = vue.ref();
const items = vue.ref([
    {
        id: CONTEXT_MENU.DELETE,
        label: 'Delete',
        disabled: true
    },
    { separator: true },
    {
        id: CONTEXT_MENU.GROUP_OBJECTS,
        label: 'Group',
        disabled: true
    },
    {
        id: CONTEXT_MENU.EDIT_GROUP,
        label: 'Edit group',
        command: () => {},
        disabled: true
    },
    {
        id: CONTEXT_MENU.UNGROUP_OBJECTS,
        label: 'Ungroup',
        disabled: true
    },
    { separator: true },
    {
        id: CONTEXT_MENU.INFO,
        label: 'Info'
    },
]);
</script>
