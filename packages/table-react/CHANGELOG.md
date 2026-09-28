# @querycn/table-react

## 0.3.0

### Minor Changes

- 464b489: Edit cells inline. A column's `meta.edit` picks its editor (`text`, `number`, `select`, `boolean`, or your own type), and `useDataTable`'s `onCellEdit` saves each change: it gets `{ row, rowId, columnId, value, previous, option }`, may return a promise, and throws to reject a value with a message. `canEditCell(row, columnId)` turns editing off per row. A `select` can load its options from your API with `loadOptions(search, signal)`, like a filter field. Adds `formatCellText`, `parseCellText`, the `CellEdit` and `CellEditor` types, and the `editing` messages group (English and Vietnamese).

### Patch Changes

- Updated dependencies [87b1840]
  - @querycn/filter-core@0.3.0
  - @querycn/filter-react@0.3.0

## 0.2.0

### Minor Changes

- d583863: Add `enableSorting`, `enableColumnResizing` and `enableColumnOrdering` to `useDataTable`, to turn sorting, resizing or moving columns off for the whole table. `useTableQuery` and `tableUrlOptions` take `enableSorting` too, so the backend never gets a `sort` the table ignores. With no sortable column, the URL's `sort` is ignored and the default sort stays.

## 0.1.0

### Minor Changes

- 1ff757f: First release of `@querycn/table-react`: `useDataTable` with sorting, pages and search in the URL, a saved column layout (order, visibility, pinning, widths, colors) and `@querycn/filter` integration.
