<script lang="ts">
	import type { Snippet } from 'svelte';
	import { isKebabCase, camelizeKebabCase, TODO } from 'utils';
	import { collectResultSync } from '@lit-labs/ssr/lib/render-result.js';

	import { ElementRendererRegistry } from '../runtime/rendererRegistry.js';

	interface WebComponentWrapperProps {
		children: Snippet;
		_tagName: string;
		[key: string]: any;
	}

	let { children, _tagName: tag, ...props }: WebComponentWrapperProps = $props();

	// get the custom element constructor
	const ctor = customElements.get(tag);
	if (!ctor) throw new Error(`Custom element ${tag} not found`);
	// get custom element renderer & instantiate
	const CustomElementRendererCtor = ElementRendererRegistry.get(ctor);
	if (!CustomElementRendererCtor) throw new Error(`Custom element renderer for ${tag} not found`);
	const customElementRenderer = new CustomElementRendererCtor();
	// set attributes / props
	for (const [key, value] of Object.entries(props)) {
		if (key === '_tagName' || key === 'children') continue;
		if (typeof value === 'string' && isKebabCase(key)) {
			customElementRenderer.setAttribute(key, value);
			continue;
		}
		if (isKebabCase(key)) {
			customElementRenderer.setProperty(camelizeKebabCase(key), value);
			continue;
		}
		customElementRenderer.setProperty(key, value);
	}
	// render
	const shadowStream = customElementRenderer.renderShadow({} as any);
	if (!shadowStream) throw new Error(`Shadow stream for ${tag} not found`);
	const shadow = collectResultSync(shadowStream);
	// TODO: attributes seem not to be rendered
	// Attributes should probably be escaped?
	const attributes = collectResultSync(customElementRenderer.renderAttributes());
	TODO('implement attribute rendering', attributes);
</script>

<p>server</p>

<svelte:element this={tag}>
	<template shadowrootmode="open">
		{@html shadow}
	</template>
	{@render children()}
</svelte:element>
