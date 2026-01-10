<template lang="pug">
    Message.absolute(
        class="bg-transparent! outline-none! top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-[1rem] pt-[1.2rem] pb-[0.75rem] z-[99999]"
        severity="secondary"
    )
        i.pi.pi-cog.pi-spin(
            class="block! text-center! text-[3rem]!"
        )
        br
        span.block.text-center(
            class="text-[1.2rem] max-w-36"
        ) {{ message }}
</template>

<script setup lang="ts">
// This is based on BlockingMessageComponent.vue in OpenCOR's web app.

defineProps<{
    message: string
}>()
</script>
