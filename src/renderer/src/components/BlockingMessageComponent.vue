<template lang="pug">
    Message.absolute(
        class="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-[1rem] pt-[1.5rem] pb-[0.75rem] z-[99999]"
        severity="secondary"
    )
        i.pi.pi-cog.pi-spin(
            class="block! text-center! text-[3rem]!"
        )
        br
        span.block.text-center(
            class="text-[1.5rem] max-w-40"
        ) {{ message }}
</template>

<script setup lang="ts">
// This is from BlockingMessageComponent.vue in OpenCOR's web app.

defineProps<{
    message: string
}>()
</script>
