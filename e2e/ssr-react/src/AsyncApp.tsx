export interface AsyncAppProps {
  title: string;
}

/**
 * `simple-component` both awaits while rendering and has an async
 * `SsrPrepare` hook, so its renderer cannot be driven from React's
 * synchronous render.
 */
export const AsyncApp = ({ title }: AsyncAppProps) => (
  <div id="app">
    <simple-component title={title} count="5" enabled="" />
  </div>
);

export default AsyncApp;
