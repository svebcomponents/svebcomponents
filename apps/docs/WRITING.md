# Documentation style

Give each page one reader, one job, and one next step.

## Page roles

| Role            | Use it for                     | Order                                |
| --------------- | ------------------------------ | ------------------------------------ |
| Task guide      | Help a reader reach an outcome | prerequisites, steps, result, limits |
| How it works    | Explain a mechanism            | input, actors, output, failure path  |
| Reference       | Record an API or option        | purpose, signature, fields, limits   |
| Troubleshooting | Resolve a known symptom        | message, cause, fix                  |

Put the common path first. Move optional targets, internals, and edge cases to
the page that owns them. Show the result of a task so the reader can check their
work.

## Name the actor

Use these subjects when you describe the pipeline:

| Actor          | Actions                                                                             |
| -------------- | ----------------------------------------------------------------------------------- |
| Svelte         | compiles components, converts attributes, renders, mounts, hydrates                 |
| the browser    | parses declarative shadow DOM, registers and upgrades elements                      |
| svebcomponents | infers metadata, configures builds, generates outputs, wraps custom-element classes |
| a host adapter | routes host templates through a registered server renderer                          |
| Lit Labs       | defines the `ElementRenderer` and `RenderInfo` SSR contracts                        |

Do not present a Svelte feature as a svebcomponents API. Link to Svelte's
documentation when a workflow starts with its custom-element compiler mode.

## Terms

| Term                     | Meaning                                                       |
| ------------------------ | ------------------------------------------------------------- |
| custom element           | the platform element registered with `customElements`         |
| web component library    | the package that distributes one or more custom elements      |
| standalone browser build | a browser entry that includes its runtime dependencies        |
| Svelte build             | a conditional entry that shares Svelte with a Svelte consumer |
| server renderer          | code that renders one element through the SSR registry        |
| host adapter             | the SvelteKit, React, Vue, or Astro integration               |
| entrypoint               | a source file and its matching package export                 |

## Prose

- State the fact. Cut introductions that announce the next sentence.
- Use active voice and name the actor.
- Address the reader as “you.”
- Replace broad claims with the tested hosts or outputs.
- Mix sentence lengths. Do not manufacture emphasis with fragments.
- Skip binary contrasts, rhetorical questions, adverbs, and em dashes.
- Keep code examples complete enough to run.
- Link to one canonical explanation instead of repeating it.

## Before a pull request

Run the docs checks:

```sh
pnpm --filter @svebcomponents/docs check
pnpm --filter @svebcomponents/docs lint
pnpm --filter @svebcomponents/docs build
```

The link lint checks site routes and heading fragments in the docs, package
READMEs, changelogs, root README, and URLs printed by package code.
