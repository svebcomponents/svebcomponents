---
"@svebcomponents/build": patch
"@svebcomponents/auto-options": patch
---

Fix Windows portability issues:

- `@svebcomponents/build` now uses `path.posix` consistently in
  `inferComponents`. The values flowing through it come from package.json
  `exports` (always posix) and become generated import specifiers, which must
  stay posix. Previously `path.normalize` could flip them to backslashes on
  win32. `existsSync` filesystem checks remain safe because Node's fs APIs
  accept forward slashes on Windows.
- `@svebcomponents/auto-options` build script no longer relies on `rm -rf`,
  which fails on Windows cmd/PowerShell. It now uses a portable `node -e`
  `fs.rmSync` call to clean stale `dist` output before `tsc`.
