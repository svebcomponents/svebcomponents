---
"@svebcomponents/ssr": minor
---

Support Svelte's `$host()` rune in hydratable components.

Previously `$host()` was unusable in svebcomponents components: the SSR build compiles with `customElement: false`, where Svelte hard-errors on `$host()` (`host_invalid_placement`), and even on the client the hydrated path never supplied a host — Svelte compiles `$host()` to `$$props.$$host`, which only Svelte's own fresh-mount custom-element wrapper passed. Component authors had to fall back to dispatching `composed: true` events from an inner node and hoping they retarget.

Now:

- **Server**: the SSR source transform replaces `$host()` calls with `undefined` — behavior-identical to Svelte's own server transform (`$host()` → `void 0`). Components using `$host()` compile for SSR whether or not they declare `<svelte:options customElement>`.
- **Client**: the hydration host passes the custom element through as `$$host`, so `$host()` returns the upgraded element after hydration — exactly as it does in Svelte's fresh-mount path.

`$host()` returns `undefined` during SSR (there is no host element), so guard uses that can run server-side (`$host()?.dispatchEvent(...)`) — event handlers, `onMount`, and `$effect` bodies never run during SSR and need no guard.

Note for editor tooling: Svelte's language server still reports `host_invalid_placement` unless the component declares `<svelte:options customElement>` in source. Declaring it is safe — the SSR build strips it (and since the reflect-defaults change, a bare `customElement="tag-name"` needs no prop overrides).
