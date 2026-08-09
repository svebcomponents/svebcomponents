---
"@svebcomponents/auto-options": patch
"@svebcomponents/build": patch
"@svebcomponents/ssr-astro": patch
"@svebcomponents/ssr-react": patch
"@svebcomponents/ssr-vue": patch
"@svebcomponents/ssr": patch
"@svebcomponents/utils": patch
---

Declare `license`, `description` and `homepage`, and ship the license text in
the published tarball.

Every package was published without a `license` field and without a license
file of its own. npm only includes `LICENSE*` from the package directory, so the
repository's MIT license never reached consumers and automated license scanners
had nothing to read. Each package now carries its own copy of `LICENSE.md`
alongside `"license": "MIT"`.

`description` is what npm shows on the package page and in search results, and
`homepage` now points at each package's reference page on the documentation
site.
