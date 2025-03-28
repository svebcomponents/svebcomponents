import type { Plugin } from 'vite';
// Only import 'parse' from svelte/compiler
import { parse } from 'svelte/compiler';
import { walk } from 'estree-walker';
import MagicString from 'magic-string';

// Correctly inferred type for the AST object from parse()
type SvelteAst = ReturnType<typeof parse>;

// Using 'any' for flexibility with internal template node types
type SvelteTemplateNode = any;
type SvelteTemplateWalker = (node: SvelteTemplateNode, parent: SvelteTemplateNode | null) => void;

// Configuration (remains the same)
const WRAPPER_COMPONENT_NAME = 'CustomElementWrapper';
const WRAPPER_SOURCE_PACKAGE = '@svebcomponents/ssr/customElementWrapper';
const WRAPPER_TAG_NAME_PROP = 'tagName';
const IMPORT_STATEMENT = `import ${WRAPPER_COMPONENT_NAME} from '${WRAPPER_SOURCE_PACKAGE}';\n`;

export function vitePluginSvebcomponentsSsr(): Plugin {
	return {
		name: 'vite-plugin-svelte-webcomponent-wrapper',
		enforce: 'pre',

		async transform(code, id) {
			if (!id.endsWith('.svelte')) {
				return null;
			}

			let ast = parse(code, { filename: id, modern: true });

			const magicString = new MagicString(code);
			let importNeedsAdding = false;
			let importAdded = false;
			let importExists = false;

			// 1. Check for existing import (logic remains the same)
			const checkImport = (scriptAst: SvelteAst['instance'] | SvelteAst['module'] | null) => {
				if (!scriptAst || !scriptAst.content) return;
				walk(scriptAst.content as any, {
					enter(node: any) {
						if (node.type === 'ImportDeclaration' && node.source.value === WRAPPER_SOURCE_PACKAGE) {
							if (
								node.specifiers.some(
									(spec: any) =>
										spec.type === 'ImportSpecifier' && spec.imported.name === WRAPPER_COMPONENT_NAME
								)
							) {
								importExists = true;
								this.skip();
							}
						}
					}
				});
			};
			checkImport(ast.instance);
			if (!importExists) {
				checkImport(ast.module);
			}

			// 2. Walk the template AST (starting from ast.fragment)
			const walkTemplate: SvelteTemplateWalker = (node, _parent) => {
				if (!node) return;

				// --- Element Identification and Replacement ---
				// Check for regular elements with hyphens in their name
				if (node.type === 'RegularElement' && node.name.includes('-')) {
					const originalTagName = node.name;

					// Overwrite opening tag name
					const openingTagNameStart = node.start + 1;
					const openingTagNameEnd = openingTagNameStart + originalTagName.length;
					magicString.overwrite(openingTagNameStart, openingTagNameEnd, WRAPPER_COMPONENT_NAME, {
						storeName: true
					});

					// Insert the tagName prop
					magicString.appendLeft(
						openingTagNameEnd,
						` ${WRAPPER_TAG_NAME_PROP}="${originalTagName}"`
					);

					// --- Closing Tag Logic ---
					// Check if it's NOT a self-closing tag (void elements handled by parser, others need explicit check)
					const isSelfClosing = code.substring(node.end - 2, node.end) === '/>';
					const isVoidElement = [
						'area',
						'base',
						'br',
						'col',
						'embed',
						'hr',
						'img',
						'input',
						'link',
						'meta',
						'param',
						'source',
						'track',
						'wbr'
					].includes(originalTagName.toLowerCase());

					if (!isSelfClosing && !isVoidElement) {
						// Attempt to find and replace the closing tag using the heuristic
						const closingTagSequence = `</${originalTagName}>`;
						// Search backwards from the node's end for the closing tag
						const closingTagStart = code.lastIndexOf(closingTagSequence, node.end);

						// Add checks to ensure the found tag is likely the correct one
						if (closingTagStart !== -1 && closingTagStart > node.start) {
							// A simple check: is it after the opening tag's closing >?
							const openingTagEndMarker = code.indexOf('>', node.start);
							if (openingTagEndMarker !== -1 && closingTagStart > openingTagEndMarker) {
								const closingTagNameStart = closingTagStart + 2; // Index after '</'
								const closingTagNameEnd = closingTagNameStart + originalTagName.length;
								magicString.overwrite(
									closingTagNameStart,
									closingTagNameEnd,
									WRAPPER_COMPONENT_NAME,
									{ storeName: true }
								);
							}
						}
						// If closing tag isn't found with this heuristic, it might be malformed or complex nesting.
						// Consider adding a warning here if crucial.
					}

					if (!importExists) {
						importNeedsAdding = true;
					}
				}

				// --- Recursion Logic (remains largely the same) ---
				let children: SvelteTemplateNode[] = [];
				// Check specific node types for where children/content might be nested
				if (node.type === 'Fragment') {
					children = node.nodes;
				} else if (node.fragment?.nodes) {
					// Common for elements/components
					children = node.fragment.nodes;
				} else if (node.expression && node.type === 'ExpressionTag') {
					// No children in template sense, but could walk node.expression with estree-walker if needed
				} else if (node.type === 'IfBlock') {
					if (node.consequent) walkTemplate(node.consequent, node);
					if (node.alternate) walkTemplate(node.alternate, node);
				} else if (node.type === 'EachBlock') {
					if (node.body) walkTemplate(node.body, node);
					if (node.fallback) walkTemplate(node.fallback, node);
				} else if (node.type === 'AwaitBlock') {
					if (node.pending) walkTemplate(node.pending, node);
					if (node.then) walkTemplate(node.then, node);
					if (node.catch) walkTemplate(node.catch, node);
				} else if (node.type === 'KeyBlock' || node.type === 'SnippetBlock') {
					if (node.body) walkTemplate(node.body, node);
				}
				// Add checks for other Svelte block types or specific elements as needed.

				children.forEach((child) => walkTemplate(child, node));
			};

			// *** Corrected starting point for template walk ***
			if (ast.fragment) {
				walkTemplate(ast.fragment, null);
			} else {
				console.warn(
					`[vite-plugin-svelte-webcomponent-wrapper] No fragment found in AST for ${id}. Skipping template transformation.`
				);
			}

			// 3. Add the import statement (logic remains the same)
			if (importNeedsAdding && !importAdded) {
				const scriptNode = ast.instance || ast.module;
				if (scriptNode && scriptNode.content) {
					let insertPos = scriptNode.start;
					const body = (scriptNode.content as any)?.body;

					if (body && body.length > 0) {
						let lastImportEnd = insertPos;
						let foundImport = false;
						for (const statement of body) {
							if (statement.type === 'ImportDeclaration') {
								lastImportEnd = statement.end;
								foundImport = true;
							}
						}
						if (foundImport) {
							const charAfterLastImport = code[lastImportEnd];
							const newline = charAfterLastImport === '\n' ? '' : '\n';
							magicString.appendRight(lastImportEnd, newline + IMPORT_STATEMENT);
						} else {
							magicString.prependLeft(insertPos, IMPORT_STATEMENT);
						}
					} else {
						const scriptTagEnd = code.indexOf('>', scriptNode.start);
						if (scriptTagEnd !== -1) {
							magicString.appendLeft(scriptTagEnd + 1, '\n' + IMPORT_STATEMENT);
						} else {
							magicString.prependLeft(insertPos, IMPORT_STATEMENT);
						}
					}
				} else {
					magicString.prepend(`<script>\n${IMPORT_STATEMENT}</script>\n`);
				}
				importAdded = true;
			}

			if (!magicString.hasChanged()) {
				return null;
			}

			console.log(magicString.toString());
			return {
				code: magicString.toString(),
				map: magicString.generateMap({
					source: id,
					file: id,
					includeContent: true
				})
			};
		}
	};
}
