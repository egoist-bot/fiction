<script lang="ts" setup>
import { vue, waitFor } from '@fiction/core'
import type { Card } from '@fiction/site/card'
import ElEngine from './CardEngine.vue'

defineProps({
  card: { type: Object as vue.PropType<Card>, required: true },
})

/**
 * Delay the footer to show after a short delay.
 * This is to prevent the footer from showing before the main content.
 */
const showDelayed = vue.ref(false)
vue.onMounted(async () => {
  await waitFor(1500)
  showDelayed.value = true
})
</script>

<template>
  <div v-if="card.site">
    <ElEngine tag="header" :card="card.site.sections.value.header" />
    <ElEngine tag="main" :card="card" />
    <ElEngine class="transition-all duration-700" :class="!showDelayed ? 'opacity-0 translate-y-0' : '-translate-y-8'" tag="footer" :card="card.site.sections.value.footer" />
  </div>
</template>
