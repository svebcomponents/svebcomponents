<script lang="ts">
  interface Props {
    mixedProp: string | number;
  }
  let props: Props = $props();
</script>
<h1>{props}</h1>
