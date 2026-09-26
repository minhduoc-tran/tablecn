---
"@querycn/table-react": minor
---

Add `enableSorting`, `enableColumnResizing` and `enableColumnOrdering` to `useDataTable`, to turn sorting, resizing or moving columns off for the whole table. `useTableQuery` and `tableUrlOptions` take `enableSorting` too, so the backend never gets a `sort` the table ignores. With no sortable column, the URL's `sort` is ignored and the default sort stays.
