<svelte:options customElement={{
props: {
variant: {attribute: "variant", reflect: true, type: "String"},
}
}} />
<script lang="ts">
  interface Props {
    variant: "primary" | "secondary";
  }
  let props: Props = $props();
</script>
<h1>{props}</h1>
