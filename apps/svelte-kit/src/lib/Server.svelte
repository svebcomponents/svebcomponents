<script lang="ts">
	import wcRenderer from '@svebcomponents/example-component';
	import { render as renderToHtml } from 'svelte/server';
	const renderOutput = renderToHtml(wcRenderer, { props: { userName: 'test' } });
	console.log(renderOutput);
</script>

<p>server</p>
<example-component>
	{#if renderOutput.body}
		<template shadowrootmode="open">
			{#if renderOutput.head}
				{@html renderOutput.head}
			{/if}
			{@html renderOutput.body}
		</template>
	{/if}
</example-component>
