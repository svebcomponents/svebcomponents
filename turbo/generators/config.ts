export default function generator(plop): void {
  plop.setGenerator("component", {
    description: "Adds a new react component",
    data: {
      curlies: "hoge",
    },
    prompts: [
      {
        type: "input",
        name: "name",
        message: "What is the name of your web component? (PascalCase)",
      },
    ],
    actions: [
      {
        type: "add",
        path: "packages/{{kebabCase name}}/src/{{pascalCase name}}.svelte",
        templateFile: "component-template/src/ComponentTemplate.hbs",
      },
      {
        type: "add",
        path: "packages/{{kebabCase name}}/src/index.ts",
        templateFile: "component-template/src/index.hbs",
      },
      {
        type: "add",
        path: "packages/{{kebabCase name}}/tsconfig.json",
        templateFile: "component-template/tsconfig.json",
      },
      {
        type: "add",
        path: "packages/{{kebabCase name}}/prettier.config.js",
        templateFile: "component-template/prettier.config.js",
      },
      {
        type: "add",
        path: "packages/{{kebabCase name}}/eslint.config.js",
        templateFile: "component-template/eslint.config.js",
      },
      {
        type: "add",
        path: "packages/{{kebabCase name}}/svelte.config.js",
        templateFile: "component-template/svelte.config.js",
      },
      {
        type: "add",
        path: "packages/{{kebabCase name}}/vite.config.js",
        templateFile: "component-template/vite.config.js",
      },
      {
        type: "add",
        path: "packages/{{kebabCase name}}/package.json",
        templateFile: "component-template/package.hbs",
      },
    ],
  });
}
