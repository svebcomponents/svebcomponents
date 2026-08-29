import { formatLabel, type LabelOptions } from "./helpers.js";

export class Issue176State {
  options = $state<LabelOptions>({ label: "Issue 176" });
  label = $derived(formatLabel(this.options.label));
}
