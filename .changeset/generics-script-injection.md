---
"@svebcomponents/auto-options": patch
"@svebcomponents/ssr": patch
"@svebcomponents/utils": patch
---

Inject imports after the whole `<script>` tag rather than at its first `>`. A `generics` attribute may contain a `>` of its own (`generics="TData = DefaultDataPoint<'bar'>"`), and the injection landed inside the attribute value, breaking the component with `CompileError: Expected token >`.
