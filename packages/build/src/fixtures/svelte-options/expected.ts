export default {
  "client/index.js": {
    content: [
      // the custom element is registered inline with the provided options when <svelte:options customElement={options}> is used
      "customElements.define('svelte-component', create_custom_element(\n\tComponent,\n\t{\n\t\tname: { attribute: 'custom-title', type: 'String' },\n\t\ttitle: {\n\t\t\tattribute: 'title',\n\t\t\treflect: true,\n\t\t\ttype: 'String'\n\t\t}\n\t},\n\t[],\n\t[],\n\ttrue\n));",
    ],
    sourcemap: true,
  },
};
