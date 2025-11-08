<template lang="pug">
     Card.left-panel(
        :data-tip-top="pointerPos"
        class="{ showtip: showtip }")
        template(#title)
            slot(name="title")
        template(#content)
            slot(name="content")
</template>

<script setup lang="ts">
import * as vue from "vue"

import Card from 'primevue/card'

const pointerPos = vue.inject('pointerPos')

// Don't show a wrongly positioned tooltip in Firefox
const showtip = vue.ref()
showtip.value = true //CSS.supports("x: attr(x type(*))")
</script>

<style scoped>
/* What does `md.w-56` do?? */
.p-card {
    width: 210px !important;
}

.left-panel {
    position: absolute;
    margin-left: 36px;
    z-index: 100;
}

.left-panel.showtip::before {
    content: url("/icons/LeftPanelArrow.svg");
    display: inline-block;
    position: absolute;
    width: 20px;
    left: -16px;
    top: attr(data-tip-top px);
    z-index: 99;
}
</style>
