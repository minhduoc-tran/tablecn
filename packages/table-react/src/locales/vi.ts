import type { TableMessages } from "../table-messages"

export const viTableMessages: TableMessages = {
  columns: {
    menu: "Cột",
    hide: "Ẩn cột",
    pinStart: "Ghim đầu",
    pinEnd: "Ghim cuối",
    unpin: "Bỏ ghim",
    color: "Màu",
    noColor: "Không màu",
    fitContent: "Vừa nội dung",
    fitAll: "Vừa nội dung tất cả",
    resetLayout: "Đặt lại bố cục",
  },
  sorting: { asc: "Tăng dần", desc: "Giảm dần", clear: "Bỏ sắp xếp" },
  pagination: {
    rowsPerPage: "Số dòng mỗi trang",
    first: "Trang đầu",
    previous: "Trang trước",
    next: "Trang sau",
    last: "Trang cuối",
  },
  selection: { selectAll: "Chọn tất cả", selectRow: "Chọn dòng" },
  actions: { reload: "Tải lại", clearFilters: "Xoá bộ lọc", retry: "Thử lại" },
  states: {
    empty: "Không có dữ liệu.",
    error: "Đã có lỗi xảy ra.",
    loading: "Đang tải…",
  },
  counts: {
    page: (page, pageCount) =>
      pageCount === undefined ? `Trang ${page}` : `Trang ${page}/${pageCount}`,
    selected: (selected, total) => `Đã chọn ${selected}/${total}`,
    rows: (count) => `${count} dòng`,
  },
}
