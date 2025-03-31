<script lang="ts">
	import { BROWSER } from 'esm-env';
	import type { Snippet } from 'svelte';

	import Client from './Client.svelte';
	import Server from './Server.svelte';

	let props: {_tagName: string, children: Snippet} = $props();
</script>

{#if BROWSER}
	<Client {...props}/>
{:else}
	<Server {...props}/>
{/if}
