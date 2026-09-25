# Codebase summary

pnpm + Turborepo monorepo. Public npm packages under `@querycn`, a shadcn registry for the UI, and a Fumadocs site.

## Layout

```
apps/web                    Docs site (Next.js + Fumadocs) and the shadcn registry source
  content/docs/             MDX pages (filter/*: overview, install, fields, URL state, serializers…)
  registry/{radix,base,aria}/filter/   UI blocks, one copy per primitive library
  registry/shared/filter/   Code shared by the three flavours
  registry.json             Registry source; scripts/build-registry.mjs writes public/r/* (git-ignored)
packages/filter-core        TS only, zero deps
packages/filter-react       Headless React bindings (+ react-router subpath)
packages/filter-next        Next.js App Router adapter, provider, server parser
packages/ui                 Private shadcn components used by the docs
packages/{eslint,typescript}-config   Shared tooling (private)
```

## filter-core

| Area | Files |
| --- | --- |
| Model | `types.ts` (`FilterState { join, rules }`, `FilterRule`, `FilterValue`) |
| Registry | `operators.ts`, `field-types.ts`, `registry.ts` (`createRegistry` for custom types/operators) |
| Validation | `validation.ts` (`normalizeRule`: complete + canonical value, or `null`) |
| Draft state | `reducer.ts` (`filterReducer`) |
| URL | `url-format.ts` (`UrlFormat`, default `field__op=value`), `url-codec.ts` (`encodeFilters`, `decodeFilters`, `isFilterParam`), `query-string.ts` (light escaping) |
| Backend | `serializers/*`: JSON:API (default), django-filter, PostgREST, `createParamsSerializer` |
| Client | `client-filter/*`: `applyFilter`, `createRowMatcher` |
| i18n | `messages.ts`, `locales/en.ts`, `locales/vi.ts` (subpath `@querycn/filter-core/locales/vi`) |

## filter-react

- `FilterProvider` keeps a **draft** (editing) and the **applied** filter (decoded from the adapter). Apply writes the encoded filter, replacing every filter param and keeping the others.
- Three contexts (`applied`, `actions`, `draft`) so applied consumers don't re-render while typing.
- Adapters (`UrlStateAdapter`: `read(): string` query string, `write(patch)`): memory, browser history, react-router (`/react-router` subpath). `use-adapter-value.ts` bridges async router writes.
- Hooks: `useFilter`, `useAppliedFilter`, `useFilterRule`, `useFieldOptions` (async select options, cached), `useRuleWarnings`.

## filter-next

`useNextAdapter({ shallow })`, `NextFilterProvider`, and `parseFilters` (`/server` subpath) for server components and route handlers.

## Data flow

fields → draft rules → Apply → URL (`status__eq=paid`) → applied filter → serializer (backend query) or `applyFilter` (rows in the browser).

## Tooling

- Build: `tsup` (ESM + d.ts). Tests: vitest (+ Testing Library). Lint: ESLint flat config. Format: Prettier.
- Release: changesets (`fixed` group for the three packages). `.github/workflows/release.yml` opens a "Version Packages" PR, merging it publishes with npm provenance. CI runs lint, typecheck, test and build on every push/PR.
