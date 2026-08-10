---
"@svebcomponents/build": patch
---

Resolve a source entry for exports whose target carries no file extension.

`exports` may legally point at an extensionless path. Entry inference stripped
the extension by slicing `-extension.length` off the end, which for an empty
extension is `slice(0, -0)` — the empty string rather than the whole path. Every
candidate source then collapsed to a bare extension, so inference failed even
when the component was sitting right there, and reported it as:

```
[svebcomponents]: could not find a source for ./dist/client/index.
  Expected exactly one of .svelte, .ts, or .js.
```

Such an export now resolves against `src/` like any other.
