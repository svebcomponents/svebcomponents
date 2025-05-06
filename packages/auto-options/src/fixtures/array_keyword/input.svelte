<script lang="ts">
  interface Props {
    arrayProp: Array<string>;
  }
  let props: Props = $props();
</script>
<h1>{props}</h1>
