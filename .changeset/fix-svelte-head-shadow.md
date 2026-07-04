---
"@svebcomponents/ssr": patch
---

Keep non-style `<svelte:head>` content (such as `<title>` and `<meta>`) out of the rendered shadow root; only `<style>` and `<link rel="stylesheet">` tags are forwarded.
