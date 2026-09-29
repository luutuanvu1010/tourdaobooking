// Luật THUẦN của chặng đưa đón (ADR-0047 A1) — một nguồn cho máy chủ (orders) và giao diện Phần B. Không I/O, không import module (src/shared/).
// Import kèm đuôi .ts (chạy trực tiếp bằng `node --test`). Test cạnh tệp: chang-dua-don.test.ts.
//
// Chặng = một lần hẹn đưa HOẶC đón khách của MỘT dòng dịch vụ (`ord_transfer_leg`): chiều đi/về, ngày đón riêng (giờ VN), giờ đón (trống = có hẹn nhưng
// chưa chốt giờ), nơi đón ĐÚNG MỘT (điểm danh mục hoặc chữ tự do), nơi trả TỐI ĐA MỘT (trống = chưa chốt). Chặng không mang tiền.
// Phát hành 1 (expand): hai ô cũ `pickupTime`/`pickupPlace` của dịch vụ là DẪN XUẤT của chặng chiều đi đầu (`chieuDiDau`, Ruling R2a); thân yêu cầu cũ
// được trộn vào chặng (`tronChangCu`, R2b/c).
import type { LegDirection } from "./contracts.ts";
import { UUID_RE } from "./http.ts";
import { cleanText, maskLongDigits } from "./text-guards.ts";
import { addDays, isHHMM, isISODate } from "./vn-date.ts";

export type { LegDirection };

export const CHIEU_LABEL: Record<LegDirection, string> = { OUT: "Chiều đi", RETURN: "Chiều về" };
export const isLegDirection = (v: unknown): v is LegDirection => v === "OUT" || v === "RETURN";

/** Lý do đóng chặng — danh sách ĐÓNG ở mã (Ruling R6), không CHECK ở CSDL: thêm lý do = sửa mã, không dựng lại bảng. */
export const LY_DO_DONG_CHANG = {
  NOT_NEEDED: "Khách không cần đưa đón nữa",
  WRONG_ENTRY: "Nhập nhầm",
  REPLACED: "Đổi sang chặng khác",
} as const;
export type LyDoDongChang = keyof typeof LY_DO_DONG_CHANG;
export const isLyDoDongChang = (v: unknown): v is LyDoDongChang => typeof v === "string" && Object.hasOwn(LY_DO_DONG_CHANG, v);

/**
 * Chữ tạm cho nơi đón còn thiếu (nơi đón là BẮT BUỘC ở chặng): (1) migration 0034 chép dịch vụ cũ có giờ đón mà không có điểm đón — Q1 (a), GIẢ ĐỊNH chờ
 * chủ chạy truy vấn đếm; (2) thân yêu cầu CŨ gửi giờ đón mà để trống điểm đón (`tronChangCu`). Kiểm định kỳ R-ORD-12 liệt kê chặng mở còn chữ này.
 */
export const NOI_DON_CHUA_GHI = "(chưa ghi nơi đón)";

/** Trần số chặng mỗi dịch vụ (giả định G5 của kế hoạch). */
export const MAX_CHANG_MOI_DICH_VU = 10;
/** Khoảng ngày đón so với ngày đi của dịch vụ — chủ trả lời Q2 (2026-09-29): "Sớm 1 ngày, muộn 7 ngày". Đổi về sau chỉ sửa hai con số. */
export const NGAY_DON_TRUOC_NGAY_DI = 1;
export const NGAY_DON_SAU_NGAY_DI = 7;
const MAX_NOI = 200;

/** Ngày đón hợp lệ của một dịch vụ có ngày đi `departDate` (hai đầu bao gồm). */
export function khoangNgayDon(departDate: string): { from: string; to: string } {
  return { from: addDays(departDate, -NGAY_DON_TRUOC_NGAY_DI), to: addDays(departDate, NGAY_DON_SAU_NGAY_DI) };
}

/** Chặng đã kiểm, dạng GHI (rỗng → null). `id` null = chặng mới. */
export interface ChangHopLe {
  id: string | null;
  direction: LegDirection;
  pickupDate: string | null;
  pickupTime: string | null;
  pickupLocationId: string | null;
  pickupPlace: string | null;
  dropoffLocationId: string | null;
  dropoffPlace: string | null;
}

/** Chặng CÒN HIỆU LỰC đã lưu (đọc từ CSDL): dạng ghi + nhãn đọc (tên điểm danh mục hoặc chữ). */
export interface ChangDaLuu extends ChangHopLe {
  id: string;
  pickupLabel: string;
  dropoffLabel: string | null;
}

export interface NguCanhChang {
  /** Tiền tố câu lỗi, vd "Dịch vụ 1, chặng 2". */
  at: string;
  /** Ngày đi của dịch vụ (null = đơn nháp chưa có ngày). */
  departDate: string | null;
  /** Chiều CỐ ĐỊNH (route sửa chặng — không đổi chiều); vắng = đọc `direction` của thân. */
  direction?: LegDirection;
  /** Có (hôm nay, giờ VN) khi đơn ĐÃ XÁC NHẬN: ngày đón MỚI/ĐỔI phải ≥ hôm nay. */
  today?: string | null;
  /** Ngày đón đang lưu (route sửa chặng): giữ nguyên ngày cũ thì không xét "đã qua". */
  ngayCu?: string | null;
}

export type KetQuaChang = { ok: true; value: ChangHopLe } | { ok: false; message: string };

function noi(idRaw: unknown, placeRaw: unknown, label: string, at: string): { ok: true; id: string | null; place: string | null } | { ok: false; message: string } {
  let id: string | null = null;
  if (idRaw !== undefined && idRaw !== null && idRaw !== "") {
    if (typeof idRaw !== "string" || !UUID_RE.test(idRaw)) return { ok: false, message: `${at}: ${label} (điểm có sẵn) không hợp lệ.` };
    id = idRaw;
  }
  const place = cleanText(placeRaw, `${at}: ${label}`, MAX_NOI, false);
  if (place.error) return { ok: false, message: place.error };
  if (id !== null && place.value !== null) return { ok: false, message: `${at}: ${label}: chọn điểm có sẵn HOẶC gõ chữ, không cả hai.` };
  return { ok: true, id, place: place.value };
}

/**
 * Kiểm MỘT chặng từ thân yêu cầu (`LegInput`/`LegEditInput`). Nơi đón đúng một, nơi trả tối đa một; giờ HH:MM; ngày đúng lịch trong
 * `khoangNgayDon(departDate)`; ngày đón trống + dịch vụ có ngày đi → điền ngày đi (Ruling R4b); đơn đã xác nhận → ngày đón mới/đổi không được đã qua.
 * Điểm danh mục có tồn tại/đang dùng không là việc của máy chủ (đọc `v_loc_location_label`, R7) — không ở đây.
 */
export function kiemChang(raw: unknown, ctx: NguCanhChang): KetQuaChang {
  const at = ctx.at;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, message: `${at} không hợp lệ.` };
  const r = raw as Record<string, unknown>;
  let id: string | null = null;
  if (r.id !== undefined && r.id !== null && r.id !== "") {
    if (typeof r.id !== "string" || !UUID_RE.test(r.id)) return { ok: false, message: `${at}: mã chặng không hợp lệ.` };
    id = r.id;
  }
  const direction = ctx.direction ?? r.direction;
  if (!isLegDirection(direction)) return { ok: false, message: `${at}: chiều đưa đón không hợp lệ (chiều đi hoặc chiều về).` };

  let pickupDate: string | null = null;
  if (r.pickupDate !== undefined && r.pickupDate !== null && r.pickupDate !== "") {
    if (typeof r.pickupDate !== "string" || !isISODate(r.pickupDate.trim())) return { ok: false, message: `${at}: ngày đón không hợp lệ (định dạng YYYY-MM-DD).` };
    pickupDate = r.pickupDate.trim();
  }
  if (pickupDate === null) pickupDate = ctx.departDate; // R4b
  if (pickupDate !== null && ctx.departDate) {
    const { from, to } = khoangNgayDon(ctx.departDate);
    if (pickupDate < from || pickupDate > to) {
      return { ok: false, message: `${at}: ngày đón phải từ ${from} đến ${to} (sớm nhất ${NGAY_DON_TRUOC_NGAY_DI} ngày trước, muộn nhất ${NGAY_DON_SAU_NGAY_DI} ngày sau ngày đi).` };
    }
  }
  if (ctx.today && pickupDate !== null && pickupDate !== (ctx.ngayCu ?? null) && pickupDate < ctx.today) {
    return { ok: false, message: `${at}: ngày đón đã qua — đơn đã xác nhận chỉ đặt được ngày đón từ hôm nay trở đi.` };
  }

  let pickupTime: string | null = null;
  if (r.pickupTime !== undefined && r.pickupTime !== null && r.pickupTime !== "") {
    if (typeof r.pickupTime !== "string" || !isHHMM(r.pickupTime.trim())) return { ok: false, message: `${at}: giờ đón không hợp lệ (định dạng HH:MM).` };
    pickupTime = r.pickupTime.trim();
  }

  const don = noi(r.pickupLocationId, r.pickupPlace, "nơi đón", at);
  if (!don.ok) return don;
  if (don.id === null && don.place === null) return { ok: false, message: `${at}: cần nơi đón (chọn điểm có sẵn hoặc gõ nơi đón).` };
  const tra = noi(r.dropoffLocationId, r.dropoffPlace, "nơi trả", at);
  if (!tra.ok) return tra;

  return {
    ok: true,
    value: { id, direction, pickupDate, pickupTime, pickupLocationId: don.id, pickupPlace: don.place, dropoffLocationId: tra.id, dropoffPlace: tra.place },
  };
}

/** Thứ tự "sớm nhất": ngày (trống xếp sau), rồi giờ có trước giờ trống, rồi giờ, rồi id. */
function somHon(a: { id: string | null; pickupDate: string | null; pickupTime: string | null }, b: typeof a): number {
  if (a.pickupDate !== b.pickupDate) {
    if (a.pickupDate === null) return 1;
    if (b.pickupDate === null) return -1;
    return a.pickupDate < b.pickupDate ? -1 : 1;
  }
  if (a.pickupTime !== b.pickupTime) {
    if (a.pickupTime === null) return 1;
    if (b.pickupTime === null) return -1;
    return a.pickupTime < b.pickupTime ? -1 : 1;
  }
  const ai = a.id ?? "";
  const bi = b.id ?? "";
  return ai < bi ? -1 : ai > bi ? 1 : 0;
}

/** Xếp chặng để hiển thị: ngày, giờ đón (có trước trống), chiều đi trước chiều về, id — trả mảng MỚI. */
export function xepChang<T extends { id: string | null; direction: LegDirection; pickupDate: string | null; pickupTime: string | null }>(legs: readonly T[]): T[] {
  return [...legs].sort((a, b) => {
    const d = somHon({ ...a, id: null }, { ...b, id: null });
    if (d !== 0) return d;
    if (a.direction !== b.direction) return a.direction === "OUT" ? -1 : 1;
    return somHon(a, b);
  });
}

/**
 * Hai khoá cũ `pickupTime`/`pickupPlace` của một dịch vụ, DẪN XUẤT từ chặng (Ruling R2a, một hàm cho mọi nơi đọc): chặng CHIỀU ĐI còn mở sớm nhất
 * (ngày, rồi giờ có trước giờ trống, rồi id); nơi = tên điểm danh mục hoặc chữ (`pickupLabel`). Không có chiều đi → hai khoá null.
 * `legs` = CHỈ chặng còn hiệu lực (nơi gọi lọc).
 * Nơi đón là chữ tạm `NOI_DON_CHUA_GHI` (dịch vụ cũ / thân cũ có giờ mà không có điểm đón — chặng buộc có nơi đón) → `pickupPlace` = null: giao diện hôm nay
 * hiện y như trước ("Đón: 07:00"), ghi kép cột cũ = NULL như trước migration (tiêu chí 3; giả định G12, đảo ngược bằng một dòng). Nhãn của CHÍNH chặng
 * (`legs[].pickupLabel`, hàm hẹp cho Vận chuyển) vẫn mang chữ tạm để văn phòng bổ sung (kiểm định kỳ R-ORD-12).
 */
export function chieuDiDau(legs: readonly Pick<ChangDaLuu, "id" | "direction" | "pickupDate" | "pickupTime" | "pickupLabel">[]): { pickupTime: string | null; pickupPlace: string | null } {
  const out = legs.filter((l) => l.direction === "OUT").sort(somHon)[0];
  if (!out) return { pickupTime: null, pickupPlace: null };
  return { pickupTime: out.pickupTime, pickupPlace: out.pickupLabel === NOI_DON_CHUA_GHI ? null : out.pickupLabel };
}

const daysBetween = (from: string, to: string): number => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

/**
 * Đổi ngày đi của dịch vụ → dời ngày đón của MỌI chặng của dịch vụ đó CÙNG số ngày (Ruling R4e; "đón tối hôm trước" vẫn là hôm trước). Ngày đi cũ trống
 * → chỉ điền ngày mới cho chặng chưa có ngày; ngày mới trống → giữ nguyên. Chặng chưa có ngày giữ trống khi có đủ hai ngày. Trả mảng MỚI (không sửa nguồn).
 */
export function doiNgayChang<T extends { pickupDate: string | null }>(legs: readonly T[], ngayDiCu: string | null, ngayDiMoi: string | null): T[] {
  if (ngayDiMoi === null || ngayDiCu === ngayDiMoi) return legs.map((l) => ({ ...l }));
  if (ngayDiCu === null) return legs.map((l) => ({ ...l, pickupDate: l.pickupDate ?? ngayDiMoi }));
  const delta = daysBetween(ngayDiCu, ngayDiMoi);
  return legs.map((l) => ({ ...l, pickupDate: l.pickupDate === null ? null : addDays(l.pickupDate, delta) }));
}

const toGhi = (l: ChangDaLuu): ChangHopLe => ({
  id: l.id, direction: l.direction, pickupDate: l.pickupDate, pickupTime: l.pickupTime, pickupLocationId: l.pickupLocationId, pickupPlace: l.pickupPlace,
  dropoffLocationId: l.dropoffLocationId, dropoffPlace: l.dropoffPlace,
});

/**
 * Trộn hai khoá CŨ của thân yêu cầu (`pickupTime`/`pickupPlace` — máy chưa tải bản mới, bảng "Sửa thông tin chuyến" cũ) vào chặng CHIỀU ĐI ĐẦU của dịch vụ
 * (Ruling R2b/c). Khoá VẮNG (`undefined`) = giữ; khoá CÓ (kể cả `null` = rỗng đã chuẩn hoá) = áp. Chiều về, nơi trả, điểm danh mục, ngày đón không đổi.
 * - chưa có chiều đi, có giờ hoặc nơi → tạo chiều đi mới (`id` null, ngày đón = `ngayDi`, nơi trả trống);
 * - đã có → chỉ đổi giờ/nơi; chữ TRÙNG tên điểm danh mục đang trỏ → giữ `pickupLocationId` (bảng cũ gửi lại tên dẫn xuất); khác → chữ tự do;
 * - giờ và nơi đều rỗng → `boChieuDi` = id chiều đi đầu (nơi gọi xoá — đơn nháp — hoặc đóng với lý do NOT_NEEDED);
 * - có giờ mà nơi rỗng → nơi đón = `NOI_DON_CHUA_GHI` (nơi đón bắt buộc; cùng giả định Q1 (a)).
 */
export function tronChangCu(
  stored: readonly ChangDaLuu[],
  cu: { pickupTime?: string | null; pickupPlace?: string | null },
  ngayDi: string | null,
): { legs: ChangHopLe[]; boChieuDi: string | null } {
  const legs = stored.map(toGhi);
  if (cu.pickupTime === undefined && cu.pickupPlace === undefined) return { legs, boChieuDi: null };
  const dau = stored.filter((l) => l.direction === "OUT").sort(somHon)[0];
  const time = cu.pickupTime === undefined ? (dau?.pickupTime ?? null) : cu.pickupTime;
  const place = cu.pickupPlace === undefined ? (dau?.pickupLabel ?? null) : cu.pickupPlace;
  if (time === null && place === null) return dau ? { legs: legs.filter((l) => l.id !== dau.id), boChieuDi: dau.id } : { legs, boChieuDi: null };
  if (!dau) {
    legs.push({ id: null, direction: "OUT", pickupDate: ngayDi, pickupTime: time, pickupLocationId: null, pickupPlace: place ?? NOI_DON_CHUA_GHI, dropoffLocationId: null, dropoffPlace: null });
    return { legs, boChieuDi: null };
  }
  const i = legs.findIndex((l) => l.id === dau.id);
  const cur = legs[i]!;
  let pickupLocationId = cur.pickupLocationId;
  let pickupPlace = cur.pickupPlace;
  if (cu.pickupPlace !== undefined) {
    if (place === null) [pickupLocationId, pickupPlace] = [null, NOI_DON_CHUA_GHI];
    else if (!(cur.pickupLocationId !== null && place === dau.pickupLabel)) [pickupLocationId, pickupPlace] = [null, place];
  }
  legs[i] = { ...cur, pickupTime: time, pickupLocationId, pickupPlace };
  return { legs, boChieuDi: null };
}

/** Dữ liệu một chặng để viết nhật ký: nhãn nơi (tên điểm hoặc chữ), không id. */
export interface MoTaChangVao {
  direction: LegDirection;
  pickupDate: string | null;
  pickupTime: string | null;
  noiDon: string;
  noiTra: string | null;
}

/**
 * Câu nhật ký của một thay đổi chặng (ADR-0047 A1: "trước→sau, nơi chữ tự do che dãy số"): "Chiều đi · <tên dịch vụ>: giờ đón 06:30 → 07:00; nơi đón A →
 * B". Thêm: "…: thêm — ngày đón …, giờ đón …, nơi đón …, nơi trả …". Bỏ: "…: bỏ — <lý do>". CHE dãy từ 8 chữ số ở TÊN DỊCH VỤ và NƠI (chữ tự do — tên
 * dịch vụ nhập tay cũng che, khuôn `pool.ts`); ngày/giờ không che (không phải chữ tự do). Không in id. null = không đổi gì.
 */
export function moTaChang(tenDichVu: string, truoc: MoTaChangVao | null, sau: MoTaChangVao | null, lyDo?: LyDoDongChang): string | null {
  const chieu = (sau ?? truoc)?.direction;
  if (!chieu) return null;
  const head = `${CHIEU_LABEL[chieu]} · ${maskLongDigits(tenDichVu)}`;
  const v = (x: string | null, empty: string) => (x === null ? empty : x);
  const n = (x: string | null, empty: string) => (x === null ? empty : maskLongDigits(x));
  if (truoc === null && sau !== null) {
    return `${head}: thêm — ngày đón ${v(sau.pickupDate, "(chưa có)")}, giờ đón ${v(sau.pickupTime, "(chưa chốt)")}, nơi đón ${n(sau.noiDon, "(trống)")}, nơi trả ${n(sau.noiTra, "(chưa chốt)")}`;
  }
  if (truoc !== null && sau === null) return `${head}: bỏ — ${lyDo ? LY_DO_DONG_CHANG[lyDo] : "không rõ lý do"}`;
  if (truoc === null || sau === null) return null;
  const parts: string[] = [];
  if (truoc.pickupDate !== sau.pickupDate) parts.push(`ngày đón ${v(truoc.pickupDate, "(trống)")} → ${v(sau.pickupDate, "(trống)")}`);
  if (truoc.pickupTime !== sau.pickupTime) parts.push(`giờ đón ${v(truoc.pickupTime, "(trống)")} → ${v(sau.pickupTime, "(trống)")}`);
  if (truoc.noiDon !== sau.noiDon) parts.push(`nơi đón ${n(truoc.noiDon, "(trống)")} → ${n(sau.noiDon, "(trống)")}`);
  if (truoc.noiTra !== sau.noiTra) parts.push(`nơi trả ${n(truoc.noiTra, "(trống)")} → ${n(sau.noiTra, "(trống)")}`);
  return parts.length ? `${head}: ${parts.join("; ")}` : null;
}
