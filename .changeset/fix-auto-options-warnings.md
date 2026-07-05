---
"@svebcomponents/auto-options": patch
---

Route build warnings through `console.warn` with a consistent `[svebcomponents/auto-options]` prefix, resolve union prop types (e.g. `string | null`, `number | undefined`, literal unions) without spurious "unhandled type" warnings, and omit function- and `Snippet`-typed props from the generated custom element props so they stay property-only instead of receiving meaningless attribute/reflect metadata.
