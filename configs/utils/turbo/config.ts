export default function generator(plop): void {
  plop.setGenerator("component", {
    description: "Adds a new react component",
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
        path: "src/{{kebabCase name}}/{{pascalCase name}}/svelte",
        templateFile: "component-template/src/ComponentTemplate.hbs",
      },
    ],
  });
}
