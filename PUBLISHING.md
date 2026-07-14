# Publishing

## Publish a release

Version `0.1.0` established the package on npm. Subsequent releases publish from `.github/workflows/release.yml` with npm trusted publishing and provenance.

Before releasing:

1. Update `package.json#version` and `CHANGELOG.md` in the same commit.
2. Run `bun run check`.
3. Run `npm run smoke:package` to test the packed tarball in a clean consumer.
4. Run `npm run release:check` to inspect npm's dry-run publication.
5. Push the release commit and wait for CI to pass.
6. Create and push the matching tag, then publish its GitHub release:

```sh
git tag -a v0.1.1 -m "v0.1.1"
git push origin v0.1.1
gh release create v0.1.1 --verify-tag --generate-notes
```

Replace `0.1.1` with the version being released. Publishing the GitHub release triggers the npm workflow; do not run `npm publish` locally for routine releases.

Configure the package's npm trusted publisher with:

- GitHub owner: `thorgas`
- Repository: `eslint-plugin-code-architecture`
- Workflow: `release.yml`
- Environment: `npm`
- Allowed action: `npm publish`

The package publishes only the files named by `package.json#files` plus npm's standard metadata files. Verify that the GitHub release workflow succeeds and that npm's `latest` tag resolves to the released version.
