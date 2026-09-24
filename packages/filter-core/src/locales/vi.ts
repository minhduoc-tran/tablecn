import type { FilterMessages } from "../messages"

const dateOperators = {
  eq: "vào ngày",
  gt: "sau",
  gte: "từ",
  lt: "trước",
  lte: "đến",
}

export const viMessages: FilterMessages = {
  operators: {
    eq: "là",
    ne: "không phải",
    contains: "chứa",
    notContains: "không chứa",
    startsWith: "bắt đầu bằng",
    endsWith: "kết thúc bằng",
    gt: "lớn hơn",
    gte: "lớn hơn hoặc bằng",
    lt: "nhỏ hơn",
    lte: "nhỏ hơn hoặc bằng",
    between: "trong khoảng",
    in: "thuộc",
    notIn: "không thuộc",
    isEmpty: "để trống",
    isNotEmpty: "có giá trị",
  },
  operatorsByType: {
    number: { eq: "bằng", ne: "khác" },
    date: dateOperators,
    datetime: dateOperators,
  },
  join: {
    where: "Khi",
    and: "và",
    or: "hoặc",
    toggle: "Nối các điều kiện bằng",
  },
  actions: {
    open: "Bộ lọc",
    addRule: "Thêm điều kiện",
    removeRule: "Xóa điều kiện",
    clearAll: "Xóa hết",
    apply: "Áp dụng",
    cancel: "Hủy",
    retry: "Thử lại",
  },
  placeholders: {
    field: "Chọn trường",
    operator: "Chọn phép so sánh",
    value: "Nhập giá trị",
    search: "Tìm kiếm…",
    from: "Từ",
    to: "Đến",
    date: "Chọn ngày",
    datetime: "Chọn ngày giờ",
  },
  rangeSeparator: "–",
  counts: {
    selected: (count) => `Đã chọn ${count}`,
    more: (count) => `+${count}`,
    activeFilters: (count) => `${count} bộ lọc`,
  },
  empty: {
    rules: "Chưa có điều kiện nào",
    fields: "Không tìm thấy trường",
    options: "Không có kết quả",
  },
  loading: "Đang tải…",
  errors: { loadOptions: "Không tải được dữ liệu" },
  boolean: { true: "Có", false: "Không" },
  warnings: {
    reversedRange: "Điểm đầu của khoảng nằm sau điểm cuối",
    conflict:
      "Trường này đã có điều kiện khác; máy chủ có thể bỏ qua một trong hai",
    unsupported: "Máy chủ không hỗ trợ điều kiện này nên sẽ bị bỏ qua",
  },
}
