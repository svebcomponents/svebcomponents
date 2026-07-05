<svelte:options customElement={{
props: {
label: {attribute: "label", reflect: true, type: "String"},
}
}} />
<script lang="ts">
  interface Props {
    label: string;
    onClick?: () => void;
  }
  let { label, onClick }: Props = $props();
</script>
<button onclick={onClick}>{label}</button>
