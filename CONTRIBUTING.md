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

## Development

### Submodule

The `template` directory and it's contained packages are a git submodule.
The actual repository is managed in a [separate repository](https://github.com/svebcomponents/template).
This architecture is necessary to keep it a minimal template that can be just cloned and used.
However, to avoid breaking the template & the web components built with it,
it is included as a submodule and it's tests & lints are run in this repository.

Updates to the `svebcomponents/template` repository are not automatically reflected, but have to be pulled in manually.
To update the submodule, run the following command:

```bash
pnpm submodule
```

This will pull in the latest changes from the `svebcomponents/template` repository and then add it's dependencies to the `template` catalog in `pnpm-workspace.yaml`.
Doing so allows us to keep external dependencies the same as in production, while at the same time injecting local `@svebcomponents/*` into the `template` package via pnpm `overrides`.
