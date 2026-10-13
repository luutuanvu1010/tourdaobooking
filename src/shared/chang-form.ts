// Khối "Đưa đón" của thẻ dịch vụ (bản vẽ docs/design/2026-10-01-dua-don-hanh-khach/the-dua-don.dc.html — M1, M4, M6). Mô hình THUẦN của bản nháp chặng:
// giá trị ô nhập, chữ gợi ý nhỏ, lỗi dòng, liên kết chiều về ↔ chiều đi, dời ngày, thân `LegInput`. Không DOM. Luật chặng thật ở chang-dua-don.ts (máy chủ
// vẫn là nơi quyết định); mẫu gợi ý ở chang-mac-dinh.ts.
import { CHIEU_LABEL, CHO_TOI_THIEU_MAX, CHO_TOI_THIEU_MIN, doiNgayChang, NOI_DON_CHUA_GHI } from "./chang-dua-don.ts";
import { changMacDinh, type MauChang } from "./chang-mac-dinh.ts";
import type { LegDirection, LegDto, LegInput } from "./contracts.ts";
import { ngayNgan } from "./vn-date.ts";

/** Giá trị ô chọn nơi: "" = chưa chọn (nơi đón) / chưa chốt (nơi trả); `TU_DO` = "Gõ tự do…"; còn lại = id điểm danh mục. */
export const TU_DO = "tudo";

export interface ChangNhap {
  /** Khoá cục bộ (ổn định khi vẽ lại); KHÔNG gửi. */
  key: string;
  /** Chặng đã lưu (giữ id khi lưu nháp / route sửa chặng); null = mới. */
  id: string | null;
  direction: LegDirection;
  /** "YYYY-MM-DD" hoặc "" (máy chủ điền ngày đi — R4b). */
  pickupDate: string;
  /** "HH:MM" hoặc "" = chưa chốt giờ. */
  pickupTime: string;
  don: string;
  donTuDo: string;
  tra: string;
  traTuDo: string;
  flightCode: string;
  /** Chỉ chiều về: chữ số; "" = cả đoàn. */
  soVe: string;
  /** Cam kết "xe riêng" với khách (ADR-0056 VK3-A): công tắc Bật/Tắt; mặc định tắt. */
  xeRieng: boolean;
  /** Cam kết "xe tối thiểu N chỗ" (không kể tài xế): chữ số; "" = không yêu cầu. */
  choToiThieu: string;
  /** Chữ nhỏ "gợi ý theo dịch vụ" ở ô giờ / ô nơi trả (mất khi người lập sửa ô đó). */
  goiYGio: boolean;
  goiYTra: boolean;
  /** Chiều về đi theo chiều đi (M6): nơi đón = nơi trả chiều đi, nơi trả = nơi đón chiều đi — sửa ô nào thì ô đó thôi đi theo. */
  theoDon: boolean;
  theoTra: boolean;
  /** Chặng đã lưu nguyên bản (bảng sửa sau xác nhận so để biết đổi gì); null = mới. */
  goc: LegDto | null;
}

const rong = (key: string, direction: LegDirection, pickupDate: string): ChangNhap => ({
  key, id: null, direction, pickupDate, pickupTime: "", don: "", donTuDo: "", tra: "", traTuDo: "", flightCode: "", soVe: "", xeRieng: false, choToiThieu: "",
  goiYGio: false, goiYTra: false, theoDon: false, theoTra: false, goc: null,
});

/** Chặng đã lưu → ô nhập. Chữ tạm "(chưa ghi nơi đón)" (dữ liệu cũ) hiện như CHƯA CHỌN để người lập chọn lại. */
export function changTuDto(l: LegDto, key: string): ChangNhap {
  const tamDon = l.pickupLocationId === null && l.pickupPlace === NOI_DON_CHUA_GHI;
  return {
    key, id: l.id, direction: l.direction, pickupDate: l.pickupDate ?? "", pickupTime: l.pickupTime ?? "",
    don: l.pickupLocationId ?? (l.pickupPlace && !tamDon ? TU_DO : ""), donTuDo: tamDon ? "" : (l.pickupPlace ?? ""),
    tra: l.dropoffLocationId ?? (l.dropoffPlace ? TU_DO : ""), traTuDo: l.dropoffPlace ?? "",
    flightCode: l.flightCode ?? "", soVe: l.paxOverride === null ? "" : String(l.paxOverride),
    xeRieng: l.exclusiveVehicle, choToiThieu: l.minVehicleSeats === null ? "" : String(l.minVehicleSeats),
    goiYGio: false, goiYTra: false, theoDon: false, theoTra: false, goc: l,
  };
}

/** `LegInput` (mẫu gợi ý) → ô nhập: chặng đi mang chữ "gợi ý theo dịch vụ" ở nơi trả; chặng về đi theo chiều đi và mang gợi ý ở giờ. */
function tuMau(l: LegInput, key: string, ngayDi: string): ChangNhap {
  const ve = l.direction === "RETURN";
  return {
    ...rong(key, l.direction, ngayDi), pickupTime: l.pickupTime,
    don: l.pickupLocationId ?? (l.pickupPlace ? TU_DO : ""), donTuDo: l.pickupPlace,
    tra: l.dropoffLocationId ?? (l.dropoffPlace ? TU_DO : ""), traTuDo: l.dropoffPlace,
    goiYGio: ve && l.pickupTime !== "", goiYTra: !ve && l.dropoffLocationId !== null, theoDon: ve, theoTra: ve,
  };
}

/** Chặng tạo sẵn khi CHỌN dịch vụ (M6): theo mẫu hiện hành; nơi đón chưa có. `taoSan` = câu ghi chú "Đã tạo sẵn…" cần hiện (null = không tạo gì). */
export function changTaoSan(mau: MauChang | null, ngayDi: string, newKey: () => string): { legs: ChangNhap[]; taoSan: string | null } {
  const legs = changMacDinh(mau, { pickupLocationId: null, pickupPlace: "" }).map((l) => tuMau(l, newKey(), ngayDi));
  if (legs.length === 0) return { legs, taoSan: null };
  return { legs, taoSan: legs.length === 2 ? "Đã tạo sẵn chiều đi và chiều về theo dịch vụ — sửa hoặc bỏ nếu khác." : "Đã tạo sẵn chiều đi theo dịch vụ — sửa hoặc bỏ nếu khác." };
}

/** "+ Thêm đưa đón" / "+ Thêm chặng": chặng đi mới; nơi trả gợi ý theo dịch vụ (nếu mẫu có). */
export function themChangDi(mau: MauChang | null, ngayDi: string, key: string): ChangNhap {
  const diem = mau?.noiTraMacDinh?.id ?? null;
  return { ...rong(key, "OUT", ngayDi), tra: diem ?? "", goiYTra: diem !== null };
}

/** "+ Thêm chiều về": nơi đón = nơi trả chiều đi đầu, nơi trả = nơi đón chiều đi đầu (kể cả chữ tự do), giờ = giờ về gợi ý; đi theo chiều đi. */
export function themChieuVe(legs: readonly ChangNhap[], mau: MauChang | null, ngayDi: string, key: string): ChangNhap {
  const dau = legs.find((l) => l.direction === "OUT");
  const gio = mau?.mode === "ROUND_TRIP" ? (mau.returnTimeHint ?? "") : "";
  return {
    ...rong(key, "RETURN", ngayDi), pickupTime: gio, goiYGio: gio !== "",
    don: dau?.tra ?? "", donTuDo: dau?.traTuDo ?? "", tra: dau?.don ?? "", traTuDo: dau?.donTuDo ?? "", theoDon: true, theoTra: true,
  };
}

export type SuaChang = Partial<Pick<ChangNhap, "pickupDate" | "pickupTime" | "don" | "donTuDo" | "tra" | "traTuDo" | "flightCode" | "soVe" | "xeRieng" | "choToiThieu">>;

/**
 * Sửa ô của chặng thứ `i` (trả mảng MỚI). Sửa ô nào thì bỏ chữ gợi ý / liên kết của ô đó. Sửa nơi đón / nơi trả của CHIỀU ĐI ĐẦU → chiều về còn đi theo
 * cập nhật theo (nơi trả về = nơi đón đi; nơi đón về = nơi trả đi).
 */
export function suaChang(legs: readonly ChangNhap[], i: number, p: SuaChang): ChangNhap[] {
  const out = legs.map((l) => ({ ...l }));
  const cu = out[i];
  if (!cu) return out;
  const moi: ChangNhap = { ...cu, ...p };
  if ("pickupTime" in p) moi.goiYGio = false;
  if ("don" in p || "donTuDo" in p) moi.theoDon = false;
  if ("tra" in p || "traTuDo" in p) {
    moi.theoTra = false;
    moi.goiYTra = false;
  }
  if ("soVe" in p) moi.soVe = (p.soVe ?? "").replace(/\D/g, "").slice(0, 3);
  if ("choToiThieu" in p) moi.choToiThieu = (p.choToiThieu ?? "").replace(/\D/g, "").slice(0, 3);
  if ("flightCode" in p) moi.flightCode = (p.flightCode ?? "").toUpperCase();
  out[i] = moi;
  const dau = out.findIndex((l) => l.direction === "OUT");
  if (i === dau) {
    for (const l of out) {
      if (l.direction !== "RETURN") continue;
      if (l.theoTra && ("don" in p || "donTuDo" in p)) [l.tra, l.traTuDo] = [moi.don, moi.donTuDo];
      if (l.theoDon && ("tra" in p || "traTuDo" in p)) [l.don, l.donTuDo] = [moi.tra, moi.traTuDo];
    }
  }
  return out;
}

/** Đổi ngày đi của cả đơn → dời ngày đón mọi chặng cùng số ngày (`doiNgayChang`). `soDoi` = số chặng có ngày đổi (câu "Đã dời ngày đón của N chặng…"). */
export function doiNgayDi(legs: readonly ChangNhap[], ngayCu: string, ngayMoi: string): { legs: ChangNhap[]; soDoi: number } {
  const dang = legs.map((l) => ({ ...l, pickupDate: l.pickupDate === "" ? null : l.pickupDate }));
  const doi = doiNgayChang(dang, ngayCu || null, ngayMoi || null).map((l) => ({ ...l, pickupDate: l.pickupDate ?? "" }));
  const soDoi = doi.filter((l, j) => legs[j]!.pickupDate !== "" && l.pickupDate !== legs[j]!.pickupDate).length;
  return { legs: doi, soDoi };
}
/**
 * Đợt 1 (bảng việc 13/10, #9): form TẠO đơn ẩn ô "Ngày đón" của chặng (mặc định = ngày đi của đơn; chặng chưa có ngày thì máy chủ tự điền ngày đi — Ruling R4b) và chỉ có lối nhỏ "Đón khác ngày" để mở.
 * Ô LUÔN hiện khi chặng đang có ngày đón khác ngày đi — không giấu một giá trị đang có. Chỉ dùng ở form (`che: "form"`); bảng "Sửa đưa đón" của đơn đã lưu luôn hiện ô. Luật khoảng ngày `khoangNgayDon` không đổi.
 */
export const canHienNgayDon = (l: Pick<ChangNhap, "pickupDate">, ngayDi: string): boolean => l.pickupDate !== "" && l.pickupDate !== ngayDi;
export const cauDoiNgay = (n: number): string => `Đã dời ngày đón của ${n} chặng theo ngày đi mới`;

/** Chữ nhỏ dưới các ô của chặng (bản vẽ). */
export function goiYChang(l: ChangNhap, ngayDi: string): { ngay: string; gio: string; don: string; tra: string } {
  const ngay = l.pickupDate === "" || ngayDi === "" ? "" : l.pickupDate === ngayDi ? "Bằng ngày đi" : `Khác ngày đi (${ngayNgan(ngayDi, l.pickupDate)})`;
  return {
    ngay,
    gio: l.goiYGio ? "gợi ý theo dịch vụ" : "",
    don: l.theoDon ? "theo nơi trả chiều đi" : "",
    tra: l.theoTra ? "theo nơi đón chiều đi" : l.goiYTra ? "gợi ý theo dịch vụ" : "",
  };
}

export interface LoiChang {
  don: string | null;
  donTuDo: string | null;
  soVe: string | null;
  /** Ô "Xe tối thiểu": "0" hoặc quá 100 → câu đúng chữ bản vẽ (Đợt 7). */
  choToiThieu: string | null;
}

/** Câu lỗi ô "Xe tối thiểu" (đúng chữ bản vẽ). */
export const CAU_LOI_CHO_TOI_THIEU = "Số chỗ từ 1 đến 100";

/**
 * Lỗi của một chặng (số thứ tự `so` bắt đầu 1). Nơi đón chỉ báo sau lần bấm Lưu đầu (`daLuu`); số người chiều về quá số khách báo ngay. `soKhach` = số khách
 * của dịch vụ (`tongKhach`).
 */
export function loiChang(l: ChangNhap, so: number, soKhach: number, daLuu: boolean): LoiChang {
  const n = l.soVe === "" ? null : Number(l.soVe);
  return {
    don: daLuu && l.don === "" ? `Chặng ${so}: chưa có nơi đón.` : null,
    donTuDo: daLuu && l.don === TU_DO && l.donTuDo.trim() === "" ? `Chặng ${so}: chưa ghi địa chỉ đón.` : null,
    soVe: l.direction === "RETURN" && n !== null && n > soKhach ? `Số người chiều về không được quá ${soKhach}.` : null,
    choToiThieu: l.choToiThieu !== "" && (Number(l.choToiThieu) < CHO_TOI_THIEU_MIN || Number(l.choToiThieu) > CHO_TOI_THIEU_MAX) ? CAU_LOI_CHO_TOI_THIEU : null,
  };
}

/** Mọi lỗi chặn Lưu của danh sách chặng (để liệt kê ở dải lỗi khi bấm Lưu). */
export function loiDanhSachChang(legs: readonly ChangNhap[], soKhach: number): string[] {
  return legs.flatMap((l, i) => {
    const e = loiChang(l, i + 1, soKhach, true);
    return [e.don, e.donTuDo, e.soVe, e.choToiThieu === null ? null : `Chặng ${i + 1}: ${CAU_LOI_CHO_TOI_THIEU.charAt(0).toLowerCase()}${CAU_LOI_CHO_TOI_THIEU.slice(1)}.`].filter((x): x is string => x !== null);
  });
}

/**
 * Bản "bốn bước" (14/10/2026): ba ô ÍT DÙNG của chặng — Số hiệu chuyến bay, Xe riêng, Xe tối thiểu — gập sau "+ Thêm chi tiết" TRONG chặng (form Tạo/sửa đơn). Có giá trị khác mặc định
 * (số hiệu khác trống, xe riêng Bật, số chỗ khác trống) thì khối PHẢI tự mở khi dựng — không giấu một giá trị đang có.
 */
export const chiTietChangCoGiaTri = (l: Pick<ChangNhap, "flightCode" | "xeRieng" | "choToiThieu">): boolean => l.flightCode.trim() !== "" || l.xeRieng || l.choToiThieu !== "";

/**
 * Chặng có được hiện GỌN MỘT DÒNG lúc dựng khối (form Tạo/sửa đơn) không: chỉ khi chặng đã đủ nơi đón (đã chọn điểm, hoặc "Gõ tự do" có địa chỉ) và KHÔNG có gì bị giấu sau dòng tóm tắt —
 * không ô ít dùng nào có giá trị, ngày đón không khác ngày đi, chiều về không có "số người chiều về", không lỗi nào của chặng. Chặng còn thiếu nơi đón (vừa tạo) hiện đủ ô vì người lập phải nhập.
 * Chỉ dùng LÚC DỰNG (lần đầu thấy chặng); chặng đã mở thì giữ mở, không tự gập giữa lúc người lập đang gõ.
 */
export function changNenGon(l: ChangNhap, so: number, soKhach: number, ngayDi: string): boolean {
  if (l.don === "" || (l.don === TU_DO && l.donTuDo.trim() === "")) return false;
  if (chiTietChangCoGiaTri(l) || canHienNgayDon(l, ngayDi) || l.soVe !== "") return false;
  const e = loiChang(l, so, soKhach, true);
  return e.don === null && e.donTuDo === null && e.soVe === null && e.choToiThieu === null;
}

/**
 * Dòng tóm tắt của chặng gọn: "Chiều đi · Đón 07:30 · Khách sạn ABC → Cảng Vinpearl" (chưa chốt giờ: "Chưa chốt giờ"; chưa chọn nơi trả: bỏ phần "→ …"). `nhanTheoId` tra nhãn ngắn của điểm danh mục
 * theo id (null = không biết → dùng nhãn đã lưu của chặng, rồi chữ "Điểm đã ngưng"); nơi "Gõ tự do" lấy địa chỉ đã gõ.
 */
export function tomTatChang(l: ChangNhap, nhanTheoId: (id: string) => string | null): string {
  const noi = (chon: string, chu: string, nhanLuu: string | null | undefined): string => (chon === "" ? "" : chon === TU_DO ? chu.trim() : (nhanTheoId(chon) ?? nhanLuu ?? "Điểm đã ngưng"));
  const don = noi(l.don, l.donTuDo, l.goc?.pickupLabel);
  const tra = noi(l.tra, l.traTuDo, l.goc?.dropoffLabel);
  const gio = l.pickupTime !== "" ? `Đón ${l.pickupTime}` : "Chưa chốt giờ";
  return [CHIEU_LABEL[l.direction], gio, `${don}${tra !== "" ? ` → ${tra}` : ""}`].join(" · ");
}

/** Ô "Số hiệu chuyến bay" hiện khi nơi đón / nơi trả là sân bay, hoặc chặng đã có số hiệu (không giấu dữ liệu đã lưu). */
export const coOSoHieu = (l: ChangNhap, laSanBay: (id: string) => boolean): boolean => laSanBay(l.don) || laSanBay(l.tra) || l.flightCode !== "";

const noi = (chon: string, chu: string): { id: string | null; place: string } =>
  chon === TU_DO ? { id: null, place: chu.trim() } : { id: chon === "" ? null : chon, place: "" };

/**
 * Thân `LegInput`. `guiSoVe` = người dùng có ô `order.trip.edit` (văn phòng): chỉ khi đó mới gửi `paxOverride` của chiều về — Đối tác / Thực tập gửi khoá
 * này khác bản đang lưu sẽ bị 403, nên để VẮNG (máy chủ giữ giá trị đang lưu). Không bao giờ gửi `pickupTime`/`pickupPlace` cũ của dịch vụ.
 */
export function legInput(l: ChangNhap, guiSoVe: boolean): LegInput {
  const don = noi(l.don, l.donTuDo);
  const tra = noi(l.tra, l.traTuDo);
  return {
    ...(l.id ? { id: l.id } : {}),
    direction: l.direction, pickupDate: l.pickupDate, pickupTime: l.pickupTime,
    pickupLocationId: don.id, pickupPlace: don.place, dropoffLocationId: tra.id, dropoffPlace: tra.place,
    flightCode: l.flightCode.trim(),
    // Cam kết với khách (ADR-0056 VK3-A): LUÔN gửi — Đối tác / Thực tập có `order.modify` nên sửa được trên nháp; không phụ thuộc `guiSoVe`.
    exclusiveVehicle: l.xeRieng, minVehicleSeats: l.choToiThieu === "" ? null : Number(l.choToiThieu),
    ...(guiSoVe && l.direction === "RETURN" ? { paxOverride: l.soVe === "" ? null : Number(l.soVe) } : {}),
  };
}

/**
 * Đơn nháp: chặng đã đặt gấp mà ngày / giờ / nơi đón / nơi trả GIỮ NGUYÊN → máy chủ chép lại dấu khi lưu (`chepDatGapNhap`, khoá theo nội dung) → hiện nhãn
 * đặt gấp thay vì cảnh báo dưới mốc. Đổi bất kỳ trường vận hành nào → dấu mất khi lưu. (Chỉ để hiện — máy chủ quyết.)
 */
export function giuDatGapNhap(l: ChangNhap): boolean {
  const g = l.goc;
  if (!g || g.datGap === null) return false;
  const m = legInput(l, false);
  return m.pickupDate === (g.pickupDate ?? "") && m.pickupTime === (g.pickupTime ?? "") && m.pickupLocationId === g.pickupLocationId && m.pickupPlace === (g.pickupPlace ?? "") &&
    m.dropoffLocationId === g.dropoffLocationId && m.dropoffPlace === (g.dropoffPlace ?? "");
}

/** Chặng đã sửa so với bản đã lưu (bảng "Sửa đưa đón" chỉ gửi lệnh cho chặng có đổi). Chặng mới luôn "đổi". */
export function changDaDoi(l: ChangNhap, guiSoVe: boolean): boolean {
  if (!l.goc) return true;
  const moi = legInput(l, guiSoVe);
  const g = l.goc;
  return (
    moi.pickupDate !== (g.pickupDate ?? "") || moi.pickupTime !== (g.pickupTime ?? "") || moi.pickupLocationId !== g.pickupLocationId ||
    (moi.pickupLocationId === null && moi.pickupPlace !== (g.pickupPlace ?? "")) || moi.dropoffLocationId !== g.dropoffLocationId ||
    (moi.dropoffLocationId === null && moi.dropoffPlace !== (g.dropoffPlace ?? "")) || (moi.flightCode ?? "") !== (g.flightCode ?? "") ||
    ("paxOverride" in moi && moi.paxOverride !== g.paxOverride) || moi.exclusiveVehicle !== g.exclusiveVehicle || moi.minVehicleSeats !== g.minVehicleSeats
  );
}
