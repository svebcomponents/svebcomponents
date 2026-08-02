<script setup lang="ts">
defineProps<{ title: string }>();
</script>

<template>
  <div id="app">
    <simple-component :title="title" count="5" enabled="" />
  </div>
</template>
