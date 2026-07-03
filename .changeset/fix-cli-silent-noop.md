---
"@svebcomponents/build": patch
---

Fix the CLI silently exiting with no output when no component exports could be inferred, and fix the error handler so build failures are reported and exit with a non-zero code.
