---
"@querycn/table-react": minor
---

Bulk edit the selected rows. `useDataTable`'s new `onBulkEdit` saves the same values in every selected row in one call: it gets `{ rowIds, rows, changes, options }`, where `changes` holds the new value of each column and `options` the picked option of each `select` column. Without it, a bulk edit calls `onCellEdit` for each changed cell. Adds `getBulkEditColumns(table, rows)`, the columns a bulk edit can change, and `applyBulkEdit(table, rows, changes, options)`, plus the `BulkEdit` type and the `bulkEdit` messages group (English and Vietnamese).
