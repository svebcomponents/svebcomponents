<svelte:options customElement={{
props: {
numberProp: {attribute: "number-prop", reflect: true, type: "Number"},
}
}} />
<script lang="ts">
  type Props = {
    numberProp: number;
  }
  let props: Props = $props();
</script>
<h1>{props}</h1>
