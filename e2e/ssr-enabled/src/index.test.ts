import { test, expect } from "vitest";
import fs from "fs/promises";
import path from "path";

const expected = {
    "client/index.js": {
        content: [
            `create_custom_element(Component, {\n\ttitle: {\n\t\tattribute: "title",\n\t\treflect: true,\n\t\ttype: "String"\n\t},\n\tcount: {\n\t\tattribute: "count",\n\t\treflect: true,\n\t\ttype: "Number"\n\t},\n\tenabled: {\n\t\tattribute: "enabled",\n\t\treflect: true,\n\t\ttype: "Boolean"\n\t}\n}, [], [], true);`,
        ],
    },
    "server/index.js": {
        content: [
            `function Component($$payload, $$props) {`,
            `let { title, count = 0, enabled = true } = $$props;`,
            `$$payload.out += `<div><h1>${__svebcomponents_override_svelte_ssr_slot_implementation_virtual_module_exports.escape(title)}</h1> <span>Count: ${__svebcomponents_override_svelte_ssr_slot_implementation_virtual_module_exports.escape(count)}</span> <p>Enabled: ${__svebcomponents_override_svelte_ssr_slot_implementation_virtual_module_exports.escape(enabled)}</p></div>`;`,
            `}`,
        ],
    },
    "server/ssr.js": {
        content: [
            `import { SvelteCustomElementRenderer } from '@svebcomponents/ssr';`,
            `import ServerSvelteComponent from './index.js';`,
            `import ClientSvelteComponent from '../client/index.js';`,
            `const ctor = ClientSvelteComponent.element;`,
            `if (!ctor) {`,
            `throw new Error('Could not access custom element constructor');`,
            `}`,
            `class ComponentSpecificSvelteCustomElementRenderer extends SvelteCustomElementRenderer {`,
            `constructor() {`,
            `super(ServerSvelteComponent, ctor);`,
            `}`,
            `}`,
            `export default ComponentSpecificSvelteCustomElementRenderer;`,
        ],
    },
};

test("ssr-enabled", async () => {
    const clientIndexJs = await fs.readFile(path.resolve(__dirname, "../dist/client/index.js"), "utf-8");
    for (const content of expected["client/index.js"].content) {
        expect(clientIndexJs).toContain(content);
    }

    const serverIndexJs = await fs.readFile(path.resolve(__dirname, "../dist/server/index.js"), "utf-8");
    for (const content of expected["server/index.js"].content) {
        expect(serverIndexJs).toContain(content);
    }

    const serverSsrJs = await fs.readFile(path.resolve(__dirname, "../dist/server/ssr.js"), "utf-8");
    for (const content of expected["server/ssr.js"].content) {
        expect(serverSsrJs).toContain(content);
    }
});