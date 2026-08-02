<script setup lang="ts">
defineProps<{ label: string }>();
</script>

<template>
  <div id="app">
    <lit-counter :label="label" count="4">
      <p id="light-dom">light dom child</p>
    </lit-counter>
  </div>
</template>
