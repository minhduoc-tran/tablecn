// Kept as-is for readable URLs (`a__in=x,y`, `at__gte=2026-01-31T10:00`, `f[a]=["x"]`); browsers leave them too.
const READABLE = /%(2C|3A|2F|40|24|5B|5D)/g

export function encodeQueryComponent(value: string): string {
  return encodeURIComponent(value).replace(READABLE, (_, hex: string) =>
    String.fromCharCode(parseInt(hex, 16))
  )
}

/** Like `URLSearchParams#toString`, minus the escaping of `,` `:` `/` `@` `$` `[` `]`; an empty value writes the bare key. */
export function renderQueryString(params: URLSearchParams): string {
  return [...params]
    .map(([key, value]) =>
      value === ""
        ? encodeQueryComponent(key)
        : `${encodeQueryComponent(key)}=${encodeQueryComponent(value)}`
    )
    .join("&")
}
