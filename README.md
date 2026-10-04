<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./interlinked-dark.svg">
    <img src="./interlinked.svg" alt="interlinked logo" width="120">
  </picture>
</p>

<h1 align="center">Interlinked</h1>

<p align="center">
  <a href="https://github.com/MatteoGabriele/interlinked-action/releases/latest"><img src="https://img.shields.io/github/v/release/MatteoGabriele/interlinked-action?label=release&color=8b5cf6" alt="Latest release"></a>
  <img src="https://img.shields.io/badge/runtime-node24-339933?logo=nodedotjs&logoColor=white" alt="Runs on Node 24">
  <a href="./package.json"><img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT license"></a>
</p>

Runs the [interlinked](https://github.com/unveil-project/interlinked) detector on a pull request's description and labels the PR when it reads as agent-written. In `full` and `description` modes it also publishes the analysis, as a PR comment by default or appended to the description inside an `<!-- interlinked:start -->` … `<!-- interlinked:end -->` block. Later runs edit that comment or block in place, and the block is stripped before analysis so it never affects the score.

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
```

Use `pull_request_target` so the token can write to PRs from forks. The action never checks out or runs PR code, so that's safe here. Edits made with the default `GITHUB_TOKEN` don't trigger new workflow runs, so updating the description or comment doesn't loop.

## Inputs

| Input | Default | Description |
| --- | --- | --- |
| `github-token` | `${{ github.token }}` | Reads the PR template, updates the description, manages the label. |
| `allowed-users` | | Usernames to skip, comma-separated or as a JSON array. |
| `trusted-author-associations` | `member,owner` | Author associations to skip (`collaborator`, `contributor`, `first_timer`, `first_time_contributor`, `member`, `owner`), comma-separated or as a JSON array. Set to `""` to analyze everyone. |
| `mode` | `labels` | `full` (description and labels), `labels` (labels only), `description` (description only) or `silent` (outputs and job summary only). |
| `analysis-location` | `comment` | Where `full` and `description` modes publish the analysis: `comment` (a separate PR comment, edited in place on reruns) or `description` (appended to the PR description). See the warning below. |
| `label-ai` | `agent-written` | Label to add when the verdict is `ai`. It's never removed automatically, so editing the description can't clear it; a maintainer removes it. |
| `auto-close` | `false` | Close the PR when the verdict is `ai`. |
| `message-ai` | | Custom message added to the analysis when the verdict is `ai`. |
| `message-human` | | Custom message added to the analysis when the verdict is `human`. |
| `fail-on-ai` | `false` | Fail the step when the verdict is `ai`. |

These follow the same conventions as [agentscan-action](https://github.com/MatteoGabriele/agentscan-action), so both can share one workflow configuration.

> [!WARNING]
> With `analysis-location: description`, the analysis lives in text the PR author controls. They can edit or delete it, or rewrite it to say the opposite. The label and the default comment can only be changed by maintainers, so rely on those for anything you enforce.

## Outputs

`verdict` (`ai` or `human`), `probability`, `confidence`, and `signals` (JSON). The analysis is also written to the job summary.

