<script lang="ts">
  import "@svebcomponents/e2e.conditional-export-host";

  let count = $state(2);
  let enabled = $state(true);
</script>

<button id="increment" onclick={() => count += 1}>Increment</button>
<button id="toggle" onclick={() => enabled = !enabled}>Toggle</button>
<p id="host-count">Host count: {count}</p>

<conditional-host-widget
  title="Shared Runtime"
  count={count}
  enabled={enabled}
></conditional-host-widget>
