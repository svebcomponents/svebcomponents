<script lang="ts">
  interface Props {
    userName: string;
  }
  let { userName }: Props = $props();
</script>

<h1>Hello, {userName}!</h1>

<style>
  h1 {
    color: blue;
    font-family: serif;
  }
</style>
