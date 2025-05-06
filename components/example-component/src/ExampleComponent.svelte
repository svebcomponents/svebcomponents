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
<slot name="footer" data-slotted>
  <p>footer</p>
</slot>
<hr />

<style>
  h1 {
    color: blue;
    font-family: serif;
  }
</style>
