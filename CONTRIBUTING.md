## Setup

### 1. install nodejs

To avoid issues based on your environment, you should always use the node version specified in `.nvmrc`.
If you use `nvm` or `fnm` you can run (`nvm use` or `fnm use` respectively) to install the correct node version.

### 2. install & setup corepack

While you can install `pnpm` what ever way you want, I recommend using `corepack` to ensure you are using the version specified in the `packageManager` of the `package.json`.

```bash
npm install --global corepack@latest && corepack enable
```

### 3. install dependencies

```bash
pnpm install
```

### 4. build the entire project

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

Follow the prompts to select the affected package(s) and describe the change; commit the generated file in `.changeset/` along with your change.
