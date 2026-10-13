// ADR-0114 D1 + D2 (chủ duyệt 2026-10-13) — phần HIỂN THỊ ở trang đơn (web/order.ts). Thuần, không DOM, không I/O, không import src/modules/.
// Luật nghiệp vụ KHÔNG ở đây: máy chủ quyết "có nhắc khuyến mại hay không" (`canhBaoKhuyenMai` của so-khach-van-phong.ts) và dựng các dòng lịch sử
// (`dungLichSuSoKhach` của lich-su-so-khach.ts); giao diện chỉ nhận chữ / dòng đã tính rồi ghép để hiện. Không tính gì về giảm giá hay tiền ở đây.
// Bài canh: so-khach-hien-thi.test.ts. Cần mắt người (màu đỏ cạnh câu vàng, khối ẩn / hiện): kịch bản Chrome ở bảng web/CLAUDE.md.
import type { DongLichSuSoKhachDto } from "./contracts.ts";
import { paxFullText } from "./order-view.ts";

// ---- D1: câu nhắc về số khách / giảm giá -------------------------------------------------------------------------------

/** Một câu nhắc: `khoa` = giá trị thuộc tính `data-canh-bao` (khoá "tong-am" GIỮ tên cũ — kịch bản Chrome cũ dò theo nó); `muc` = màu: đỏ (khuyến mại) hay vàng (giảm giá vượt). */
export interface CauNhacSoKhach {
  khoa: "khuyen-mai" | "tong-am";
  muc: "do" | "vang";
  cau: string;
}

/**
 * MỘT chỗ ghép chữ cho hai nơi hiện: khối Thanh toán (từng câu một dòng, màu theo `muc`) và dải báo sau lệnh sửa số khách (`daiSauSuaSoKhach`).
 * Chữ của từng câu đi qua NGUYÊN VĂN từ máy chủ (khuyến mại) hoặc từ `canhBaoGiamGiaVuot` (giảm giá vượt) — không chép tay câu nào ở giao diện.
 * Thứ tự: đỏ trước, vàng sau. Câu rỗng / null coi như không có.
 */
export function cauNhacSoKhach(v: { tongAm: string | null; khuyenMai: string | null }): CauNhacSoKhach[] {
  const out: CauNhacSoKhach[] = [];
  if (v.khuyenMai) out.push({ khoa: "khuyen-mai", muc: "do", cau: v.khuyenMai });
  if (v.tongAm) out.push({ khoa: "tong-am", muc: "vang", cau: v.tongAm });
  return out;
}

/** Dải báo sau `POST /api/orders/:id/money-edit`. `xong` = tiêu đề khi có câu nhắc; `xanh` = tiêu đề khi không có câu nào (dải xanh thông tin). */
export interface DaiSauSuaSoKhach {
  xong: string;
  xanh: string;
  /** Các câu nhắc, đã sắp thứ tự (đỏ trước). Rỗng ⇒ dải xanh. */
  them: string[];
  /** `danger` khi có câu khuyến mại (đỏ); còn lại `warning` (vàng) như trước ADR-0114. */
  tone: "warning" | "danger";
}

export function daiSauSuaSoKhach(r: { daGhi: boolean; canhBaoTongAm: string | null; canhBaoKhuyenMai: string | null }): DaiSauSuaSoKhach {
  // Chữ hai tiêu đề này GIỮ NGUYÊN so với trước ADR-0114 (kịch bản Chrome sua-so-khach-smoke.mjs khớp theo chữ).
  const xanh = r.daGhi ? "Đã lưu số khách mới, Nền tảng đã tính lại tiền." : "Số khách không đổi nên không ghi gì.";
  const cau = cauNhacSoKhach({ tongAm: r.canhBaoTongAm, khuyenMai: r.canhBaoKhuyenMai });
  const coDo = cau.some((c) => c.muc === "do");
  // Tiêu đề "Đã lưu…" chỉ khi đã ghi (phiếu phản biện ADR-0109 thiếu 9).
  const xong = !r.daGhi || cau.length === 0 ? xanh : coDo ? "Đã lưu số khách mới — đơn có giảm giá, cần xem lại khuyến mại." : "Đã lưu số khách mới — giảm giá đang lớn hơn tiền dịch vụ.";
  return { xong, xanh, them: cau.map((c) => c.cau), tone: coDo ? "danger" : "warning" };
}

// ---- D2: khối "Số khách qua các lần sửa" --------------------------------------------------------------------------------

/** Một dòng đã sẵn sàng để vẽ: nhãn, số khách theo từng dịch vụ bằng chữ thường, tạm tính đã định dạng tiền. */
export interface DongLichSuHienThi {
  buoc: DongLichSuSoKhachDto["buoc"];
  nhan: string;
  dichVu: { ten: string; khach: string }[];
  tamTinh: string;
}

/**
 * Dựng các dòng của khối "Số khách qua các lần sửa" từ khoá `lichSuSoKhach` máy chủ gửi. Trả `null` (giao diện ẩn cả khối) khi:
 * máy chủ không gửi (`null` — người xem không có `order.history.view`), mảng rỗng, hoặc đơn CHƯA SỬA LẦN NÀO (không có dòng `dieu_chinh` và dòng `hien_hanh`
 * không mang `lanSua`; đơn nháp và đơn mới xác nhận rơi vào đây vì máy chủ vẫn trả hai dòng trùng số). Chủ điều phối 2026-10-13: khối chỉ hiện khi có ít nhất một lần sửa.
 * Nhãn "Lần sửa n" đếm theo THỨ TỰ dòng (n = vị trí, bắt đầu từ 1), không theo số thô của bảng điều chỉnh. `dinhDangTien` do nơi gọi truyền (web dùng `vnd`).
 */
export function dongLichSuHienThi(dong: readonly DongLichSuSoKhachDto[] | null, dinhDangTien: (n: number) => string): DongLichSuHienThi[] | null {
  if (!dong || dong.length === 0) return null;
  const coLanSua = dong.some((d) => d.buoc === "dieu_chinh" || (d.buoc === "hien_hanh" && d.lanSua !== null));
  if (!coLanSua) return null;
  return dong.map((d, i) => ({
    buoc: d.buoc,
    nhan: d.buoc === "khoi_tao" ? "Lúc xác nhận" : d.buoc === "dieu_chinh" ? `Lần sửa ${i}` : d.lanSua !== null ? `Hiện tại · sau lần sửa ${i}` : "Hiện tại",
    dichVu: d.soKhach.map((s) => ({ ten: s.tenDichVu, khach: paxFullText(s.pax) || "không có khách" })),
    tamTinh: dinhDangTien(d.tamTinh),
  }));
}
