<script lang="ts">
	import { browser } from '$app/environment';
	import type { Snippet } from 'svelte';

	import Client from './Client.svelte';
	import Server from './Server.svelte';

	let { children }: { children: Snippet } = $props();
</script>

{#if browser}
	<Client _tagName="example-component" user-name="test">
		{@render children()}
	</Client>
{:else}
	<Server _tagName="example-component" user-name="test">
		{@render children()}
	</Server>
{/if}
