<svelte:options customElement={{props: {fooBar: {reflect: false}}}}/>
<script lang="ts">
  let rest = $props();
</script>
<h1>hi</h1>
