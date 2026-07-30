export interface LitAppProps {
  label: string;
}

/** Renders a plain Lit element — no svebcomponents-built component involved. */
export const LitApp = ({ label }: LitAppProps) => (
  <div id="app">
    <lit-counter label={label} count="4">
      <p id="light-dom">light dom child</p>
    </lit-counter>
  </div>
);

export default LitApp;
