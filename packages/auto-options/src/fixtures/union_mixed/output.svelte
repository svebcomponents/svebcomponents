<svelte:options customElement={{
props: {
mixedProp: {attribute: "mixed-prop", reflect: true, type: "String"},
}
}} />
<script lang="ts">
  interface Props {
    mixedProp: string | number;
  }
  let props: Props = $props();
</script>
<h1>{props}</h1>
