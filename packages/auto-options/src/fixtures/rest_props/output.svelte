<svelte:options customElement={{
props: {
numberProp: {attribute: "number-prop", reflect: true, type: "Number"},
}
}} />
<script lang="ts">
  let {
    numberProp,
    ...rest
  }: {numberProp: number} = $props();
</script>
<h1>{numberProp}{rest}</h1>
