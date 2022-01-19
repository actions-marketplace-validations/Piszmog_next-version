# Next Version

[![CI](https://github.com/Piszmog/next-version/actions/workflows/ci.yml/badge.svg)](https://github.com/Piszmog/next-version/actions/workflows/ci.yml)

Increment the **semantic** version of the project to the next version. Used to increment the version at Pull Request
time.

## How does it work?

The Action is driven based on the labels on the Pull Request. The following labels are supported:

| Type            | Label                       |
|-----------------|-----------------------------|
| Major Increment | `version:major`             |
| Minor Increment | `version:minor`             |
| Patch Increment | `version:patch` or No label |

See [Example Pull Request](https://github.com/Piszmog/next-version/pull/6) to see the action in action.

### Example

| Label           | Current Version | New Version |
|-----------------|-----------------|-------------|
| `version:major` | `1.2.3`         | `2.0.0`     |
| `version:minor` | `1.2.3`         | `1.3.0`     |
| `version:patch` | `1.2.3`         | `1.2.4`     |
| No Label        | `1.2.3`         | `1.2.4`     |

## Inputs

| Name           | Required | Description                                                                         |
|----------------|----------|-------------------------------------------------------------------------------------|
| `GITHUB_TOKEN` | True     | GitHub Token used to query files in the repository and commit changes to the branch |
| `files`        | True     | Comma separated list of files containing the version to increment                   |

## Example Usage

```yaml
name: Versioning
on:
  pull_request:
    types:
      - opened
      - labeled
      - synchronize
    branches:
      - main
jobs:
  version:
    name: Version
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Next Version
        uses: Piszmog/next-version@v1.0.3
        with:
          GITHUB_TOKEN: ${{ secrets.PAT }}
          files: package.json

```

## Limitations

### New Workflow Runs are not triggered

Incrementing the version does not trigger a new workflow run. This is due
to [limitations set by GitHub](https://help.github.com/en/actions/reference/events-that-trigger-workflows#triggering-new-workflows-using-a-personal-access-token)
.

> When you use the repository's GITHUB_TOKEN to perform tasks on behalf of the GitHub Actions app, events triggered by the GITHUB_TOKEN will not create a new workflow run. This prevents you from accidentally creating recursive workflow runs.

You can change this by creating a new [Personal Access Token (PAT)](https://github.com/settings/tokens/new) with the ,
storing the token as a secret in your repository and then passing the new token to the action.

```yaml
- uses: Piszmog/next-version@v1
  with:
    GITHUB_TOKEN: ${{ secrets.YOUR_PAT }}
```

If you work in an organization and don't want to create a PAT from your personal account, we recommend using
a [robot account](https://docs.github.com/en/github/getting-started-with-github/types-of-github-accounts) for the token.
