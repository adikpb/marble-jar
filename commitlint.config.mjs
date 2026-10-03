/**
 * Conventional Commits config for marble-jar.
 *
 * Commit format: type(scope)?: description
 * Allowed types: feat, fix, chore, ci, docs, style, refactor, perf, test,
 * build, revert.
 */

/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "chore",
        "ci",
        "docs",
        "style",
        "refactor",
        "perf",
        "test",
        "build",
        "revert",
      ],
    ],
    "subject-case": [0],
    "header-max-length": [2, "always", 100],
    "body-max-line-length": [0, "always"],
    "footer-max-line-length": [0, "always"],
  },
  prompt: {
    // Keep interactive prompts quiet/CI-safe.
    defaultType: "chore",
    types: [
      { value: "feat", description: "new user-facing feature" },
      { value: "fix", description: "bug fix" },
      { value: "ci", description: "CI / quality gates" },
      { value: "chore", description: "maintenance" },
      { value: "refactor", description: "no behavior change" },
      { value: "test", description: "tests only" },
      { value: "docs", description: "documentation" },
    ],
  },
};
