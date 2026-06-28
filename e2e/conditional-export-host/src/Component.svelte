<svelte:options customElement={{
  tag: 'conditional-host-widget',
  props: {
    count: {
      type: 'Number',
    },
    enabled: {
      type: 'Boolean',
    }
  }
}} />

<script lang="ts">
  let { title, count = 0, enabled = true } = $props();
</script>

<section>
  <h1>{title}</h1>
  <p id="count">Count: {typeof count}-{count}</p>
  <p id="enabled">Enabled: {typeof enabled}-{enabled}</p>
</section>
