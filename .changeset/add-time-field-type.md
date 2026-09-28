---
"@querycn/filter-core": minor
---

Add a `time` field type for a time of day with no date, like `09:30`. It starts with *is between* and also offers is at, after, at or after, before, at or before and empty, and compares rows by whole minutes (`09:30:45` is at `09:30`). Messages get `placeholders.hour` and `placeholders.minute` for its input.
