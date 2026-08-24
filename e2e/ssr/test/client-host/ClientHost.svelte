<script lang="ts">
  // import & register the web component
  import "../../dist/client/sync.js";

  interface Props {
    title: string;
    count?: number;
    showLabel?: boolean;
    richDetail?: { note: string } | undefined;
  }

  let {
    title,
    count = 0,
    showLabel = false,
    richDetail = undefined,
  }: Props = $props();
</script>

<!-- The svebcomponents vite plugin rewrites this to the client wrapper
     component, which is what these tests exercise. -->
<sync-component {title} {count} {showLabel} {richDetail}></sync-component>
