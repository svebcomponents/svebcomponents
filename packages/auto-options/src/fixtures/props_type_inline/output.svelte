<svelte:options customElement={{
props: {
numberProp: {attribute: "number-prop", reflect: true, type: "Number"},
}
}} />
<script lang="ts">
  let props: {
    numberProp: number;
  } = $props();
</script>
<h1>{props}</h1>
