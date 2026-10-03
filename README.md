<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./interlinked-dark.svg">
    <img src="./interlinked.svg" alt="interlinked logo" width="120">
  </picture>
</p>

<h1 align="center">Interlinked GitHub Action</h1>

Runs the [interlinked](https://github.com/unveil-project/interlinked) detector on a pull request's description and appends the result to the description itself, inside an `<!-- interlinked:start -->` … `<!-- interlinked:end -->` block. Later runs replace that block, and it is stripped before analysis so it never affects the score.

```yaml
name: interlinked

on:
  pull_request_target:
    types: [opened, edited, reopened]

permissions:
  contents: read
  pull-requests: write

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: MatteoGabriele/interlinked@v0
        with:
          label: agent-written # optional
```

Use `pull_request_target` so the token can write to PRs from forks. The action never checks out or runs PR code, so that's safe here. Edits made with the default `GITHUB_TOKEN` don't trigger new workflow runs, so updating the description doesn't loop.

## Inputs

| Input | Default | Description |
| --- | --- | --- |
| `github-token` | `${{ github.token }}` | Reads the PR template, updates the description, manages the label. |
| `update-description` | `true` | Append the analysis to the PR description. |
| `label` | | Label to add when the verdict is `ai` and remove otherwise. |
| `fail-on-ai` | `false` | Fail the step when the verdict is `ai`. |

## Outputs

`verdict` (`ai` or `human`), `probability`, `confidence`, and `signals` (JSON). The analysis is also written to the job summary.

## Development

The action bundles `@unveil/interlinked` from npm into `dist/index.mjs`, which is committed because Actions runs it straight from the repo. Rebuild after changing `src/` or bumping the detector:

```sh
pnpm build
```
