<svelte:options customElement={{
props: {
objectProp: {attribute: "object-prop", reflect: true, type: "Object"},
},
}} />
<script lang="ts">
  interface Hello {
    hello: string
  }
  interface Props {
    objectProp: Hello;
  }
  let props: Props = $props();
</script>
<h1>{props}</h1>
