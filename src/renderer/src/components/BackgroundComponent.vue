<template lang="pug">
    .absolute.flex.justify-center.items-center.h-full.w-full.overflow-hidden.opaque(
        class="z-[99990]"
    )
        img.white(
            class="z-[99995] block! text-center! max-w-[311px] max-h-[266.92px] rounded-2xl.p-2 shadow-[0_0_0.75rem_0.375rem_var(--p-content-border-color)]"
            src="../assets/logo.svg"
        )
</template>

<script lang="ts" setup>
// This is from BackgroundComponent.vue in OpenCOR's web app.

/* Original dimensions:
 *  - Width: 828.12px; and
 *  - Height: 704.92px.
 * Final dimensions:
 *  - Width: 303px + 8px = 311px; and
 *  - Height: 257.92px + 8px = 266.92px
 */
</script>

<style scoped>
    .opaque {
        background-color: rgba(200, 200, 200, 0.7);
    }
    .white {
        background-color: white;
    }
</style>
