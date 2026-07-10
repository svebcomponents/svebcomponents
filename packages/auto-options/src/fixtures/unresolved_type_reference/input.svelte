<script lang="ts">
  import type { SomeImportedType } from "./elsewhere";
  interface Props {
    data: SomeImportedType;
  }
  let props: Props = $props();
</script>
<h1>{props}</h1>
