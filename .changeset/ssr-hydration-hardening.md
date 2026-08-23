---
"@svebcomponents/ssr": patch
---

Stop a malformed typed attribute from silently killing a component, and tighten
two smaller gaps around prop delivery.

**Malformed typed attributes.** An `Object`/`Array` typed attribute carrying
invalid JSON threw out of Svelte's own attribute-to-prop conversion. When such
an attribute was present in the server markup, the throw escaped the element's
async `connectedCallback` as an unhandled rejection, leaving the component
**permanently inert**: its server-rendered content stayed on screen and looked
correct, but it never hydrated, never mounted, ignored later attribute writes
and dispatched no events — with no visible error to explain why. On a write
after hydration the same throw escaped a custom element reaction as a
page-level error and skipped the update.

Both paths now skip the unparseable value and warn in dev. The guard is
deliberately narrow: an error that is *not* Svelte's JSON conversion keeps
propagating, so a component's own failure is never hidden behind a silent
no-op. This is really a gap in Svelte's generated code, so it is marked
`Svelte 6 TODO (#8)`.

**Forged transport scripts.** `hydratable` located the server's serialized
rich-prop payload with a `querySelector`, which returns the *first* match. The
server appends its payload as the last child of the shadow root, so anything
matching earlier is page-controlled markup — component content rendered through
`{@html ...}`, for instance — and could impersonate the payload and override
server-serialized props on upgrade. The last match is now the authoritative
one, and every match is removed so no stale or forged payload lingers in the
DOM. Defense in depth rather than a fix for a reachable vulnerability: putting
untrusted markup through `{@html}` is the more serious problem in any scenario
where this mattered.

**Prototype-confusing prop names.** `startRender` and the renderer's
`setProperty` assigned incoming prop names straight onto an object, so a
wrapper forwarding a raw prop bag containing `__proto__` would have reparented
that object — set its `[[Prototype]]` — instead of storing a prop, and
`constructor`/`prototype` would have shadowed those names. The blast radius was
one element's props bag; `Object.prototype` and other objects were never
affected, so this is prop injection rather than prototype pollution, and it
needed a host to spread an attacker-controlled parsed object as props. Those
names are now rejected on the way in, and `HydrationHost.setProps` skips them
when merging. (The two `hydratable` loops that write to `$$d` were already
covered by their `!(name in this.$$d)` guard, which is true for every name on
`Object.prototype`.)
