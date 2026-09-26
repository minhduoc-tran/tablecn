# @querycn/table-react

## 0.2.0

### Minor Changes

- d583863: Add `enableSorting`, `enableColumnResizing` and `enableColumnOrdering` to `useDataTable`, to turn sorting, resizing or moving columns off for the whole table. `useTableQuery` and `tableUrlOptions` take `enableSorting` too, so the backend never gets a `sort` the table ignores. With no sortable column, the URL's `sort` is ignored and the default sort stays.

## 0.1.0

### Minor Changes

- 1ff757f: First release of `@querycn/table-react`: `useDataTable` with sorting, pages and search in the URL, a saved column layout (order, visibility, pinning, widths, colors) and `@querycn/filter` integration.
