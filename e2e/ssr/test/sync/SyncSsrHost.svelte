<script lang="ts">
  // import & register web component
  import "../../dist/client/sync.js";

  interface Props {
    title: string;
    count?: number;
    enabled?: boolean;
  }

  let { title, count, enabled }: Props = $props();
</script>

<sync-component {title} {count} {enabled}></sync-component>
