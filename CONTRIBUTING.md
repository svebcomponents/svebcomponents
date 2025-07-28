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

### 5. install (AGAIN)

After building the project, you need to install the dependencies again to ensure that all packages are linked correctly.

```bash
pnpm install
```

The first pnpm install can't link our local command-line tools because their files haven't been built yet. The second pnpm install allows us to correctly link the now-existing tool bin files.
