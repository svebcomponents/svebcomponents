<script lang="ts">
  interface User {
    id: number;
    name: string;
    email?: string;
  }

  export let user: User;
  export let showEmail: boolean = false;
</script>

<svelte:options customElement="user-card" />

<div class="user-card">
  <h3>{user.name}</h3>
  <p>ID: {user.id}</p>
  {#if showEmail && user.email}
    <p>Email: {user.email}</p>
  {/if}
</div>