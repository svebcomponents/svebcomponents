<script lang="ts">
  interface Props {
    title: string;
    count?: number;
    enabled?: boolean;
  }

  let { title, count = 0, enabled = true }: Props = $props();
</script>

<div>
  <h1>{title}</h1>
  <span>Count: {count}</span>
  <p>Enabled: {enabled}</p>
</div>
