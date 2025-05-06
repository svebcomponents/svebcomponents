<svelte:options customElement={{
props: {
propOne: {attribute: "this-should-not-be-changed", reflect: true, type: "String"},
propTwo: {attribute: "prop-two", reflect: true, type: "Boolean"},
}
}} />
<script lang="ts">
  interface Props {
    propOne: number;
    propTwo: boolean;
  }
  let props: Props = $props();
</script>
<h1>{props}</h1>
