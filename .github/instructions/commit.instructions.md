---
applyTo: "**"
name: "GitHub Copilot Commit Message Instructions (Best Practice)"
description: "Instructions for GitHub Copilot to generate perfect git commit messages following Conventional Commits format."
---

# GitHub Copilot Commit Message Instructions (Best Practice)

**You are an expert senior engineer who writes perfect git commit messages.**

## Rules (MUST follow exactly)

1. **Always use Conventional Commits format**

   ```
   <type>(<optional scope>): <short summary in imperative mood>

   <body with full motivation and changes if non-trivial>

   <footer with BREAKING CHANGE or references if needed>
   ```

2. **Allowed types (use the one that fits best):**

   - `feat` – new feature for the user
   - `fix` – bug fix for the user
   - `docs` – documentation only changes
   - `style` – formatting, missing semi-colons, etc.; no production code change
   - `refactor` – code changes that neither fix a bug nor add a feature
   - `perf` – code changes that improve performance
   - `test` – adding missing tests or correcting existing tests
   - `build` – changes that affect the build system or external dependencies
   - `ci` – changes to CI configuration files and scripts
   - `chore` – other changes that don't modify src or test files
   - `revert` – reverts a previous commit

3. **Summary line rules**

   - Imperative mood (use "Add", "Fix", "Update", not "Added", "Fixed")
   - Max 72 characters (Copilot will auto-wrap)
   - Start with capital letter
   - No period at the end
   - If it affects multiple areas, use scope: `feat(auth)`, `fix(ui/login)`, `refactor(parser)`

4. **Body (write when useful)**

   - Explain **why** the change was made and **what** changed at a high level
   - Wrap at 100 characters
   - Use Markdown (lists, code blocks) freely
   - Reference issues/PRs with `Closes #123`, `Fixes #456`, etc.

5. **BREAKING CHANGE footer**

   - If the change breaks public API or behavior, add:
     ```
     BREAKING CHANGE: description of breaking change
     ```

6. **Examples you should emulate**

```text
feat(auth): add OAuth2 login with GitHub and Google

Implements the new unified auth flow using next-auth v5.
Replaces the old custom session cookies.

Closes #312
```

```text
fix(editor): prevent crash when pasting extremely large images

Adds size validation (max 10MB) and graceful fallback with toast.
Previously the renderer would OOM on >50MB pastes.

Fixes #892
```

```text
refactor(compiler): migrate from Babel to SWC parser

Speeds up type checking by ~40% in large files.
No behavior change for end users.

BREAKING CHANGE: drops support for .babelrc config files
```

```text
chore: upgrade TypeScript to 5.6 and eslint to v9
```

7. **Never do**
   - "Update file.ts"
   - "Fix bug"
   - "Add comments"
   - Commit messages longer than one line when trivial
   - Use past tense

**Your job:** When I run `git commit` with Copilot active, generate the perfect message following these rules. Never ask me questions — just output the final commit message.

````

### Bonus: Make it even stronger (optional add-on)

Add this at the very top of the file (some people report it helps):

```markdown
@@ COPILOT_COMMIT_MESSAGE @@
````

Copilot now treats everything in this file as the ultimate authority for commit messages.

Drop this file in your repo **once** and you will instantly have the best commit messages on planet Earth — no more garbage, no more reminders, no more "what did I even do?" commits.

You’re welcome. 🚀
