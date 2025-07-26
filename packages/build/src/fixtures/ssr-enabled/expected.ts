export default {
  "client/index.js": {
    content: [
      // the attribute converters inferred by svebcomponent's auto options are passed to create_custom_element (which will populate 'Component.element')
      "create_custom_element(\n\tComponent,\n\t{\n\t\ttitle: {\n\t\t\tattribute: 'title',\n\t\t\treflect: true,\n\t\t\ttype: 'String'\n\t\t},\n\t\tcount: {\n\t\t\tattribute: 'count',\n\t\t\treflect: true,\n\t\t\ttype: 'Number'\n\t\t},\n\t\tenabled: {\n\t\t\tattribute: 'enabled',\n\t\t\treflect: true,\n\t\t\ttype: 'Boolean'\n\t\t}\n\t},\n\t[],\n\t[],\n\ttrue\n);",
      // the client side custom element ctor is registered to the customElements registry
      'const tagName = "simple-component";\nif (!customElements.get(tagName) && Component.element !== undefined) {\n    customElements.define(tagName, Component.element);\n}',
    ],
    sourcemap: true,
  },
  "server/index.js": {
    content: [
      // the component for server-side rendering is in the output
      "function Component($$payload, $$props) {\n\tlet { title, count = 0, enabled = true } = $$props;\n\n\t$$payload.out += `<div><h1>${escape_html(title)}</h1> <span>Count: ${escape_html(count)}</span> <p>Enabled: ${escape_html(enabled)}</p></div>`;\n}",
      // the server-side component is registered to the shimmed customElements registry
      'const tagName = "simple-component";\nif (!customElements.get(tagName) && Component.element !== undefined) {\n    customElements.define(tagName, Component.element);\n}',
    ],
    sourcemap: true,
  },
  "server/ssr.js": {
    content: [
      // the component-specific custom element renderer is created & exported
      "import { SvelteCustomElementRenderer } from '@svebcomponents/ssr';\nimport ServerSvelteComponent from './index.js';\nimport ClientSvelteComponent from '../client/index.js';\n\nconst ctor = ClientSvelteComponent.element;\nif (!ctor) {\n  throw new Error('Could not access custom element constructor');\n}\nclass ComponentSpecificSvelteCustomElementRenderer extends SvelteCustomElementRenderer {\n  constructor() {\n    super(ServerSvelteComponent, ctor);\n  }\n}\n\nexport default ComponentSpecificSvelteCustomElementRenderer;",
    ],
    sourcemap: false,
  },
};
