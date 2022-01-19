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
- name: Increment Version
  uses: Piszmog/next-version@v1
  with:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    files: package.json,ui/package.json,backend/pom.xml
```
