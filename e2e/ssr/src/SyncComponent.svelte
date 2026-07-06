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
  <p id="count">Count: {typeof count}-{count}</p>
  <p id="enabled">Enabled: {typeof enabled}-{enabled}</p>
</div>
