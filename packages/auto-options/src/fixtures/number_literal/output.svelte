<svelte:options customElement={{
props: {
numberProp: {attribute: "number-prop", reflect: true, type: "Number"},
},
}} />
<script lang="ts">
  interface Props {
    numberProp: 4;
  }
  let props: Props = $props();
</script>
<h1>{props}</h1>
