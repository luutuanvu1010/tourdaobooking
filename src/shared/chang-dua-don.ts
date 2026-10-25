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
import { NHAN_TRUONG_THOI_GIAN } from "./truong-thoi-gian.ts";

export type { LegDirection };

export const CHIEU_LABEL: Record<LegDirection, string> = { OUT: "Chiều đi", RETURN: "Chiều về" };
export const isLegDirection = (v: unknown): v is LegDirection => v === "OUT" || v === "RETURN";

/** Lý do đóng chặng — danh sách ĐÓNG ở mã (Ruling R6), không CHECK ở CSDL: thêm lý do = sửa mã, không dựng lại bảng. */
export const LY_DO_DONG_CHANG = {
  NOT_NEEDED: "Khách không cần đưa đón nữa",
  WRONG_ENTRY: "Nhập nhầm",
  REPLACED: "Đổi sang lượt đưa đón khác",
} as const;
export type LyDoDongChang = keyof typeof LY_DO_DONG_CHANG;
export const isLyDoDongChang = (v: unknown): v is LyDoDongChang => typeof v === "string" && Object.hasOwn(LY_DO_DONG_CHANG, v);

/**
 * Lý do ĐẶT GẤP một chặng dưới mốc tối thiểu (ADR-0049 D2; kế hoạch I26). Danh sách ĐÓNG ở mã (khuôn `LY_DO_DONG_CHANG`); CSDL (0040) chỉ giữ khuôn chữ
 * HOA. Bán hàng, Quản trị, Toàn quyền đặt gấp (ô `order.leg.short_notice` — ADR-0107), chỉ cho chặng đang dưới mốc. Mã + nhãn theo BẢN VẼ của chủ (ruling R-P18 của điều phối 29/9 — thay giả định G-02;
 * đổi TRƯỚC khi 0040 lên remote nên không có dữ liệu mang mã cũ).
 */
export const LY_DO_DAT_GAP = {
  KHACH_DOAN_GOI_GAP: "Khách đoàn gọi gấp",
  CHUYEN_BAY_DOI_GIO: "Chuyến bay đổi giờ",
  DON_BU_LO_CHUYEN: "Đơn bù cho khách bị lỡ chuyến",
  KHAC: "Lý do khác",
} as const;
export type LyDoDatGap = keyof typeof LY_DO_DAT_GAP;
export const isLyDoDatGap = (v: unknown): v is LyDoDatGap => typeof v === "string" && Object.hasOwn(LY_DO_DAT_GAP, v);
/**
 * Đoạn ĐUÔI "đặt gấp" trong `detail` nhật ký của đơn (route đặt gấp, nhánh `datGap` của lệnh sửa / thêm chặng — `kemDatGap` của orders). MỘT chỗ viết; hai
 * chỗ đọc: `lichSuTheoVai` (rút gọn theo vai) và hàm đọc tin `phanDoiCuaTin` (ADR-0062 Đ2 — bóc đuôi, không vào câu tin).
 */
export const DAU_DAT_GAP = " · đặt gấp: ";
export const ghiDatGapNhatKy = (nhanLyDo: string): string => `${DAU_DAT_GAP}${nhanLyDo}`;
/** Ghi chú đặt gấp tối đa (khớp `CHECK` của 0040) — đếm SAU khi che dãy số. */
export const GHI_CHU_DAT_GAP_TOI_DA = 120;

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

/**
 * Chặng đã kiểm, dạng GHI (rỗng → null). `id` null = chặng mới.
 * Hai ô PHỤ (kế hoạch 2026-10-01-may-chu-o-moi-chang): `flightCode` (số hiệu chuyến bay, ADR-0055 VK2-C) và `paxOverride` (số người riêng của chặng VỀ,
 * ADR-0054 D10.3), cộng hai ô CAM KẾT (ADR-0056 VK3-A): `exclusiveVehicle` (xe riêng) và `minVehicleSeats` (xe tối thiểu N chỗ, 1..100, không kể tài xế).
 * `undefined` = thân KHÔNG có khoá (máy chưa tải bản mới) — nơi ghi CHÉP giá trị đang lưu ("khoá vắng = giữ"); `null` = gửi tường minh để xoá (cam kết
 * `exclusiveVehicle` không có `null`: chỉ true / false). Các ô này KHÔNG phải trường vận hành (không xét mốc 6 giờ — `chiDoiOPhu`).
 */
export interface ChangHopLe {
  id: string | null;
  direction: LegDirection;
  pickupDate: string | null;
  pickupTime: string | null;
  pickupLocationId: string | null;
  pickupPlace: string | null;
  dropoffLocationId: string | null;
  dropoffPlace: string | null;
  flightCode?: string | null;
  paxOverride?: number | null;
  exclusiveVehicle?: boolean;
  minVehicleSeats?: number | null;
  /**
   * Giờ CUỐI khung đón (ADR-0134 Đ3) — chỉ có khi thân gửi khoá (người lập chọn khung). Vắng / null = "Giờ khác": nơi ghi chèn NULL. Không chép từ chặng
   * đang lưu (`toGhi`): thân cũ không biết khung, chèn lại không có cuối khung là an toàn (CHECK của 0115 không bao giờ vỡ).
   */
  pickupSlotEnd?: string | null;
}

/** Chặng CÒN HIỆU LỰC đã lưu (đọc từ CSDL): dạng ghi + nhãn đọc (tên điểm danh mục hoặc chữ); hai ô phụ LUÔN có (đọc từ cột). */
export interface ChangDaLuu extends ChangHopLe {
  id: string;
  pickupLabel: string;
  dropoffLabel: string | null;
  flightCode: string | null;
  paxOverride: number | null;
  exclusiveVehicle: boolean;
  minVehicleSeats: number | null;
}

/** Khuôn số hiệu chuyến bay SAU chuẩn hoá (ADR-0055 C1): 2 ký tự hãng (chữ hoặc số) + 1–4 chữ số + tối đa một chữ cái đuôi. CSDL chỉ giữ chữ HOA, 3..8. */
export const KHUON_SO_HIEU_CHUYEN_BAY = /^[A-Z0-9]{2}[0-9]{1,4}[A-Z]?$/;

/** Chuẩn hoá số hiệu chuyến bay (ADR-0055 C1): bỏ MỌI khoảng trắng, chữ HOA, khớp khuôn. `null` / chuỗi rỗng → null (xoá). Sai → câu tiếng Việt. */
export function chuanHoaSoHieuChuyenBay(raw: unknown): { ok: true; value: string | null } | { ok: false; message: string } {
  if (raw === null || raw === undefined) return { ok: true, value: null };
  if (typeof raw !== "string") return { ok: false, message: "Số hiệu chuyến bay không hợp lệ." };
  const v = raw.replace(/\s+/g, "").toUpperCase();
  if (v === "") return { ok: true, value: null };
  if (!KHUON_SO_HIEU_CHUYEN_BAY.test(v)) return { ok: false, message: "Số hiệu chuyến bay không hợp lệ (ví dụ VN1553, VJ123)." };
  return { ok: true, value: v };
}

/** Số chỗ tối thiểu của xe (ADR-0056 VK3-A) — khớp CHECK của migration 0077. */
export const CHO_TOI_THIEU_MIN = 1;
export const CHO_TOI_THIEU_MAX = 100;
/** Đọc `minVehicleSeats` (khoá CÓ mặt): `null` / "" → null (bỏ); số nguyên 1..100 (không kể tài xế); còn lại → câu tiếng Việt có tiền tố chặng `at`. */
export function docChoToiThieu(raw: unknown, at: string): { ok: true; value: number | null } | { ok: false; message: string } {
  if (raw === null || raw === "") return { ok: true, value: null };
  if (typeof raw !== "number" || !Number.isInteger(raw) || raw < CHO_TOI_THIEU_MIN || raw > CHO_TOI_THIEU_MAX) {
    return { ok: false, message: `${at}: số chỗ tối thiểu là số nguyên từ ${CHO_TOI_THIEU_MIN} đến ${CHO_TOI_THIEU_MAX} (không kể tài xế).` };
  }
  return { ok: true, value: raw };
}

/** Bốn ô phụ của thân chặng (số hiệu, số người về, hai ô cam kết). */
type OPhuKhoa = "flightCode" | "paxOverride" | "exclusiveVehicle" | "minVehicleSeats";

/**
 * Các ô phụ của thân chặng: CHỈ đọc khoá CÓ MẶT (vắng → không có khoá trong kết quả). `paxOverride`: số nguyên ≥ 1, chỉ chặng VỀ (0 người thì bỏ chặng —
 * ADR-0054 D10.3); `null` / "" = xoá. "≤ số khách hiệu lực" (L-R1) là việc của máy chủ (cần số khách).
 */
function oPhu(r: Record<string, unknown>, direction: LegDirection, at: string): { ok: true; value: Pick<ChangHopLe, OPhuKhoa> } | { ok: false; message: string } {
  const out: Pick<ChangHopLe, OPhuKhoa> = {};
  if ("flightCode" in r) {
    const f = chuanHoaSoHieuChuyenBay(r.flightCode);
    if (!f.ok) return { ok: false, message: `${at}: ${f.message}` };
    out.flightCode = f.value;
  }
  if ("paxOverride" in r) {
    const p = docSoNguoiVe(r.paxOverride, direction, at);
    if (!p.ok) return p;
    out.paxOverride = p.value;
  }
  if ("exclusiveVehicle" in r) {
    if (typeof r.exclusiveVehicle !== "boolean") return { ok: false, message: `${at}: xe riêng phải là có / không.` };
    out.exclusiveVehicle = r.exclusiveVehicle;
  }
  if ("minVehicleSeats" in r) {
    const c = docChoToiThieu(r.minVehicleSeats, at);
    if (!c.ok) return c;
    out.minVehicleSeats = c.value;
  }
  return { ok: true, value: out };
}

/** Đọc MỘT giá trị số người chiều về (khoá CÓ mặt): `null` / "" → null (xoá); số nguyên ≥ 1; chỉ chặng VỀ. Dùng chung cho `kiemChang` và nhánh nháp của route sửa chặng. */
export function docSoNguoiVe(p: unknown, direction: LegDirection, at: string): { ok: true; value: number | null } | { ok: false; message: string } {
  if (p === null || p === "") return { ok: true, value: null };
  if (typeof p !== "number" || !Number.isInteger(p) || p < 1) return { ok: false, message: `${at}: số người chiều về phải là số nguyên từ 1 trở lên (0 người thì bỏ lượt đưa đón).` };
  if (direction !== "RETURN") return { ok: false, message: `${at}: chỉ chiều về mới có số người chiều về riêng.` };
  return { ok: true, value: p };
}

/**
 * Lệnh sửa chặng CHỈ đổi ô phụ (số hiệu chuyến bay / số người chiều về / cam kết xe riêng, số chỗ tối thiểu — ADR-0056 VK3-A) — ngày, giờ, nơi đón, nơi trả y nguyên ⇒ KHÔNG xét mốc 6 giờ (ADR-0055 C2, ADR-0054
 * D10.3: mốc chỉ xét bốn trường vận hành — ADR-0049 D2) và GIỮ dấu đặt gấp cũ (chủ Q-B 1/10 "Giữ dấu đặt gấp cũ"). Không đổi gì cũng trả true.
 */
export function chiDoiOPhu(
  cu: Pick<ChangHopLe, "pickupDate" | "pickupTime" | "pickupLocationId" | "pickupPlace" | "dropoffLocationId" | "dropoffPlace">,
  moi: Pick<ChangHopLe, "pickupDate" | "pickupTime" | "pickupLocationId" | "pickupPlace" | "dropoffLocationId" | "dropoffPlace">,
): boolean {
  return cu.pickupDate === moi.pickupDate && cu.pickupTime === moi.pickupTime && cu.pickupLocationId === moi.pickupLocationId && cu.pickupPlace === moi.pickupPlace &&
    cu.dropoffLocationId === moi.dropoffLocationId && cu.dropoffPlace === moi.dropoffPlace;
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
    if (typeof r.id !== "string" || !UUID_RE.test(r.id)) return { ok: false, message: `${at}: mã lượt đưa đón không hợp lệ.` };
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
  // ADR-0134 Đ3: cuối khung (HH:MM) chỉ đi cùng giờ đón và phải SAU giờ đón — cùng điều kiện CHECK của migration 0115 (báo 400 thay vì 500).
  let pickupSlotEnd: string | null = null;
  if (r.pickupSlotEnd !== undefined && r.pickupSlotEnd !== null && r.pickupSlotEnd !== "") {
    if (typeof r.pickupSlotEnd !== "string" || !isHHMM(r.pickupSlotEnd.trim())) return { ok: false, message: `${at}: giờ cuối khung đón không hợp lệ (định dạng HH:MM).` };
    pickupSlotEnd = r.pickupSlotEnd.trim();
    if (pickupTime === null) return { ok: false, message: `${at}: chọn khung giờ đón thì phải có giờ đón (giờ cuối khung đi cùng giờ đầu khung).` };
    if (pickupSlotEnd <= pickupTime) return { ok: false, message: `${at}: giờ cuối khung đón phải sau giờ đón.` };
  }

  const don = noi(r.pickupLocationId, r.pickupPlace, "nơi đón", at);
  if (!don.ok) return don;
  if (don.id === null && don.place === null) return { ok: false, message: `${at}: cần nơi đón (chọn điểm có sẵn hoặc gõ nơi đón).` };
  const tra = noi(r.dropoffLocationId, r.dropoffPlace, "nơi trả", at);
  if (!tra.ok) return tra;
  const phu = oPhu(r, direction, at);
  if (!phu.ok) return phu;

  return {
    ok: true,
    value: {
      id, direction, pickupDate, pickupTime, pickupLocationId: don.id, pickupPlace: don.place, dropoffLocationId: tra.id, dropoffPlace: tra.place, ...phu.value,
      ...(pickupSlotEnd !== null ? { pickupSlotEnd } : {}),
    },
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

/** Chặng đang lưu → dạng ghi. Hai ô phụ CHÉP nguyên (thân cũ không có khoá — "khoá vắng = giữ"); đối tượng nguồn thiếu khoá thì để vắng. */
const toGhi = (l: ChangDaLuu): ChangHopLe => ({
  id: l.id, direction: l.direction, pickupDate: l.pickupDate, pickupTime: l.pickupTime, pickupLocationId: l.pickupLocationId, pickupPlace: l.pickupPlace,
  dropoffLocationId: l.dropoffLocationId, dropoffPlace: l.dropoffPlace,
  ...(l.flightCode !== undefined ? { flightCode: l.flightCode } : {}),
  ...(l.paxOverride !== undefined ? { paxOverride: l.paxOverride } : {}),
  ...(l.exclusiveVehicle !== undefined ? { exclusiveVehicle: l.exclusiveVehicle } : {}),
  ...(l.minVehicleSeats !== undefined ? { minVehicleSeats: l.minVehicleSeats } : {}),
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
  /** Số hiệu chuyến bay (đã qua khuôn — ghi GIÁ TRỊ, không che: G-C2). Vắng = như null. */
  soHieu?: string | null;
  /** Số người riêng của chiều về; null = theo số khách dịch vụ. Vắng = như null. */
  soNguoiVe?: number | null;
  /** Cam kết xe riêng (ADR-0056 VK3-A). Vắng = như false. */
  xeRieng?: boolean;
  /** Cam kết xe tối thiểu N chỗ; null = không. Vắng = như null. */
  choToiThieu?: number | null;
}

// ADR-0062 Đ1: nhãn ngày / giờ đón của chặng LẤY TỪ bảng chung — hàm đọc tin (tin-doi-don.ts) nhận đúng các nhãn này (bài NT-B1).
const NGAY_DON = NHAN_TRUONG_THOI_GIAN.legPickupDate;
const GIO_DON = NHAN_TRUONG_THOI_GIAN.legPickupTime;

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
  const soHieu = (x: MoTaChangVao) => x.soHieu ?? null;
  const soVe = (x: MoTaChangVao) => x.soNguoiVe ?? null;
  const xeRieng = (x: MoTaChangVao) => x.xeRieng === true;
  const choTT = (x: MoTaChangVao) => x.choToiThieu ?? null;
  const veNhan = (x: number | null) => (x === null ? "theo số khách dịch vụ" : String(x));
  if (truoc === null && sau !== null) {
    const phu = [
      ...(soHieu(sau) !== null ? [`số hiệu chuyến bay ${soHieu(sau)}`] : []),
      ...(soVe(sau) !== null ? [`số người chiều về ${soVe(sau)}`] : []),
      ...(xeRieng(sau) ? ["xe riêng"] : []),
      ...(choTT(sau) !== null ? [`xe tối thiểu ${choTT(sau)} chỗ`] : []),
    ];
    return `${head}: thêm — ${NGAY_DON} ${v(sau.pickupDate, "(chưa có)")}, ${GIO_DON} ${v(sau.pickupTime, "(chưa chốt)")}, nơi đón ${n(sau.noiDon, "(trống)")}, nơi trả ${n(sau.noiTra, "(chưa chốt)")}${phu.map((x) => `, ${x}`).join("")}`;
  }
  if (truoc !== null && sau === null) return `${head}: bỏ — ${lyDo ? LY_DO_DONG_CHANG[lyDo] : "không rõ lý do"}`;
  if (truoc === null || sau === null) return null;
  const parts: string[] = [];
  if (truoc.pickupDate !== sau.pickupDate) parts.push(`${NGAY_DON} ${v(truoc.pickupDate, "(trống)")} → ${v(sau.pickupDate, "(trống)")}`);
  if (truoc.pickupTime !== sau.pickupTime) parts.push(`${GIO_DON} ${v(truoc.pickupTime, "(trống)")} → ${v(sau.pickupTime, "(trống)")}`);
  if (truoc.noiDon !== sau.noiDon) parts.push(`nơi đón ${n(truoc.noiDon, "(trống)")} → ${n(sau.noiDon, "(trống)")}`);
  if (truoc.noiTra !== sau.noiTra) parts.push(`nơi trả ${n(truoc.noiTra, "(trống)")} → ${n(sau.noiTra, "(trống)")}`);
  if (soHieu(truoc) !== soHieu(sau)) parts.push(`số hiệu chuyến bay ${v(soHieu(truoc), "(trống)")} → ${v(soHieu(sau), "(trống)")}`);
  if (soVe(truoc) !== soVe(sau)) parts.push(`số người chiều về ${veNhan(soVe(truoc))} → ${veNhan(soVe(sau))}`);
  if (xeRieng(truoc) !== xeRieng(sau)) parts.push(`xe riêng: ${xeRieng(truoc) ? "có" : "không"} → ${xeRieng(sau) ? "có" : "không"}`);
  if (choTT(truoc) !== choTT(sau)) parts.push(`xe tối thiểu: ${choTT(truoc) === null ? "—" : `${choTT(truoc)} chỗ`} → ${choTT(sau) === null ? "—" : `${choTT(sau)} chỗ`}`);
  return parts.length ? `${head}: ${parts.join("; ")}` : null;
}
