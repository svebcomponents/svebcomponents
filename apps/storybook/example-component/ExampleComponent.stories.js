import "@svebcomponents/example-component";
import { html } from "lit";
import { spread } from "@open-wc/lit-helpers";

const render = (args) => {
  return html` <example-component ${spread(args)}></example-component> `;
};

export default {
  title: "Example/Button",
  tags: ["autodocs"],
  render,
  argTypes: {
    "user-name": { control: "text" },
  },
};

export const Primary = {
  args: {
    "user-name": "Example User Name",
  },
};
