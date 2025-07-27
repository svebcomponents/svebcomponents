<script lang="ts">
  // import & register web component
  import '../../dist/client/index.js';

  interface Props {
    title: string;
    count?: number;
    enabled?: boolean;
  }

  let { title, count, enabled }: Props = $props();
</script>

<simple-component {title} {count} {enabled}></simple-component>
