<script lang="ts">
	import { ElementRendererRegistry, collectResultSync } from '@svebcomponents/ssr/registry';
	// get the custom element constructor
	const tag = 'example-component';
	const ctor = customElements.get(tag);
	if (!ctor) throw new Error(`Custom element ${tag} not found`);
	// get custom element renderer & instantiate
	const CustomElementRendererCtor = ElementRendererRegistry.get(ctor);
	if (!CustomElementRendererCtor) throw new Error(`Custom element renderer for ${tag} not found`);
	const customElementRenderer = new CustomElementRendererCtor();
	// set attributes
	customElementRenderer.setAttribute('user-name', 'server-test');
	// render
	const shadowStream = customElementRenderer.renderShadow({} as any);
	if (!shadowStream) throw new Error(`Shadow stream for ${tag} not found`);
	const shadow = collectResultSync(shadowStream);
	// TODO: attributes seem not to be rendered
	const attributes = collectResultSync(customElementRenderer.renderAttributes());
	// assemble
	const result = `<${tag} ${attributes}>
	<template shadowrootmode="open">
		${shadow}
	</template>
</${tag}>`;
</script>

<p>server</p>
{@html result}
