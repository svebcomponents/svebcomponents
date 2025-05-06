<svelte:options customElement={{
props: {
myNumber: {attribute: "my-number", reflect: true, type: "String"},
}
}} />
<script>
  let {myNumber} = $props();
</script>
<h1>{{myNumber}}</h1>
