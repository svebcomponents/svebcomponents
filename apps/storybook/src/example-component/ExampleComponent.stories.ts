import "@svebcomponents/example-component";
import { createRenderFunction } from "utils";

const render = createRenderFunction({
  svelteComponent: {} as any,
  customElementTagName: "example-component",
});

export default {
  title: "Example/Button",
  tags: ["autodocs"],
  render,
  argTypes: {
    userName: { control: "text" },
  },
};

export const Primary = {
  args: {
    userName: "Example User Name",
  },
};
