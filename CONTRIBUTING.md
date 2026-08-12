## Setup

### 1. Install Node.js

Use the Node.js version in `.nvmrc`. Run `nvm use` or `fnm use` if you use one
of those version managers.

### 2. Enable Corepack

Corepack selects the pnpm version from `package.json`:

```bash
npm install --global corepack@latest && corepack enable
```

### 3. Install dependencies

```bash
pnpm install
```

### 4. Build the project

```bash
pnpm build
```

## Running Tests

```bash
pnpm test
```

The browser e2e tests use Playwright with Chromium. On first-time setup, install the browser binary:

```bash
pnpm --filter "@svebcomponents/e2e.basic" exec playwright install chromium
```

## Changesets

If your change affects a published package, describe it with a changeset before opening a PR:

```bash
pnpm changeset
```

Select the affected packages, describe the change, and commit the generated
file in `.changeset/`.

## Repository layout

- `packages/*`: the published svebcomponents packages.
- `apps/docs`: the documentation site (Astro + Starlight), deployed to
  [svebcomponents.dev](https://svebcomponents.dev/).
- `e2e/*`: end-to-end fixtures that build real component packages and render
  them through each host integration.
- `configs/*`: private, shared lint/format/TypeScript/vitest presets. See
  [internal config packages](./docs/internal-config-packages.md).
