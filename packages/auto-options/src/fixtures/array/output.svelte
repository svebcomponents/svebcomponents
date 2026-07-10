<svelte:options customElement={{
props: {
arrayProp: {attribute: "array-prop", reflect: false, type: "Array"},
}
}} />
<script lang="ts">
  interface Props {
    arrayProp: string[];
  }
  let props: Props = $props();
</script>
<h1>{props}</h1>
