// Quyết định THUẦN của giao diện "bên đặt là đối tác" (sổ đại lý đợt 1, Task 11; đặc tả §6, §7). Giao diện (web/dat-qua-doi-tac.ts, web/phan-doi-tac.ts, web/order-form.ts, web/booker-sheet.ts, web/order.ts) chỉ
// DỰNG DOM theo các hàm ở đây; máy chủ vẫn kiểm lại mọi thứ. Có bài cạnh tệp (phan-doi-tac-hien-thi.test.ts) và HAI bài nối với route thật:
//  - src/modules/pricing/o-dat-qua-noi-cong.test.ts — cổng ẩn/hiện bằng ĐÚNG câu trả lời 200/403 của route;
//  - src/modules/orders/ghi-tay-nhap-noi.test.ts — thân ghi tay do `docThanGhiTay` dựng được `kiemThanGhiTay` + `kiemGhiTayVoiBanChup` của máy chủ nhận.
// Import kèm đuôi .ts (chạy trực tiếp bằng `node --test`).
//
// GHI CHÚ HỢP NHẤT: `docTyLeTay` / `docTienTay` cùng nghĩa với `docTyLePhanTram` / `docTienMoiKhach` của Task 10 (`src/shared/so-dai-ly-nhap.ts`, CHƯA gộp vào nền của Task 11 nên không import được).
// Gộp hai nhánh xong thì nên đổi sang import của Task 10 và bỏ hai hàm này (bài `docTyLeTay / docTienTay` ở đây giữ nguyên làm bài canh).
import type { ThuongMaiDoiTacDto, ThuongMaiVanPhongDto } from "./contracts.ts";
import { can, holdsPartner, type PermissionHolder } from "./permissions.ts";
import { CAU_THIEU_MUC } from "./so-dai-ly-nhan.ts";
import { PHONE_IN_TEXT_MESSAGE, hasLongDigitRun } from "./text-guards.ts";

/** Bên đặt là một hồ sơ (id + tên) — dùng cho ô "Đặt qua đối tác" và dòng chỉ đọc của Đối tác. */
export interface BenDatChon {
  readonly partyId: string;
  readonly ten: string;
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------
// Chọn bên đặt (form lập đơn, bảng "Đổi khách")

/**
 * Ô "Đặt qua đối tác" hiện cho ai: ĐÚNG cổng của `GET /api/pricing/nguoi-huong` — người LẬP ĐƠN (`order.create`) mà KHÔNG giữ quyền Đối tác (lời chủ 2026-10-09 "chỉ văn phòng chọn";
 * mọi tài khoản lai SALES / ADMIN + PARTNER cũng không thấy). Máy chủ trả 403 ngoài cổng này, nên hiện ô cho người khác là hiện một ô luôn lỗi.
 */
export const coODatQuaDoiTac = (staff: PermissionHolder): boolean => can(staff, "order.create") && !holdsPartner(staff);

export type KhoiBenDatForm =
  /** Tài khoản Đối tác mà máy chủ SẼ ép bên đặt (trường `benDatCuaToi` của `/api/auth/me` — giao diện không suy): dòng chỉ đọc "Bên đặt: <tên>", không ô nào để chọn. */
  | { kieu: "chi-doc"; benDat: BenDatChon }
  /** Văn phòng: ô tra hồ sơ khách theo SĐT như hôm nay, thêm ô "Đặt qua đối tác". */
  | { kieu: "tra-sdt-va-dat-qua" }
  /** Còn lại (Đối tác hồ sơ không được hưởng, tài khoản lai, Kế toán…): ô tra hồ sơ khách theo SĐT như hôm nay, KHÔNG có ô "Đặt qua đối tác". */
  | { kieu: "tra-sdt" };

export function khoiBenDatForm(staff: PermissionHolder, benDatCuaToi: BenDatChon | null | undefined): KhoiBenDatForm {
  if (holdsPartner(staff)) return benDatCuaToi ? { kieu: "chi-doc", benDat: benDatCuaToi } : { kieu: "tra-sdt" };
  return coODatQuaDoiTac(staff) ? { kieu: "tra-sdt-va-dat-qua" } : { kieu: "tra-sdt" };
}

/** Điều ô tra hồ sơ khách theo SĐT gửi kèm đơn (`bookerPayload` của booker.ts): hoặc gắn hồ sơ có sẵn / bỏ gắn, hoặc tạo hồ sơ cá nhân mới. */
export type BenDatGui = { bookerPartyId: string | null } | { newBooker: { fullName: string; phone: string } };

/**
 * Trường bên đặt gửi kèm đơn: dòng chỉ đọc (Đối tác) hoặc đại lý đã chọn thắng ô tra SĐT — khi đã chọn đại lý, ô tra SĐT bị ẩn nên lựa chọn cũ của nó (kể cả "tạo hồ sơ mới") không được gửi.
 * Không chọn gì thì giữ NGUYÊN điều ô tra SĐT gửi (hành vi hôm nay).
 */
export function gopBenDat(v: { chiDoc: BenDatChon | null; daChon: BenDatChon | null; tra: BenDatGui }): BenDatGui {
  const chon = v.chiDoc ?? v.daChon;
  return chon ? { bookerPartyId: chon.partyId } : v.tra;
}

/**
 * Mở lại đơn đã lưu: bên đặt đang lưu là đối tác (cờ `bookerLaDoiTac` do MÁY CHỦ tính) và người xem CÓ ô "Đặt qua đối tác" ⇒ nạp vào ô đó, không vào ô tra SĐT. Người không có ô (Đối tác, tài khoản lai)
 * giữ cách cũ: ô tra SĐT nạp hồ sơ đang lưu (giữ nguyên bên đặt văn phòng đã gắn — máy chủ miễn kiểm cho bên đặt đang lưu).
 */
export function noiNapBenDat(v: { coODatQua: boolean; bookerLaDoiTac: boolean; bookerPartyId: string | null }): "dat-qua" | "tra-sdt" {
  return v.coODatQua && v.bookerLaDoiTac && v.bookerPartyId !== null ? "dat-qua" : "tra-sdt";
}

export const NHAN_BEN_DAT_DOI_TAC = "Bên đặt (đối tác)";
export const NHAN_HO_SO_KHACH = "Hồ sơ khách";
/** Nhãn dòng bên đặt ở trang đơn: theo cờ `bookerLaDoiTac` của DTO đơn — KHÔNG suy ở giao diện. */
export const nhanBenDat = (laDoiTac: boolean): string => (laDoiTac ? NHAN_BEN_DAT_DOI_TAC : NHAN_HO_SO_KHACH);

// ---------------------------------------------------------------------------------------------------------------------------------------------------------
// Khối "Phần đối tác" ở trang đơn

/** Có nên GỌI `GET /api/orders/:id/thuong-mai` không (ô `order.terms.view`; hướng dẫn viên chỉ mở được đơn mình phụ trách nên `assigned: true`). Máy chủ vẫn quyết: 404 ⇒ ẩn khối lặng lẽ. */
export const coXemPhanDoiTac = (staff: PermissionHolder, order: { staffId: string }): boolean => can(staff, "order.terms.view", { ownerId: order.staffId, assigned: true });

/**
 * Nút "Ghi mức tay": ô `order.terms.override` VÀ không giữ quyền Đối tác (route ghi từ chối cả tài khoản lai — vì phản hồi của nó là DTO văn phòng có tỷ lệ) VÀ đơn đã xác nhận, chưa Đã giao.
 * Khối còn tự ẩn nút khi đơn nháp (`duKien`) hoặc xác nhận trước đợt 1 (`chuaChup`) — xem `hienNutGhiTay`.
 */
export const duocGhiTay = (staff: PermissionHolder, order: { status: string; deliveredAt: string | null }): boolean =>
  can(staff, "order.terms.override") && !holdsPartner(staff) && order.status === "confirmed" && order.deliveredAt === null;

/** Khối người bán / tỷ lệ mua lại / giá vốn của bảng ghi tay: ô `supply.terms.view` (cũng là cổng của `GET /api/pricing/cung-ung`), không phải tài khoản giữ quyền Đối tác. */
export const coXemNguoiBan = (staff: PermissionHolder): boolean => can(staff, "supply.terms.view") && !holdsPartner(staff);

export const hienNutGhiTay = (coGhiTay: boolean, d: Pick<ThuongMaiVanPhongDto, "duKien" | "chuaChup">): boolean => coGhiTay && !d.duKien && !d.chuaChup;

export const TIEU_DE_VAN_PHONG = "Phần đối tác";
export const TIEU_DE_DOI_TAC = "Hoa hồng của bạn";
export const CAU_CHO_CAI_MUC = "Đang chờ Công ty cài mức cho một số dịch vụ";

export const nhanNguoiHuong = (d: Pick<ThuongMaiVanPhongDto, "nguoiHuong">): string => (d.nguoiHuong ? `Người hưởng: ${d.nguoiHuong.ten}` : "Không có người hưởng hoa hồng");

/** Dòng trạng thái của khối: đơn nháp tính theo bảng mức hôm nay (chưa lưu) / đơn xác nhận trước khi có bảng mức; không thì null. */
export function ghiChuTrangThai(d: Pick<ThuongMaiVanPhongDto, "duKien" | "chuaChup">): string | null {
  if (d.duKien) return "Dự kiến — tính theo bảng mức hôm nay, chưa lưu";
  if (d.chuaChup) return "Đơn xác nhận trước khi có bảng mức";
  return null;
}

/** Câu cảnh báo của dòng thiếu mức: lý do (do máy chủ viết) + câu cố định "Thiếu mức — Kế toán xử lý". */
export const canhBaoThieuMuc = (thieu: string | null): string | null => (thieu === null ? null : `${thieu} · ${CAU_THIEU_MUC}`);

/** Tổng hoa hồng: null = chưa đủ mức (không bao giờ hiện 0 thay cho thiếu); 0 là số thật (đơn không người hưởng). `dinhDang` = hàm hiện tiền của nơi gọi. */
export const chuTongHoaHong = (v: number | null, dinhDang: (n: number) => string): string => (v === null ? "Chưa đủ mức" : dinhDang(v));
/** Ô hoa hồng trong bảng của Đối tác: null = Công ty chưa cài mức cho dòng đó. */
export const chuHoaHongDoiTac = (v: number | null, dinhDang: (n: number) => string): string => (v === null ? "Chờ Công ty cài mức" : dinhDang(v));
/** Khối nhà cung cấp (chỉ người có `supply.terms.view` nhận được từ máy chủ). */
export const chuNhaCungCap = (nc: { tyLeMua: string; giaVon: number }, dinhDang: (n: number) => string): string => `Mua lại ${nc.tyLeMua} — giá vốn ${dinhDang(nc.giaVon)}`;

export type DongDoiTac = ThuongMaiDoiTacDto["dong"][number];

// ---------------------------------------------------------------------------------------------------------------------------------------------------------
// Bảng trượt "Ghi mức tay"

/** Trần «Số tiền mỗi khách» (đồng) — cùng giá trị với `docHoaHongTay` của máy chủ (src/modules/orders/thuong-mai.ts); bài nối ở ghi-tay-nhap-noi.test.ts. */
export const MOI_KHACH_TOI_DA = 100_000_000;
export const LY_DO_TOI_THIEU = 10;
export const LY_DO_TOI_DA = 300;

/** Tỷ lệ phần trăm → phần vạn nguyên (12,5% = 1250). Dấu phẩy hoặc chấm, tối đa hai chữ số thập phân, 0…100; cho phép dấu % ở cuối. */
export function docTyLeTay(raw: string): { ok: true; bp: number } | { ok: false; message: string } {
  const s = raw.trim().replace(/%$/, "").trim();
  const m = /^(\d{1,3})(?:[.,](\d{1,2}))?$/.exec(s);
  if (!m) return { ok: false, message: "Tỷ lệ là số từ 0 tới 100, tối đa hai chữ số sau dấu phẩy (vd 12,5)." };
  const bp = Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0") || "0");
  return bp <= 10_000 ? { ok: true, bp } : { ok: false, message: "Tỷ lệ không quá 100%." };
}

/** Số tiền mỗi khách → đồng nguyên (bỏ dấu chấm nghìn), 0…100.000.000. */
export function docTienTay(raw: string): { ok: true; dong: number } | { ok: false; message: string } {
  const s = raw.trim().replace(/\./g, "");
  if (!/^\d{1,9}$/.test(s)) return { ok: false, message: "Số tiền mỗi khách là số nguyên đồng (vd 50.000)." };
  const dong = Number(s);
  return dong <= MOI_KHACH_TOI_DA ? { ok: true, dong } : { ok: false, message: "Số tiền mỗi khách không quá 100.000.000đ." };
}

/** Dòng đếm dưới ô "Lý do" (đếm sau khi cắt khoảng trắng — cùng cách máy chủ đếm). */
export function demLyDo(raw: string): string {
  const n = raw.trim().length;
  if (n < LY_DO_TOI_THIEU) return `${n} ký tự — cần ít nhất ${LY_DO_TOI_THIEU}`;
  if (n > LY_DO_TOI_DA) return `${n}/${LY_DO_TOI_DA} ký tự — quá dài`;
  return `${n}/${LY_DO_TOI_DA} ký tự`;
}

export type NguoiBanForm = { loai: "KHONG_DOI" } | { loai: "TOUR_DAO" } | { loai: "NHA_CUNG_CAP"; partyId: string; tyLeMua: string };
export interface FormGhiTay {
  /** "Phần trăm" / "Số tiền mỗi khách" / "Không đổi hoa hồng". */
  kieu: "RATE" | "PER_PAX" | "KHONG_DOI";
  tyLe: string;
  moiKhach: string;
  nguoiBan: NguoiBanForm;
  lyDo: string;
}
export type TruongGhiTay = "muc" | "nguoiBan" | "tyLeMua" | "lyDo" | "chung";
export interface LoiGhiTay {
  readonly truong: TruongGhiTay;
  readonly message: string;
}
/** Thân `POST /api/orders/:id/thuong-mai/:serviceId` (xem `kiemThanGhiTay` của máy chủ). */
export interface ThanGhiTayGui {
  lyDo: string;
  hoaHong?: { kieu: "RATE"; tyLeBp: number } | { kieu: "PER_PAX"; moiKhach: number };
  nguoiBan?: { partyId: string; tyLeMuaBp?: number };
}

/**
 * Các ô của bảng "Ghi mức tay" → thân gửi máy chủ. Lỗi gom theo ô (người dùng thấy hết một lượt); thân chỉ có khi KHÔNG còn lỗi. Phần để "Không đổi" thì KHÔNG gửi (máy chủ chép từ bản hiện hành).
 * `congTyChuId` = hồ sơ Tour Đảo (từ `GET /api/pricing/cung-ung` → `congTyChu`); null thì không dựng được "Tour Đảo" (không đoán).
 */
export function docThanGhiTay(f: FormGhiTay, congTyChuId: string | null): { ok: true; body: ThanGhiTayGui } | { ok: false; loi: LoiGhiTay[] } {
  const loi: LoiGhiTay[] = [];
  const body: ThanGhiTayGui = { lyDo: f.lyDo.trim() };
  if (f.kieu === "RATE") {
    const r = docTyLeTay(f.tyLe);
    if (r.ok) body.hoaHong = { kieu: "RATE", tyLeBp: r.bp };
    else loi.push({ truong: "muc", message: r.message });
  } else if (f.kieu === "PER_PAX") {
    const r = docTienTay(f.moiKhach);
    if (r.ok) body.hoaHong = { kieu: "PER_PAX", moiKhach: r.dong };
    else loi.push({ truong: "muc", message: r.message });
  }
  const nb = f.nguoiBan;
  if (nb.loai === "TOUR_DAO") {
    if (congTyChuId === null) loi.push({ truong: "nguoiBan", message: "Chưa biết hồ sơ của Tour Đảo — tải lại trang rồi thử lại." });
    else body.nguoiBan = { partyId: congTyChuId };
  } else if (nb.loai === "NHA_CUNG_CAP") {
    if (nb.partyId.trim() === "") loi.push({ truong: "nguoiBan", message: "Chọn nhà cung cấp." });
    const r = docTyLeTay(nb.tyLeMua);
    if (!r.ok) loi.push({ truong: "tyLeMua", message: nb.tyLeMua.trim() === "" ? "Nhập tỷ lệ mua lại của nhà cung cấp." : r.message });
    if (nb.partyId.trim() !== "" && r.ok) body.nguoiBan = { partyId: nb.partyId.trim(), tyLeMuaBp: r.bp };
  }
  if (f.kieu === "KHONG_DOI" && nb.loai === "KHONG_DOI") loi.push({ truong: "chung", message: "Chọn đổi mức hoa hồng hoặc đổi người bán." });
  const ly = f.lyDo.trim();
  if (ly.length < LY_DO_TOI_THIEU) loi.push({ truong: "lyDo", message: `Ghi lý do (ít nhất ${LY_DO_TOI_THIEU} ký tự).` });
  else if (ly.length > LY_DO_TOI_DA) loi.push({ truong: "lyDo", message: `Lý do tối đa ${LY_DO_TOI_DA} ký tự.` });
  else if (hasLongDigitRun(ly)) loi.push({ truong: "lyDo", message: PHONE_IN_TEXT_MESSAGE });
  return loi.length === 0 ? { ok: true, body } : { ok: false, loi };
}
