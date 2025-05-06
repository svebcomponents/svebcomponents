<svelte:options customElement={{
props: {
arrayProp: {attribute: "array-prop", reflect: true, type: "Array"},
},
}} />
<script lang="ts">
  interface Props {
    arrayProp: Array<string>;
  }
  let props: Props = $props();
</script>
<h1>{props}</h1>
