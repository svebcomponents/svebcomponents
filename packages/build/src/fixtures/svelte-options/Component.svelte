<svelte:options customElement={{
  tag: 'svelte-component',
  props: {
    name: { reflect: false, attribute: 'custom-title' }
  }
}} />

<script lang="ts">
  interface Props {
    title: string;
  }
  let { title }: Props = $props();
</script>

<div>
  {title}
</div>
