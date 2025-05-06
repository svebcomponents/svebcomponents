<svelte:options customElement={{
props: {
propOne: {type: "String", attribute: "this-should-not-be-changed"},
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
