<svelte:options customElement={{shadow: 'none',
props: {
numberProp: {attribute: "number-prop", reflect: true, type: "Number"},
}}}/>
<script lang="ts">
  interface Props {
    numberProp: number;
  }
  let props: Props = $props();
</script>
<h1>{props}</h1>
