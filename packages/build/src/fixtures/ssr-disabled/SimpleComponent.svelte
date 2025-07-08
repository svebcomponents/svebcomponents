<script lang="ts">
  export let name: string = 'Test';
</script>

<svelte:options customElement="simple-component" />

<span>{name}</span>