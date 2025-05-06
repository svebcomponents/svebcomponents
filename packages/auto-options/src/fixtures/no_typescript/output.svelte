<svelte:options customElement={{
props: {
myNumber: {attribute: "my-number", reflect: true, type: "String"},
}
}} />
<script>
  let {
    myNumber,
    ...rest
  } = $props();
</script>
<h1>{myNumber}{rest}</h1>
