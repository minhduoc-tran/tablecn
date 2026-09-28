# @querycn/filter-core

## 0.3.0

### Minor Changes

- 87b1840: Add a `time` field type for a time of day with no date, like `09:30`. It starts with _is between_ and also offers is at, after, at or after, before, at or before and empty, and compares rows by whole minutes (`09:30:45` is at `09:30`). Messages get `placeholders.time`, `placeholders.hour`, `placeholders.minute`, `actions.now` and `actions.ok` for its picker.

## 0.2.0

### Minor Changes

- ecfd3c6: Export `toSearchText`, the case- and accent-insensitive text normalization `applyFilter` uses, so other packages can search rows the same way.

## 0.1.0

### Minor Changes

- 61b8389: First public release: rules AST, readable `field__op=value` URL state with pluggable formats, backend serializers (JSON:API, django-filter, PostgREST), client-side filtering, React provider and hooks, and adapters for the browser, react-router and the Next.js App Router.
