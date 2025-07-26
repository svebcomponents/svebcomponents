export default {
  "client/index.js": {
    content: [
      // the attribute converters inferred by svebcomponent's auto options are passed to create_custom_element (which will populate 'Component.element')
      "create_custom_element(\n\tComponent,\n\t{\n\t\ttitle: {\n\t\t\tattribute: 'title',\n\t\t\treflect: true,\n\t\t\ttype: 'String'\n\t\t},\n\t\tcount: {\n\t\t\tattribute: 'count',\n\t\t\treflect: true,\n\t\t\ttype: 'Number'\n\t\t},\n\t\tenabled: {\n\t\t\tattribute: 'enabled',\n\t\t\treflect: true,\n\t\t\ttype: 'Boolean'\n\t\t}\n\t},\n\t[],\n\t[],\n\ttrue\n);",
      // the custom element definition from the entrypoint is in the output
      'const tagName = "simple-component";\nif (!customElements.get(tagName) && Component.element !== undefined) {\n    customElements.define(tagName, Component.element);\n}',
    ],
    sourcemap: true,
  },
};
