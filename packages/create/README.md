`@svebcomponents/create` lets you scaffold a svebcomponents project with
[Vite+](https://viteplus.dev/guide/create). The package is in beta.

## Usage

```bash
vp create @svebcomponents:library
```

`library` is the
[svebcomponents template](https://github.com/svebcomponents/template): a pnpm
workspace with a Svelte custom element package and a SvelteKit app that
server-renders and hydrates it. Pass `--directory` to choose the target folder.

`vp create @svebcomponents` opens a picker instead. Non-interactive runs need
the template name.

## How the template is bundled

The package bundles a pinned commit of the template repository, recorded in
the `templateSource` field of its `package.json`. Check which template commit a
published version contains with:

```bash
npm view @svebcomponents/create templateSource
```
