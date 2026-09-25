import type { TableMessages } from "../table-messages"

const format = new Intl.NumberFormat("vi-VN").format

export const viTableMessages: TableMessages = {
  columns: {
    menu: "Cột",
    hide: "Ẩn cột",
    pinStart: "Ghim đầu",
    pinEnd: "Ghim cuối",
    unpin: "Bỏ ghim",
    color: "Màu",
    noColor: "Không màu",
    customColor: "Màu tuỳ chọn…",
    fitContent: "Vừa nội dung",
    fitAll: "Vừa nội dung tất cả",
    resetLayout: "Đặt lại bố cục",
    options: (column) => `Tuỳ chọn cột ${column}`,
  },
  colors: {
    red: "Đỏ",
    orange: "Cam",
    amber: "Hổ phách",
    green: "Xanh lá",
    teal: "Xanh ngọc",
    blue: "Xanh dương",
    violet: "Tím",
    pink: "Hồng",
  },
  sorting: { asc: "Tăng dần", desc: "Giảm dần", clear: "Bỏ sắp xếp" },
  pagination: {
    label: "Phân trang",
    rowsPerPage: "Số dòng mỗi trang",
    first: "Trang đầu",
    previous: "Trang trước",
    next: "Trang sau",
    last: "Trang cuối",
    morePages: "Các trang khác",
  },
  selection: {
    selectAll: "Chọn tất cả",
    selectRow: "Chọn dòng",
    clear: "Bỏ chọn",
  },
  actions: { reload: "Tải lại", clearFilters: "Xoá bộ lọc", retry: "Thử lại" },
  states: {
    empty: "Không có dữ liệu.",
    error: "Đã có lỗi xảy ra.",
    loading: "Đang tải…",
  },
  header: {
    move: (column) => `Di chuyển cột ${column}`,
    resize: (column) => `Đổi độ rộng cột ${column}`,
    instructions:
      "Để nhấc cột, nhấn phím cách hoặc Enter. Dùng phím mũi tên để di chuyển, phím cách hoặc Enter để thả, Esc để huỷ.",
    pickedUp: (column) => `Đã nhấc cột ${column}.`,
    movedTo: (column, position, total) =>
      `Cột ${column} ở vị trí ${position}/${total}.`,
    dropped: (column, position, total) =>
      `Đã thả cột ${column} ở vị trí ${position}/${total}.`,
    cancelled: (column) => `Đã huỷ di chuyển cột ${column}.`,
  },
  counts: {
    number: format,
    page: (page, pageCount) =>
      pageCount === undefined
        ? `Trang ${format(page)}`
        : `Trang ${format(page)}/${format(pageCount)}`,
    selected: (selected, total) =>
      `Đã chọn ${format(selected)}/${format(total)}`,
    rows: (count) => `${format(count)} dòng`,
  },
}
