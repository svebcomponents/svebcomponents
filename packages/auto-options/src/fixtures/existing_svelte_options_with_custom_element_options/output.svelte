<svelte:options customElement={{
props: {
numberProp: {attribute: "number-prop", reflect: true, type: "String"},
},
}} />
<script lang="ts">
  interface Props {
    numberProp: number;
  }
  let props: Props = $props();
</script>
<h1>{props}</h1>
