<script lang="ts">
  interface Props {
    label: string;
    onClick?: () => void;
  }
  let { label, onClick }: Props = $props();
</script>
<button onclick={onClick}>{label}</button>
