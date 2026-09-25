# Code standards

## General

- TypeScript strict, ESM only. `filter-core` has no runtime dependencies; keep it that way.
- Files: kebab-case, named after what they hold (`use-browser-url-adapter.ts`). Split files that grow past ~200 lines along real boundaries.
- Comments: only a non-obvious reason or constraint, one line where possible. No file banners, no JSDoc restating a name or type.
- Public API goes through each package's `src/index.ts`. Anything exported is documented in `apps/web/content/docs`.

## Behaviour rules

- URLs are user input: decoding never throws, bad rules are dropped one by one.
- Rules are normalized through the field type (`normalizeRule`) before use; incomplete rules are never applied or written.
- Objects keyed by user data use `Object.create(null)` or `hasOwn`, so names like `constructor` or `__proto__` stay plain keys.
- React: props that feed memoized values (`fields`, `registry`, `urlFormat`, `serializer`, `messages`) are expected to keep their identity. Adapters back `useSyncExternalStore`: methods are called unbound and `read` returns a stable value.

## Tests

- vitest next to the code (`*.test.ts[x]`); server-render tests as `*.server.test.tsx`.
- Registry UI tests run against all three flavours (Radix, Base UI, React Aria) with the same cases.
- No mocks of the unit under test; use the memory adapter or a deferred adapter for async routers.

## Commits and releases

- Conventional commits (`feat(filter): …`, `fix(web): …`, `docs(web): …`). Work goes straight to `main`.
- Any change to a published package needs a changeset: `pnpm changeset`.
- Before pushing: `pnpm turbo run lint typecheck test`.
