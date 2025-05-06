<script lang="ts">
  interface Props {
    booleanProp: boolean;
  }
  let props: Props = $props();
</script>
<h1>{props}</h1>
