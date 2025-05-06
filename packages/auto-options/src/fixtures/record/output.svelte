<svelte:options customElement={{
props: {
objectProp: {attribute: "object-prop", reflect: true, type: "Object"},
}
}} />
<script lang="ts">
  interface Props {
    objectProp: Record<string, string>
  }
  let props: Props = $props();
</script>
<h1>{props}</h1>
