import { SvelteCustomElementRenderer, ElementRendererRegistry } from '@svebcomponents/ssr';
import ExampleComponent from '@svebcomponents/example-component/ssr';
import '@svebcomponents/example-component';

const ctor = customElements.get('example-component');
if (!ctor) {
	throw new Error('Could not find custom element constructor for example-component');
}
class ExampleComponentCustomElementRenderer extends SvelteCustomElementRenderer {
	constructor() {
		super(ExampleComponent, ctor, 'example-component');
	}
}

ElementRendererRegistry.set(ctor, ExampleComponentCustomElementRenderer);
