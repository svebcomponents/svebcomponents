import { test, expect } from "vitest";
import fs from "fs/promises";
import path from "path";

const expected = {
    "client/index.js": {
        content: [
            `customElements.define("svelte-component", create_custom_element(Component, {\n\tname: {\n\t\tattribute: "custom-title",\n\t\ttype: "String"\n\t},\n\ttitle: {\n\t\tattribute: "title",\n\t\treflect: true,\n\t\ttype: "String"\n\t}\n}, [], [], true));`,
        ],
    },
};

test("svelte-options", async () => {
    const clientIndexJs = await fs.readFile(path.resolve(__dirname, "../dist/client/index.js"), "utf-8");
    for (const content of expected["client/index.js"].content) {
        expect(clientIndexJs).toContain(content);
    }
});