import { test, expect } from "vitest";
import fs from "fs/promises";
import path from "path";

const expected = {
    "client/index.js": {
        content: [
            // the attribute converters inferred by svebcomponent's auto options are passed to create_custom_element (which will populate 'Component.element')
            `create_custom_element(Component, {
	title: {
		attribute: "title",
		reflect: true,
		type: "String"
	},
	count: {
		attribute: "count",
		reflect: true,
		type: "Number"
	},
	enabled: {
		attribute: "enabled",
		reflect: true,
		type: "Boolean"
	}
}, [], [], true);`,
        ],
    },
};

test("auto-options", async () => {
    const clientIndexJs = await fs.readFile(path.resolve(__dirname, "../dist/client/index.js"), "utf-8");
    for (const content of expected["client/index.js"].content) {
        expect(clientIndexJs).toContain(content);
    }
});