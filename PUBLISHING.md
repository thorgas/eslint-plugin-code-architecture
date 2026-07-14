# Publishing

## Publish the first release

The repository, package metadata, `v0.1.0` release contents, tests, and npm tarball are prepared. The first publication must establish ownership of the package on npm, so it is intentionally a manual account-authenticated operation:

```sh
cd eslint-plugin-code-architecture
npm login
npm run release:publish
```

`release:publish` runs `prepublishOnly` first, so lint and all rule tests must pass before npm receives the package. It explicitly publishes the unscoped package with public access. If npm requires a one-time password, enter it at the prompt.

The local first release does not request provenance because npm provenance is generated from supported cloud CI environments. After `0.1.0` exists, future GitHub releases can publish through `.github/workflows/release.yml` with trusted publishing and provenance. Configure its npm trusted publisher with:

- GitHub owner: `thorgas`
- Repository: `eslint-plugin-code-architecture`
- Workflow: `release.yml`
- Environment: `npm`
- Allowed action: `npm publish`

The package publishes only the files named by `package.json#files` plus npm's standard metadata files.
