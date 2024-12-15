<svelte:options
  customElement={{
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
