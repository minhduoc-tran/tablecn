---
"@querycn/table-react": minor
---

Edit cells inline. A column's `meta.edit` picks its editor (`text`, `number`, `select`, `boolean`, or your own type), and `useDataTable`'s `onCellEdit` saves each change: it gets `{ row, rowId, columnId, value, previous, option }`, may return a promise, and throws to reject a value with a message. `canEditCell(row, columnId)` turns editing off per row. A `select` can load its options from your API with `loadOptions(search, signal)`, like a filter field. Adds `formatCellText`, `parseCellText`, the `CellEdit` and `CellEditor` types, and the `editing` messages group (English and Vietnamese).
