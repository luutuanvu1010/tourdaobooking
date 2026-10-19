// Khối hiển thị THUẦN cho các màn Bảng điều phối B1–B6 (V1 Điều phối xe, V2 Chi tiết chuyến, V5 Cuốc của tôi, V6 Chuyến đang chạy, V7 Xuất bến) — ADR-0049,
// ADR-0050; bản vẽ docs/design/van-chuyen-dieu-phoi/; bản đối chiếu DOI-CHIEU-2026-09-29.md (H15, mục 2.5, thành phần B). Đã nối: `nhanMocTienDo` (web/tien-do-ui.ts),
// `dongDieuKienTaiXe` (tien-do-man.ts). Câu "Sớm nhất" / câu từ chối giờ khai nay CHỈ ở tien-do-man.ts (theo DTO 409 của A15) — bản cũ ở đây đã xoá (tránh
// hai luật). Không thêm khoá DTO nào; câu lý do lấy nguyên `LyDoGiu.loiNhan` — không đặt chữ mới cho mã đã có nhãn.
// Không I/O, không DOM; import kèm đuôi .ts. Test: dieu-phoi-hien-thi.test.ts.
import type { LyDoGiu } from "./ly-do-giu.ts";
import { maskLongDigits } from "./text-guards.ts";
import { msToVnLocal } from "./vn-date.ts";

const HHMM = /^\d\d:\d\d$/;

/** Giờ hiển thị "HH:MM" theo giờ VN: nhận sẵn "HH:MM" (DTO "giờ VN hiển thị" — mục 1.8) hoặc mốc ISO. */
export function gioVn(v: string): string {
  return HHMM.test(v) ? v : msToVnLocal(Date.parse(v)).time;
}

/** Một mốc tiến độ (xuất bến, đã tới, đã đón, vắng, khách đã huỷ, đã trả, kết thúc) — khoá của DTO lịch chung / chi tiết chuyến / chuyến tài xế ([0050]). */
export interface MocTienDoVao {
  gioXayRa: string;
  gioGhiNhan: string;
  vanPhongKhai: boolean;
  /** Tên hiển thị người văn phòng bấm (chỉ khi `vanPhongKhai`) — không SĐT (R-P11). */
  nguoiBam?: string | null;
}
/**
 * Thành phần B: tài xế tự bấm, hoặc văn phòng bấm mà không đổi giờ → MỘT giờ; văn phòng khai giờ khác lúc bấm → "07:31 · ghi lúc 07:45 — Hoa" + cờ để màn hiện
 * dấu "giờ do văn phòng khai". Tên người bấm đi qua `maskLongDigits` (lưới an toàn: không bao giờ hiện dãy số dài dù DTO lỡ lẫn SĐT).
 */
export function nhanMocTienDo(m: MocTienDoVao): { chu: string; vanPhongKhai: boolean } {
  const xayRa = gioVn(m.gioXayRa);
  if (!m.vanPhongKhai) return { chu: xayRa, vanPhongKhai: false };
  const ten = m.nguoiBam ? ` — ${maskLongDigits(m.nguoiBam)}` : "";
  return { chu: `${xayRa} · ghi lúc ${gioVn(m.gioGhiNhan)}${ten}`, vanPhongKhai: true };
}

/**
 * V5 / V7 trên màn TÀI XẾ (bản đối chiếu 2.5, H15): chỉ điều kiện CÒN THIẾU (`dieuKienConThieu[]` của DTO tài xế — mã, câu, ai xử lý; không hạn, không số giấy
 * tờ), mỗi dòng kèm "(văn phòng lo)" — với tài xế, Quản trị / Toàn quyền cũng là văn phòng. Đạt hết → một dòng "Đủ điều kiện xuất bến".
 */
export function dongDieuKienTaiXe(conThieu: readonly (Pick<LyDoGiu, "loiNhan"> & { readonly ma?: string })[], tuBoSungTen = false): string[] {
  if (conThieu.length === 0) return ["Đủ điều kiện cho xe chạy"];
  return conThieu.map((d) => `${d.loiNhan} ${hauToDieuKienTaiXe(d.ma, tuBoSungTen)}`);
}

/**
 * Đuôi một dòng điều kiện còn thiếu trên màn tài xế. Đợt 5 A-1b (ADR-0052 D5b — chủ duyệt 5/10: "chỉ tài xế công ty"): `tuBoSungTen` = người xem giữ ô
 * `trip.passenger.add` VÀ chuyến trong ngày chạy (khối "Suất của khách" chỉ hiện lúc đó) ⇒ dòng "Chưa đủ tên khách" chỉ chỗ tự làm. Tài xế đối tác, ngày
 * khác, điều kiện khác: "(văn phòng lo)" như cũ. Máy chủ vẫn tự kiểm quyền + ngày chạy ở route bổ sung tên.
 */
export function hauToDieuKienTaiXe(ma: string | undefined, tuBoSungTen = false): string {
  return ma === "THIEU_TEN" && tuBoSungTen ? "(bấm Bổ sung tên ở khối Suất của khách, hoặc văn phòng lo)" : "(văn phòng lo)";
}


/** Đợt 5 A-1b: mọi điều kiện còn thiếu đều là "Chưa đủ tên khách" VÀ người xem tự bổ sung được ⇒ dòng chân màn xuất bến nói việc của tài xế, không "văn phòng đang lo". */
export function chiThieuTenTuLam(conThieu: readonly { readonly ma?: string }[], tuBoSungTen: boolean): boolean {
  return tuBoSungTen && conThieu.length > 0 && conThieu.every((d) => d.ma === "THIEU_TEN");
}
