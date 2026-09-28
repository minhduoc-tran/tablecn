import type { FieldDefinition } from "@querycn/filter-core"

export interface Order {
  id: string
  customer: string
  email: string
  status: "paid" | "pending" | "refunded"
  city: string
  amount: number
  shipped: boolean
  deliveryDate: string
  createdAt: string
}

const CITIES = ["Hà Nội", "Hồ Chí Minh", "Đà Nẵng", "Singapore", "Bangkok"]

// One field per filter type: text, select, multiSelect, number, boolean, date, datetime.
export const orderFields: FieldDefinition[] = [
  { name: "customer", label: "Customer", type: "text" },
  {
    name: "status",
    label: "Status",
    type: "select",
    options: [
      { label: "Paid", value: "paid" },
      { label: "Pending", value: "pending" },
      { label: "Refunded", value: "refunded" },
    ],
  },
  {
    name: "city",
    label: "City",
    type: "multiSelect",
    options: CITIES.map((city) => ({ label: city, value: city })),
  },
  { name: "amount", label: "Amount", type: "number", defaultOperator: "gte" },
  { name: "shipped", label: "Shipped", type: "boolean" },
  { name: "deliveryDate", label: "Delivery", type: "date" },
  { name: "createdAt", label: "Created at", type: "datetime" },
]

const FIRST =
  "Nguyễn|Olivia|Trần|Jackson|Đặng|Isabella|Lê|Noah|Phạm|Emma".split("|")
const LAST =
  "Văn An|Martin|Thị Bình|Lee|Minh Châu|Nguyen|Hoàng|Smith|Quốc Huy|Brown".split(
    "|"
  )
const STATUSES = ["paid", "pending", "paid", "refunded", "paid"] as const

const pad = (part: number) => String(part).padStart(2, "0")
const day = (offset: number) =>
  new Date(Date.UTC(2026, 0, 1 + offset)).toISOString().slice(0, 10)

// Made-up but stable, so the server and the browser render the same rows.
// Times have no zone, so every visitor sees and filters the same hours.
export const ORDERS: Order[] = Array.from({ length: 500 }, (_, index) => {
  const created = (index * 37) % 270
  const status = STATUSES[(index * 3) % 5]!
  return {
    id: `ORD-${1001 + index}`,
    customer: `${FIRST[index % 10]} ${LAST[(index * 7) % 10]}`,
    email: `customer${1001 + index}@example.com`,
    status,
    city: CITIES[(index * 11) % 5]!,
    amount: ((index * 7919) % 99000) / 100 + 5,
    shipped: status === "paid" && index % 3 !== 0,
    deliveryDate: day(created + 2 + (index % 5)),
    createdAt: `${day(created)}T${pad((index * 5) % 24)}:${pad((index * 17) % 60)}`,
  }
})
