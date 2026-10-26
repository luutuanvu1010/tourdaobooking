// ĐƯỜNG GỌI CHÍNH của từng trang có lối vào (trước ở trường `goi` của `TRANG`, `muc-giao-dien.ts`). Tách riêng (sổ đại lý đợt 2, Task 12 — Ruling R-P27 / R-128):
// chỉ BÀI RÀO đọc bảng này (`tests/audit/muc-hien-mo-duoc-khung.mjs`: mục hiện ⇔ đường gọi chính không bị máy chủ từ chối), không trang nào nhập — để chuỗi đường
// gọi không nằm trong gói giao diện của mọi trang. `satisfies Record<KhoaTrang, …>` ⇒ thêm trang vào `TRANG` mà quên dòng ở đây (hoặc thừa dòng) thì `npm run typecheck`
// đỏ; bài `src/muc-giao-dien-goi.test.ts` kiểm lại cùng điều đó lúc chạy. `goi` của trang chỉ cần đăng nhập là /api/auth/me (initShell gọi ở mọi trang). Đường có
// tham số bắt buộc ghi kèm tham số hợp lệ (vd bảng kê: khoảng ngày) — thiếu thì máy chủ trả 400 trước khi xét quyền, bài rào coi 400 là mã lạ (đỏ).
// `null` chỉ khi có trong danh sách MIỄN của bài rào kèm lý do (thiếu ⇒ bài đỏ "chưa khai").
import type { GoiChinh, KhoaTrang } from "./muc-giao-dien.ts";

export const GOI_CHINH = {
  trangChu: "GET /api/orders/dashboard",
  donHang: "GET /api/orders",
  taoDon: "GET /api/catalog/for-order",
  danhBa: "GET /api/parties",
  dichVu: "GET /api/catalog/admin",
  taiKhoan: "GET /api/staff",
  phien: "GET /api/sessions",
  diaDiem: "GET /api/locations",
  loaiGiayToNguoi: "GET /api/parties/documents/meta",
  dieuPhoi: "GET /api/van-chuyen/lich",
  xeDangChay: "GET /api/van-chuyen/lich",
  deNghi: "GET /api/van-chuyen/de-nghi",
  bangGiaXe: "GET /api/van-chuyen/bang-gia",
  bangKeXe: "GET /api/van-chuyen/chi-phi?tu=2026-10-01&den=2026-10-01",
  xe: "GET /api/van-chuyen/xe",
  lichXeBan: "GET /api/van-chuyen/ban-xe",
  sapHetHan: "GET /api/van-chuyen/sap-het-han",
  loaiGiayToXe: "GET /api/van-chuyen/meta",
  chinhSachDieuPhoi: "GET /api/van-chuyen/moc-ra-lenh", // ADR-0128 Q1: route mốc mở cho cả Quản trị lẫn Toàn quyền; Toàn quyền còn đọc thêm chính sách đầy đủ
  lyDoDieuPhoi: "GET /api/van-chuyen/ly-do",
  khoaThang: "GET /api/ledger/ky",
  soCongNo: "GET /api/ledger",
  dieuChinhCongNo: "GET /api/ledger/adjustment-requests",
  hoaHong: "GET /api/pricing/hoa-hong",
  nguoiBan: "GET /api/pricing/cung-ung",
  chupBu: "GET /api/orders/cho-chup-bu",
  choXacNhan: "GET /api/orders/cho-xac-nhan",
  nhatKy: "GET /api/audit",
  guiThongBao: "GET /api/thong-bao/da-gui",
  troLy: "GET /api/tro-ly/cai-dat",
  giaoDien: "GET /api/giao-dien",
  trangTaiXe: "GET /api/parties/documents/mine",
  cuoc: "GET /api/van-chuyen/cuoc-cua-toi",
  ban: "GET /api/van-chuyen/ban/cua-toi",
  toi: "GET /api/auth/me",
  gopY: "GET /api/feedback/mine",
  troGiup: "GET /api/auth/me",
} as const satisfies Record<KhoaTrang, GoiChinh | null>;
