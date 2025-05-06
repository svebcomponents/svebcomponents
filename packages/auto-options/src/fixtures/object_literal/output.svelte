<svelte:options customElement={{
props: {
objectProp: {attribute: "object-prop", reflect: true, type: "Object"},
}
}} />
<script lang="ts">
  interface Props {
    objectProp: {'key': string};
  }
  let props: Props = $props();
</script>
<h1>{props}</h1>
