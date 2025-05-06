<svelte:options customElement={{shadow: 'none'}}/>
<script lang="ts">
  interface Props {
    numberProp: number;
  }
  let props: Props = $props();
</script>
<h1>{props}</h1>
