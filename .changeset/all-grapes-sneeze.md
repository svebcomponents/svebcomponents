---
"@svebcomponents/build": patch
---

svebcomponent consumers who use svelte themselves don't necessarily need the svelte runtime included with their webcomponents as they could share the runtime with the host app.
note that this comes with risks, as the svelte runtime is an implementation detail and as such does not guarantee compatibility even between patch & minor versions.
if both your web components and your host were built with the same version of svelte you can shave off the cost of including the runtime though
