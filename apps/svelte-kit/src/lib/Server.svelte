<script lang="ts">
	import { ElementRendererRegistry, collectResultSync } from '@svebcomponents/ssr/registry';
	// get the custom element constructor
	const tag = 'example-component';
	const ctor = customElements.get(tag);
	if (!ctor) throw new Error(`Custom element ${tag} not found`);
	// get custom element renderer
	// TODO: this should not get the renderer instance, but the renderer constructor
	const customElementRenderer = ElementRendererRegistry.get(ctor);
	if (!customElementRenderer) throw new Error(`Custom element renderer for ${tag} not found`);
	// set attributes
	customElementRenderer.setAttribute('user-name', 'server-test');
	// render
	const shadowStream = customElementRenderer.renderShadow({} as any);
	if (!shadowStream) throw new Error(`Shadow stream for ${tag} not found`);
	const shadow = collectResultSync(shadowStream);
	const attributes = collectResultSync(customElementRenderer.renderAttributes());
	// assemble
	const result = `
<${tag} ${attributes}>
  <template shadowrootmode="open">
		${shadow}
	</template>
</${tag}>
	`;
</script>

<p>server</p>
{@html result}
