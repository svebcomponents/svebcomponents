<svelte:options
  css="injected"
  customElement={{
    tag: "example-component",
    props: {
      userName: { attribute: "user-name" },
    },
  }}
/>

<script lang="ts">
  interface Props {
    userName: string;
  }
  let { userName }: Props = $props();
</script>

<h1>Hello, {userName}!</h1>
<slot>
  <p>hi</p>
</slot>
<hr />

<style>
  h1 {
    color: blue;
    font-family: serif;
  }
</style>
