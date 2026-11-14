# 0003. Gate Development with Biome, tsc and vitest Under npm

## Status

Accepted

## Context

The repository reached its first board card with a source tree, contracts and no tooling: nothing could be linted, type-checked or tested, and no two contributors would have agreed on what "green" meant.

Three forces shaped the answer. Pi loads TypeScript from the manifest's entry, so a build step would produce an artifact nothing consumes and the type gate is a check rather than a compile. The sibling extensions and Pi's own root settle their work the same way: one tool for lint and format, the TypeScript compiler in no-emit mode, and vitest, all driven by npm scripts from the repository root with the lockfile committed. This repository's decisions are meant to follow that practice rather than invent a local one. ADR 0001 also asks that Pi imports be kept out of the domain and use-case layers, which calls for a linter able to express a restricted import when that rule is written.

## Decision

Development is gated by three tools, driven from the repository root by npm scripts, with `package-lock.json` committed:

- **Biome** for both lint and format, kept on its generated baseline with no rule overrides.
- **`tsc --noEmit`** as the type gate, resolved under Node's own ESM rules (`nodenext`) so the `.js` specifiers on `.ts` files resolve with no build step.
- **vitest** as the test runner, with its collected file set fixed in configuration rather than left to discovery.

Biome's scope is a positive allowlist in `biome.json`: the package's own sources and the root configuration files Biome reads, not a set of ignore patterns. One `check` script runs the three in order and stops at the first failure, and nothing in that chain writes, so the fixing run stays a deliberate act. Formatting counts as part of the gate, so a check that fails on style alone is expected behaviour.

## Consequences

**Easier:**

- One binary covers lint, format and import order, so no two configurations have to be kept in agreement, and a contributor has one command to run.
- Tests and type checks run against the TypeScript sources directly on a bare clone, with no build artifact to regenerate before a check means anything.
- The committed lockfile fixes the exact version of every tool the checks run, so a green check on one machine means the same on another.
- The linter carries no overrides yet, which leaves room for the import boundary ADR 0001 describes to arrive as the configuration's first rule rather than as an exception among several.

**More difficult:**

- The allowlist fails open: a new top-level source directory is invisible to the linter until someone adds it, and no failing check will say so.
- Style reaches the check as a failure, so a hand-wrapped line over the width is a red build rather than a review comment, and rewriting it is routine work.
- Choosing npm fixes the package manager: another one means a second lockfile, rewritten scripts, and every command already written into the documentation.
- The test runner and the compiler move major versions on their own schedules, and both are only held still by the lockfile staying committed.
- The import boundary ADR 0001 asks for is not among these checks. Until a rule is added, review is the only thing holding it.
