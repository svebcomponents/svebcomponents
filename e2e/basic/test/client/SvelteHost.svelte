<script lang="ts">
  import "@svebcomponents/e2e.basic";

  let count = $state(2);
  let enabled = $state(true);
</script>

<button id="increment" onclick={() => (count += 1)}>Increment</button>
<button id="toggle" onclick={() => (enabled = !enabled)}>Toggle</button>
<p id="host-count">Host count: {count}</p>

<simple-component title="Standalone" {count} {enabled}></simple-component>
