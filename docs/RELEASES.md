# Releases and Packages

Release automation is included in .github/workflows/release.yml.

## Release version

The first documented stable release is v1.0.0.

## Release packages

A version tag such as v1.0.0 triggers a GitHub Release with two generated packages:

- secure-whisper-source-<tag>.zip — source/configuration excluding secrets, local database files, dependencies, and build output.
- secure-whisper-frontend-<tag>.zip — production frontend build.

## Creating a release

From a local clone:

    git tag v1.0.0
    git push origin v1.0.0

The release workflow builds the frontend, creates the packages, and publishes them to the GitHub Release.

## Security

Release archives must never contain server/.env, database files, private keys, production credentials, node_modules, or other private data.
