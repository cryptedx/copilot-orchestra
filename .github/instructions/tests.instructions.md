---
applyTo: "**"
name: "GitHub Copilot Test Instructions"
description: "Instructions for GitHub Copilot to write high-quality tests."
---

# GitHub Copilot Test Instructions

Write tests that make a senior dev nod in approval:

- Vitest + React Testing Library
- AAA pattern (Arrange-Act-Assert)
- One expectation per test
- Descriptive test names: "should do X when Y"
- Test error cases and loading states
- Use `screen.debug()` only when teaching
- Mock at the right level (never mock library internals)
