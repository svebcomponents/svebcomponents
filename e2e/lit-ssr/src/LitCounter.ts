import { LitElement, html, css } from "lit";

/**
 * A plain Lit element, defined the ordinary way with no svebcomponents
 * involvement whatsoever. The suites render it through svebcomponents' host
 * integrations to prove those integrations are not svelte-specific.
 */
export class LitCounter extends LitElement {
  static override styles = css`
    p {
      color: rgb(0, 0, 255);
    }
  `;

  static override properties = {
    label: { type: String },
    count: { type: Number },
  };

  declare label: string;
  declare count: number;

  constructor() {
    super();
    this.label = "";
    this.count = 0;
  }

  override render() {
    return html`<div>
      <h1>${this.label}</h1>
      <p id="count">Count: ${this.count}</p>
    </div>`;
  }
}

customElements.define("lit-counter", LitCounter);
