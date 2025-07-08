<script lang="ts">
  export let message: string = 'Hello';
</script>

<svelte:options customElement="my-component" />

<div>
  {message}
</div>