/**
 * The plain-tag path: `jsxImportSource` routes `<sync-component>` through the
 * package's JSX runtime with no import in this file. `sync-component` renders
 * synchronously, so the sync wrapper can server-render it.
 */
export const dynamic = "force-dynamic";

export default function RscSyncPage() {
  return (
    <div id="app">
      <sync-component
        title="RSC Sync"
        count="3"
        enabled=""
        meta={{ note: "rich prop survived" }}
      >
        <p id="light-dom">light dom child</p>
      </sync-component>
    </div>
  );
}
