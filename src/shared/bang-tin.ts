// BẢNG TIN (ADR-0022) — hàm thuần dùng chung server ↔ web/: nhãn (tag) của một kết nối/sự kiện (Task 1). Không I/O, không API
// Worker/Node — chỉ import ./permissions.ts (điều 3 ADR-0022: nhóm nhận suy từ ô `order.view`/`dispatch.claim` hiện hành, không đặt luật
// quyền mới ở đây). Sự kiện chỉ gồm đúng 5 khoá của điều 4 (không tiền, không SĐT, không tên người) — thêm trường = đổi ADR.
// Bổ sung ADR-0052 D6.4 (điều 3 + 4 của ADR-0022): sự kiện CHUYẾN đúng 4 khoá (mã chuyến, loại thay đổi, thời điểm) tới nhóm `dieu-xe` (kết nối có
// `trip.view` không ngữ cảnh) + `nguoi:<tài xế liên quan>` — không bao giờ `tat-ca`.

import { can, hasPermission, holdsPartner, isOffice, type PermissionHolder } from "./permissions.ts";

/**
 * 12 loại thay đổi một đơn có thể phát (điều 4 + điều 7). Sổ tiền lượt 1 (ADR-0025 điều 8): `chot_giao` ("Đã giao – đã thu đủ" — KHÔNG dùng `giao`, vốn là
 * giao người phụ trách) và `hoan_thanh` — CHỈ làm mới màn hình (không thông báo nổi, không gõ cửa màn hình khoá — ADR-0045; giả định bề mặt đảo được).
 * `tu_choi` (ADR-0030 điều 1): người phụ trách tự trả đơn — đơn về hàng chờ; thông báo nổi, không gõ cửa màn hình khoá (Q4 (a), chủ 2026-10-23).
 */
export const THAY_DOI = ["tao", "tao_cho_nhan", "nhan", "giao", "xac_nhan", "huy", "sua", "chuyen", "tien", "chot_giao", "hoan_thanh", "tu_choi", "cho_xac_nhan"] as const;
export type ThayDoiDon = (typeof THAY_DOI)[number];

/** Sự kiện phát cho mọi màn hình đang mở — ĐÚNG 5 khoá, không hơn (điều 4). `maDon` = `orders.order_code`. */
export interface SuKienDon {
  loai: "don";
  orderId: string;
  maDon: string;
  thayDoi: ThayDoiDon;
  luc: string;
}

/** ADR-0052 D6.4 + bổ sung ADR-0022 điều 4: sự kiện CHUYẾN — đúng 4 khoá (mã chuyến, loại thay đổi, thời điểm). Không tripId (tự chốt T3 của kế hoạch Đợt 2). */
// "xe_chay" (Vận chuyển Đợt 5): văn phòng thêm điểm / báo huỷ / đổi điểm khi xe đang chạy.
export const THAY_DOI_CHUYEN = ["tao", "sua", "xep", "rut", "doi", "huy", "cap_nhat", "xuat_ben", "tien_do", "vang", "ket_thuc", "gian_doan", "xe_chay"] as const;
export type ThayDoiChuyen = (typeof THAY_DOI_CHUYEN)[number];
export interface SuKienChuyen {
  loai: "chuyen";
  maChuyen: string;
  thayDoi: ThayDoiChuyen;
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
  if (can(staff, "order.confirm.review")) nhan.add(NHAN_XET_DUYET); // ADR-0136 Đ10: người xét duyệt (kể cả HDV chưa phụ trách) nhận tin «đơn chờ xác nhận»
  if (can(staff, "trip.view")) nhan.add(NHAN_DIEU_XE); // ADR-0052 D6.4: không ngữ cảnh = ô any (tài xế — assigned — không có)
  return [...nhan].sort();
}

/** ADR-0136 Đ10: nhãn kết nối của người giữ ô `order.confirm.review`. Chỉ gắn vào sự kiện GỬI / RÚT LẠI của nháp — không mở thêm lối vào cho nháp riêng tư nào khác. */
export const NHAN_XET_DUYET = "xet-duyet";

/** ADR-0052 D6.4: nhãn kết nối của người xem được MỌI chuyến (`can(trip.view)` không ngữ cảnh = ô any). */
export const NHAN_DIEU_XE = "dieu-xe";

/** Nhãn của một sự kiện CHUYẾN: nhóm điều xe + tài xế có dòng lái lúc sự kiện (người gọi tính bằng `taiXeNhanSuKien`). Không bao giờ tat-ca. */
export function nhanSuKienChuyen(taiXeStaffIds: readonly string[]): string[] {
  return [...new Set([NHAN_DIEU_XE, ...taiXeStaffIds.map((id) => `nguoi:${id}`)])].sort();
}

const KHOA_SU_KIEN_CHUYEN = ["loai", "maChuyen", "thayDoi", "luc"] as const;
/** Tin WebSocket có đúng hình dạng một `SuKienChuyen` (đúng 4 khoá, `thayDoi` thuộc `THAY_DOI_CHUYEN`) không — trình duyệt bỏ qua tin lạ. */
export function laSuKienChuyenHopLe(x: unknown): x is SuKienChuyen {
  if (typeof x !== "object" || x === null || Array.isArray(x)) return false;
  const khoa = Object.keys(x);
  if (khoa.length !== KHOA_SU_KIEN_CHUYEN.length || !KHOA_SU_KIEN_CHUYEN.every((k) => khoa.includes(k))) return false;
  const v = x as Record<string, unknown>;
  return v.loai === "chuyen" && typeof v.maChuyen === "string" && typeof v.luc === "string" && (THAY_DOI_CHUYEN as readonly string[]).includes(v.thayDoi as string);
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
  /** ADR-0135 Đ4: đơn đang NHÁP (vùng riêng của người lập) — sự kiện chỉ mang `nguoi:<người lập>`: bỏ `tat-ca`, `cho-nhan`, nhãn người phụ trách trước / sau. Vắng = false (đơn đã xác nhận / huỷ). */
  laNhap?: boolean;
  /** ADR-0136 Đ10: sự kiện GỬI xác nhận / RÚT LẠI của nháp — thêm nhãn `xet-duyet` (người giữ ô xét duyệt), KHÔNG thêm `tat-ca`, `cho-nhan`, người phụ trách chọn sẵn. Chỉ có nghĩa khi `laNhap`. */
  choXacNhan?: boolean;
}): string[] {
  const { ownerId, handlerTruoc, handlerSau } = input;
  if (input.laNhap === true) return input.choXacNhan === true ? [`nguoi:${ownerId}`, NHAN_XET_DUYET].sort() : [`nguoi:${ownerId}`];
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

/** Chỉ 5 loại thay đổi hiện thông báo nổi (TD-4 + `tu_choi` của ADR-0030 điều 1) — `tao`, `tao_cho_nhan` (ADR-0045: lưu nháp không báo), `sua`, `chuyen`, `tien` chỉ làm mới màn hình, không nổi. */
const CAU_THONG_BAO: { [K in ThayDoiDon]?: (maDon: string) => string } = {
  nhan: (maDon) => `Đơn ${maDon} vừa có người nhận`,
  giao: (maDon) => `Đơn ${maDon} vừa đổi người phụ trách`,
  xac_nhan: (maDon) => `Đơn ${maDon} đã được xác nhận`,
  huy: (maDon) => `Đơn ${maDon} đã bị huỷ`,
  tu_choi: (maDon) => `Đơn ${maDon} vừa được trả lại, đang chờ người nhận`,
  cho_xac_nhan: (maDon) => `Đơn ${maDon} đang chờ xác nhận`, // ADR-0136 Đ10 — không tên người gửi
};

/**
 * Tài khoản có được thấy tin về đơn không (TD-4, dùng chung cho thông báo nổi và hộp thông báo — ADR-0034 điều 3). Đối tác/Thực tập
 * (không văn phòng, không Hướng dẫn viên) không bao giờ (Q-C ADR-0022, điều 12 ADR-0014). Tin "chờ nhận" chỉ cho ai nhận được đơn chưa có người.
 */
export function duocThayTinDon(staff: PermissionHolder, choNhan: boolean): boolean {
  const vanPhong = isOffice(staff);
  if (!vanPhong && !hasPermission(staff, "FIELD")) return false;
  return !choNhan || (can(staff, "dispatch.claim") && !holdsPartner(staff)); // ADR-0030 Task 1.4/1.1: tài khoản lai Đối tác+HDV không tính là "nhận được"
}

/**
 * ADR-0062 Đ3 + câu 5 = Có (chủ 30/9): ai được thấy tin "đơn đổi sau xác nhận" — như `duocThayTinDon` (văn phòng + HDV), MỞ HẸP thêm NGƯỜI LẬP của đơn xem được
 * đơn mình lập (`can(order.view, { ownerId })` — ô `own` của Đối tác / Thực tập; hỏi bảng quyền, không hỏi thẳng mã quyền — bài giao-dien-hoi-bang-quyen).
 * Chỉ loại tin này; `duocThayTinDon` và `thongBaoNoi` không đổi (Q-C ADR-0022: Đối tác không thông báo nổi).
 */
export function duocThayTinDoi(staff: PermissionHolder, ownerId: string): boolean {
  return duocThayTinDon(staff, false) || (ownerId === staff.id && can(staff, "order.view", { ownerId }));
}

/**
 * Có hiện thông báo nổi cho tài khoản `staff` khi nhận sự kiện `suKien` không, và nếu có thì câu gì + bấm vào đi đâu (TD-4). Đối tác/Thực tập
 * (không văn phòng, không Hướng dẫn viên) không bao giờ hiện (Q-C ADR-0022, điều 12 ADR-0014: chỉ chấm đếm, không thông báo nổi). `tao_cho_nhan`
 * không bao giờ nổi (ADR-0045: lưu nháp không báo ai — kể cả đơn chờ nhận). Hướng dẫn viên bấm vào mở `/account` (hôm nay không mở được `/order`).
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
  if (!duocThayTinDon(staff, suKien.thayDoi === "tao_cho_nhan")) return null;
  // Vòng sửa 1 sau kiểm độc lập lượt 1 ADR-0030 (phát hiện I-3, chủ quyết 2026-09-27): "nhan" KHÔNG hiện cho kết nối có nhãn `cho-nhan` mà KHÔNG có
  // `tat-ca` — tính bằng CHÍNH `nhanKetNoi` (một nguồn, không viết lại luật lai). Xem chú thích đầy đủ ở trên hàm này.
  // ADR-0030 điều 1 (TC-6 của ADR): tài khoản mang quyền Đối tác (kể cả lai) không thấy tin "được trả lại" — giống hàng chờ (S20-8).
  if (suKien.thayDoi === "tu_choi" && holdsPartner(staff)) return null;
  if (suKien.thayDoi === "nhan") {
    const nhan = nhanKetNoi(staff);
    if (nhan.includes("cho-nhan") && !nhan.includes("tat-ca")) return null;
  }
  // ADR-0136 Đ10: tin «đơn chờ xác nhận» chỉ nổi cho người giữ ô xét duyệt, và HDV cũng mở được đơn chờ (Đ6) nên đích là trang đơn.
  if (suKien.thayDoi === "cho_xac_nhan") return can(staff, "order.confirm.review") ? { cau: CAU_THONG_BAO.cho_xac_nhan!(suKien.maDon), lienKet: `/order?id=${suKien.orderId}` } : null;
  const dungCau = CAU_THONG_BAO[suKien.thayDoi];
  if (!dungCau) return null;
  return { cau: dungCau(suKien.maDon), lienKet: isOffice(staff) ? `/order?id=${suKien.orderId}` : "/account" };
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
