<svelte:options customElement={{
props: {
data: {attribute: "data", reflect: false, type: "String"},
}
}} />
<script lang="ts">
  import type { SomeImportedType } from "./elsewhere";
  interface Props {
    data: SomeImportedType;
  }
  let props: Props = $props();
</script>
<h1>{props}</h1>
