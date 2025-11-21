---
applyTo: "**"
name: "GitHub Copilot Refactor Instructions"
description: "Instructions for GitHub Copilot to perform thorough code refactoring following best practices."
---

# GitHub Copilot Refactor Instructions

When I highlight code and say "refactor", do:

- Extract pure functions/components
- Remove duplication
- Better naming (no abbreviations)
- Add JSDoc/types where missing
- Use early returns
- Prefer declarative over imperative
- Never change behavior
- Keep the diff as small and safe as possible
