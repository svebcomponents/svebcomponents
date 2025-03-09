<script lang="ts">
	import { browser } from '$app/environment';
	import Client from './Client.svelte';
	import Server from './Server.svelte';

	let { children } = $props();
</script>

{#if browser}
	<Client>
		{@render children()}
	</Client>
{:else}
	<Server>
		{@render children()}
	</Server>
{/if}
