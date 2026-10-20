# form-builder-js — monorepo

Source of the [`@nodari-pruidze/form-builder-js`](packages/form-builder) npm package and a Next.js demo app that uses it.
Package docs (install, JSON format, customizing): [packages/form-builder/README.md](packages/form-builder/README.md).

```
packages/form-builder/   the published package
  src/core/              no React: types, parseFormSchema, validateFormValues, Zod schema, visibility, defaults, messages
  src/react/             FormBuilder, Stepper, Fields (lists, arrays, info), FormField, FieldInput, FileInput, classNames
  test/                  vitest (core in node, components in jsdom)
apps/demo/               Next.js app using the package like any other project would
.changeset/              pending version bumps
.github/workflows/       CI (typecheck, test, build) + release to npm
```

## Develop

```bash
npm install
npm run dev            # builds the package once, starts the demo on http://localhost:3000 (wizard) and /farm (one-page sections)
npm run dev:package    # in a second terminal: rebuild the package on every change
npm test               # package tests
npm run typecheck      # all workspaces
npm run build          # package + demo
```

The demo imports the **built** package (`dist/`), exactly like other projects will. Keep `dev:package` running while you change the package.

## Release

1. After a change to the package, run `npm run changeset` and choose patch / minor / major. Commit the generated file.
2. Push to `main`. The Release workflow opens a "Version Packages" PR that bumps the version and updates the changelog.
3. Merge that PR, and the workflow publishes to npm.

Publishing uses npm **Trusted Publishing**, so there's no npm token to store or renew. One-time setup, done after the first manual publish:
- On npmjs.com, open `@nodari-pruidze/form-builder-js` → Settings → Trusted publishing → GitHub Actions.
- Enter owner `nodi100`, repository `form-builder-js` and workflow `release.yml`, and leave the environment empty.

Manual publish (needs 2FA on your npm account): `cd packages/form-builder && npm publish --access public`.
