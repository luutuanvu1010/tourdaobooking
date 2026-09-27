// BẢNG TIN (ADR-0022) — hàm thuần dùng chung server ↔ web/: nhãn (tag) của một kết nối/sự kiện (Task 1). Không I/O, không API
// Worker/Node — chỉ import ./permissions.ts (điều 3 ADR-0022: nhóm nhận suy từ ô `order.view`/`dispatch.claim` hiện hành, không đặt luật
// quyền mới ở đây). Sự kiện chỉ gồm đúng 5 khoá của điều 4 (không tiền, không SĐT, không tên người) — thêm trường = đổi ADR.

import { can, hasPermission, holdsPartner, isOffice, type PermissionHolder } from "./permissions.ts";

/** 9 loại thay đổi một đơn có thể phát (điều 4 + điều 7). */
export const THAY_DOI = ["tao", "tao_cho_nhan", "nhan", "giao", "xac_nhan", "huy", "sua", "chuyen", "tien"] as const;
export type ThayDoiDon = (typeof THAY_DOI)[number];

/** Sự kiện phát cho mọi màn hình đang mở — ĐÚNG 5 khoá, không hơn (điều 4). `maDon` = `orders.order_code`. */
export interface SuKienDon {
  loai: "don";
  orderId: string;
  maDon: string;
  thayDoi: ThayDoiDon;
  luc: string;
}

/** Trạng thái người phụ trách dùng để tính nhãn/loại thay đổi. `coNguoi`: đơn có dòng phụ trách đang mở; `staffId`: null khi chưa ai hoặc người phụ trách là hồ sơ không có tài khoản. */
export interface TrangThaiPhuTrach {
  coNguoi: boolean;
  staffId: string | null;
}

/**
 * Trạng thái người phụ trách TRƯỚC thay đổi khi route ghi KHÔNG tự đọc lại (chỉ `PUT /api/orders/:id/handler` truyền `handlerTruoc` thật): "KHÔNG
 * BIẾT" (`null`), KHÔNG phải "chưa ai phụ trách" — xem chú thích `nhanSuKien`. Gốc lắp ráp (`baoThayDoi` ở `src/index.ts`) dùng ĐÚNG hằng này làm mặc
 * định (`e.handlerTruoc ?? HANDLER_TRUOC_KHONG_BIET`); bài hàng rào ở `bang-tin.test.ts` đọc cả giá trị này LẪN nơi gọi thật (vòng sửa 1 sau kiểm độc
 * lập lượt 1 ADR-0030, phát hiện I-1: hằng chép tay trong bài kiểm không canh được dòng thật).
 */
export const HANDLER_TRUOC_KHONG_BIET: TrangThaiPhuTrach | null = null;

/**
 * Nhãn của một kết nối (ai nhận được tin gì) — NT-1. Luôn có `nguoi:<id>`; thêm `tat-ca` nếu xem được mọi đơn (`order.view`, không ngữ
 * cảnh = ô `any`); thêm `cho-nhan` nếu nhận được đơn chưa có người (`dispatch.claim`) VÀ tài khoản không mang quyền Đối tác (`!holdsPartner`
 * — ADR-0030 S20-8/9, Q-M: tài khoản lai Đối tác+HDV không được đưa vào hàng chờ nhận nên cũng không nhận tin của hàng chờ). Không luật
 * quyền viết tay ngoài `can()`/`holdsPartner`.
 */
export function nhanKetNoi(staff: PermissionHolder): string[] {
  const nhan = new Set<string>([`nguoi:${staff.id}`]);
  if (can(staff, "order.view")) nhan.add("tat-ca");
  if (can(staff, "dispatch.claim") && !holdsPartner(staff)) nhan.add("cho-nhan");
  return [...nhan].sort();
}

/**
 * Nhãn của một sự kiện đơn (ai được gửi tin) — NT-2. Luôn có `tat-ca` + `nguoi:<người lập>`; thêm `nguoi:<người phụ trách trước/sau>` khi
 * người đó có tài khoản (`staffId !== null`); người phụ trách là hồ sơ không tài khoản thì đơn CÓ người (không gắn `cho-nhan`) nhưng không có
 * nhãn `nguoi:` cho người đó. Không trùng lặp.
 *
 * `cho-nhan` (ADR-0030 S20-8/9) khi và chỉ khi:
 *   (a) SAU thay đổi đơn không còn ai phụ trách (`!handlerSau.coNguoi`) — đơn đang/vừa vào hàng chờ; hoặc
 *   (b) trạng thái TRƯỚC thay đổi **biết được** (khác `null`) và trước đó chưa ai phụ trách (`!handlerTruoc.coNguoi`) — đơn VỪA rời hàng
 *       chờ (được Nhận/được Giao), để mọi HDV đang chờ gỡ nó khỏi danh sách.
 * `handlerTruoc === null` nghĩa là "không biết trạng thái trước" (route ghi không tự đọc lại — mặc định `HANDLER_TRUOC_KHONG_BIET` của gốc lắp ráp, `baoThayDoi` ở `src/index.ts`):
 * KHÔNG BAO GIỜ được coi là "trước chưa ai phụ trách". Coi nhầm "không biết" thành "chưa ai" làm rò tin: một đơn ĐÃ có người (ví dụ HDV B)
 * mà văn phòng xác nhận/sửa/đổi tiền/huỷ — route đó không truyền `handlerTruoc` — sẽ bị gắn `cho-nhan` sai, lộ cho MỌI tài khoản có
 * `dispatch.claim` (mọi HDV khác, không chỉ B) dù đơn không hề rời hàng chờ. Đây là lỗi mà bài NT-3 (thay ở `bang-tin.test.ts`) canh.
 */
export function nhanSuKien(input: {
  ownerId: string;
  handlerTruoc: TrangThaiPhuTrach | null;
  handlerSau: TrangThaiPhuTrach;
}): string[] {
  const { ownerId, handlerTruoc, handlerSau } = input;
  const nhan = new Set<string>(["tat-ca", `nguoi:${ownerId}`]);
  if (handlerTruoc !== null && handlerTruoc.staffId !== null) nhan.add(`nguoi:${handlerTruoc.staffId}`);
  if (handlerSau.staffId !== null) nhan.add(`nguoi:${handlerSau.staffId}`);
  if (!handlerSau.coNguoi || (handlerTruoc !== null && !handlerTruoc.coNguoi)) nhan.add("cho-nhan");
  return [...nhan].sort();
}

/**
 * `nhan` khi người gọi tự đặt mình vào một đơn CHƯA có người phụ trách (`!handlerTruoc.coNguoi` và người phụ trách sau đổi là chính người gọi);
 * còn lại (đổi người phụ trách của đơn đã có người, hoặc gán cho người khác) là `giao`. Route `PUT /api/orders/:id/handler` dùng để chọn `thayDoi`.
 */
export function thayDoiCuaHandler(input: {
  nguoiGoi: string;
  handlerTruoc: TrangThaiPhuTrach;
  handlerSau: TrangThaiPhuTrach;
}): "nhan" | "giao" {
  const { nguoiGoi, handlerTruoc, handlerSau } = input;
  return !handlerTruoc.coNguoi && handlerSau.staffId === nguoiGoi ? "nhan" : "giao";
}

/**
 * Chờ nối lại (TD-2): lần `lan` (0, 1, 2…) → cơ số tăng gấp đôi `1000 * 2^lan`, trần 30000ms. Dưới trần: ngẫu nhiên đầy đủ (cơ số → 2×cơ số) để
 * lần 0 nằm trong [1000, 2000). Đã tới trần: chỉ thêm tối đa 20% (30000 → 36000) để không dồn mọi trình duyệt nối lại cùng lúc mà vẫn không vượt
 * 36 giây. `ngauNhien` là một số ĐÃ SINH trong [0, 1) (bên gọi truyền `Math.random()`) — tham số hoá để test tất định.
 */
export function choNoiLai(lan: number, ngauNhien: number): number {
  const coSo = Math.min(1000 * 2 ** lan, 30000);
  const heSoNgauNhien = coSo === 30000 ? 0.2 : 1;
  // floor (không round): ngauNhien ∈ [0,1) — round có thể đẩy một giá trị rất gần biên trên vượt qua biên (2000, 36000).
  return Math.floor(coSo + coSo * heSoNgauNhien * ngauNhien);
}

/** Thông báo nổi (TD-4): câu tiếng Việt đủ dấu (không mã thô) + đường dẫn mở khi bấm vào. */
export interface ThongBaoNoi {
  cau: string;
  lienKet: string;
}

/** Chỉ 5 loại thay đổi hiện thông báo nổi (TD-4) — `tao`, `sua`, `chuyen`, `tien` chỉ làm mới màn hình, không nổi. */
const CAU_THONG_BAO: { [K in ThayDoiDon]?: (maDon: string) => string } = {
  tao_cho_nhan: (maDon) => `Có đơn mới chưa có người phụ trách: ${maDon}`,
  nhan: (maDon) => `Đơn ${maDon} vừa có người nhận`,
  giao: (maDon) => `Đơn ${maDon} vừa đổi người phụ trách`,
  xac_nhan: (maDon) => `Đơn ${maDon} đã được xác nhận`,
  huy: (maDon) => `Đơn ${maDon} đã bị huỷ`,
};

/**
 * Có hiện thông báo nổi cho tài khoản `staff` khi nhận sự kiện `suKien` không, và nếu có thì câu gì + bấm vào đi đâu (TD-4). Đối tác/Thực tập
 * (không văn phòng, không Hướng dẫn viên) không bao giờ hiện (Q-C ADR-0022, điều 12 ADR-0014: chỉ chấm đếm, không thông báo nổi). `tao_cho_nhan`
 * chỉ hiện cho ai nhận được đơn chưa có người (`dispatch.claim`) VÀ không mang quyền Đối tác (`!holdsPartner` — ADR-0030 S20-8/9, cùng luật với
 * `nhanKetNoi`: tài khoản lai Đối tác+HDV không hiện thông báo về hàng chờ nhận). Hướng dẫn viên bấm vào mở `/account` (hôm nay không mở được `/order`).
 *
 * `nhan` (quyết định chủ dự án 2026-09-27 — vòng sửa 1 sau kiểm độc lập lượt 1 ADR-0030, phát hiện I-3): KHÔNG hiện cho kết nối có nhãn `cho-nhan`
 * mà KHÔNG có `tat-ca` — tính bằng CHÍNH `nhanKetNoi` (một nguồn, không viết lại luật lai). "nhan" luôn là một người TỰ nhận đơn chưa có ai (xem
 * `thayDoiCuaHandler`), tức ca (b) "đơn rời hàng chờ" của S20-8; kết nối như vậy nhận khung chỉ vì chính mình vừa nhận, hoặc vì đang chờ nhận — chủ
 * quyết: HDV khác không thấy thông báo nổi, chỉ danh sách hàng chờ tự cập nhật (khung vẫn tới: nhãn `cho-nhan` KHÔNG đổi). Người xem mọi đơn (`tat-ca`)
 * vẫn thấy. `giao` (văn phòng giao đơn đang chờ cho một người) KHÔNG đổi: khung 5 khoá không cho biết người nhận khung là người vừa được giao hay HDV
 * không liên quan — chủ đã quyết giữ nguyên cho lượt 1 (2026-09-27); phương án tách loại tin riêng cho người được giao để xét ở lượt 2 (xem nhật ký
 * thi công, mục "Phối hợp với nhánh khác").
 */
export function thongBaoNoi(staff: PermissionHolder, suKien: SuKienDon): ThongBaoNoi | null {
  const vanPhong = isOffice(staff);
  const huongDanVien = !vanPhong && hasPermission(staff, "FIELD");
  if (!vanPhong && !huongDanVien) return null;
  if (suKien.thayDoi === "tao_cho_nhan" && (!can(staff, "dispatch.claim") || holdsPartner(staff))) return null;
  if (suKien.thayDoi === "nhan") {
    const nhan = nhanKetNoi(staff);
    if (nhan.includes("cho-nhan") && !nhan.includes("tat-ca")) return null;
  }
  const dungCau = CAU_THONG_BAO[suKien.thayDoi];
  if (!dungCau) return null;
  return { cau: dungCau(suKien.maDon), lienKet: vanPhong ? `/order?id=${suKien.orderId}` : "/account" };
}

const KHOA_SU_KIEN_HOP_LE = ["loai", "orderId", "maDon", "thayDoi", "luc"] as const;

/** Tin nhận được từ WebSocket có đúng hình dạng một `SuKienDon` không — trình duyệt bỏ qua tin lạ (khoá thừa hoặc `thayDoi` không thuộc `THAY_DOI`). */
export function laSuKienHopLe(x: unknown): x is SuKienDon {
  if (typeof x !== "object" || x === null || Array.isArray(x)) return false;
  const khoa = Object.keys(x);
  if (khoa.length !== KHOA_SU_KIEN_HOP_LE.length) return false;
  if (!KHOA_SU_KIEN_HOP_LE.every((k) => khoa.includes(k))) return false;
  const v = x as Record<string, unknown>;
  return (
    v.loai === "don" &&
    typeof v.orderId === "string" &&
    typeof v.maDon === "string" &&
    typeof v.luc === "string" &&
    (THAY_DOI as readonly string[]).includes(v.thayDoi as string)
  );
}
