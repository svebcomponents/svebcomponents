<svelte:options customElement={{props: {
fooBar: {attribute: "foo-bar", reflect: false, type: "String"},
}}}/>
<script lang="ts">
  let rest = $props();
</script>
<h1>hi</h1>
