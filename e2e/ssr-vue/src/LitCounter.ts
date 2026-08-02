import { LitElement, html, css } from "lit";

/** A plain Lit element — no svebcomponents involvement in its definition. */
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
