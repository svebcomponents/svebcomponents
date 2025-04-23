<svelte:options customElement={{
props: {
stringProp: {attribute: "string-prop", reflect: true, type: "String"},
},
}} />
<script lang="ts">
  interface Props {
    stringProp: string;
  }
  let props: Props = $props();
</script>
<h1>{props}</h1>
