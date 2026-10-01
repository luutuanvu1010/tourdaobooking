// Khối "Hành khách" của form đơn (M2) và bảng "Sửa danh sách hành khách" (M5) — bản vẽ docs/design/2026-10-01-dua-don-hanh-khach/khoi-hanh-khach.dc.html.
// Mô hình THUẦN: dòng nhập, lỗi dòng (chữ của bản vẽ), dòng đếm "3/4", câu nhắc thiếu / quá, thân gửi lên (nháp: `passengers`; đã xác nhận: them/sua/huy).
// Luật hành khách thật ở hanh-khach.ts (máy chủ quyết). Đoạn "Số khách đi xe" (ADR-0065) KHÔNG làm — mẫu số = số khách dịch vụ (D2, Tweaks tắt).
import type { PassengerChangeInput, PassengerDto, PassengerInput, PaxCode } from "./contracts.ts";
import { TUOI_TOI_DA } from "./hanh-khach.ts";
import { PAX_LABEL, PAX_ORDER } from "./order-lines.ts";

export interface DongKhach {
  key: string;
  /** Người đã lưu (đơn đã xác nhận: khoá người; nháp: null). */
  personKey: string | null;
  /** Dòng đã lưu (nháp gửi lại `id` để giữ id); null = mới. */
  rowId: string | null;
  ten: string;
  /** Chữ số đã gõ (tối đa 4). */
  nam: string;
  loai: PaxCode | "";
  /** Bản đã lưu (để biết có sửa không); null = mới. */
  goc: PassengerDto | null;
}

/** Lựa chọn "Loại khách" — đầu là "Chưa chọn". */
export const LUA_CHON_LOAI: readonly { value: PaxCode | ""; label: string }[] = [{ value: "", label: "Chưa chọn" }, ...PAX_ORDER.map((c) => ({ value: c, label: PAX_LABEL[c] }))];

export const dongTrong = (key: string): DongKhach => ({ key, personKey: null, rowId: null, ten: "", nam: "", loai: "", goc: null });
export const dongTuDto = (p: PassengerDto, key: string, daXacNhan: boolean): DongKhach => ({
  key, personKey: daXacNhan ? p.personKey : null, rowId: daXacNhan ? null : p.rowId, ten: p.fullName, nam: String(p.birthYear), loai: p.paxCode ?? "", goc: p,
});

export const chuanNam = (s: string): string => s.replace(/\D/g, "").slice(0, 4);
const namNay = (today: string) => Number(today.slice(0, 4));
const namHopLe = (nam: string, today: string) => /^\d{4}$/.test(nam) && Number(nam) >= namNay(today) - TUOI_TOI_DA && Number(nam) <= namNay(today);
/** Dòng bỏ trống hoàn toàn (tên, năm) — không gửi, không báo lỗi. */
export const dongRong = (r: DongKhach): boolean => r.ten.trim() === "" && r.nam === "";
/** Dòng "đã có tên" (đếm vào "N/M khách đã có tên"): có tên và năm sinh hợp lệ. */
export const dongDu = (r: DongKhach, today: string): boolean => r.ten.trim() !== "" && namHopLe(r.nam, today);

/**
 * Lỗi của MỘT dòng (số thứ tự `so`), chữ của bản vẽ. "năm sinh là bắt buộc" chỉ sau lần bấm Lưu đầu (`daLuu`); năm sinh sai (đủ 4 số, hoặc sau khi bấm Lưu)
 * và thiếu họ tên khi đã có năm thì báo ngay. Trả `o` = ô bị lỗi (để tô đỏ đúng ô).
 */
export function loiDong(r: DongKhach, so: number, today: string, daLuu: boolean): { cau: string; o: "ten" | "nam" } | null {
  const ten = r.ten.trim();
  if (dongRong(r)) return null;
  if (ten !== "" && r.nam === "") return daLuu ? { cau: `Dòng ${so}: năm sinh là bắt buộc.`, o: "nam" } : null;
  if (r.nam !== "" && (r.nam.length === 4 || daLuu) && !namHopLe(r.nam, today)) {
    return { cau: `Dòng ${so}: năm sinh phải từ ${namNay(today) - TUOI_TOI_DA} đến ${namNay(today)}.`, o: "nam" };
  }
  if (ten === "" && r.nam !== "") return { cau: `Dòng ${so}: họ tên là bắt buộc.`, o: "ten" };
  return null;
}

export function loiDanhSachKhach(rows: readonly DongKhach[], today: string): string[] {
  return rows.flatMap((r, i) => {
    const e = loiDong(r, i + 1, today, true);
    return e ? [e.cau] : [];
  });
}

/** Dòng đếm + hai câu nhắc (vàng, không chặn). `soKhach` = mẫu số (số khách dịch vụ đông nhất — `soKhachDoan`). */
export function tomTatKhach(rows: readonly DongKhach[], soKhach: number, today: string): { dem: string; thieu: string | null; qua: string | null } {
  const coDong = rows.filter((r) => !dongRong(r));
  const du = rows.filter((r) => dongDu(r, today)).length;
  const thieu = soKhach - du;
  return {
    dem: `${du}/${soKhach}`,
    thieu: coDong.length > 0 && coDong.length <= soKhach && thieu > 0 ? `Còn ${thieu} khách chưa có tên — cần đủ trước khi xe chạy` : null,
    qua: coDong.length > soKhach ? `Danh sách có ${coDong.length} người, đơn có ${soKhach} khách` : null,
  };
}

const sangInput = (r: DongKhach): PassengerInput => ({ fullName: r.ten.trim(), birthYear: Number(r.nam), paxCode: r.loai === "" ? null : r.loai });

/** Thân `passengers` của lập / sửa NHÁP: mọi dòng không rỗng (giữ `id` dòng đã lưu). */
export const passengersNhap = (rows: readonly DongKhach[]): PassengerInput[] =>
  rows.filter((r) => !dongRong(r)).map((r) => ({ ...(r.rowId ? { id: r.rowId } : {}), ...sangInput(r) }));

/** Thân `POST /passengers` (đơn ĐÃ XÁC NHẬN): thêm dòng mới; sửa người có đổi tên / năm / loại; huỷ theo khoá người. */
export function thayDoiXacNhan(rows: readonly DongKhach[], huy: readonly string[], expectedUpdatedAt: string): PassengerChangeInput {
  const them: PassengerInput[] = [];
  const sua: PassengerChangeInput["sua"] = [];
  for (const r of rows) {
    if (r.personKey && huy.includes(r.personKey)) continue;
    if (!r.personKey) {
      if (!dongRong(r)) them.push(sangInput(r));
      continue;
    }
    const g = r.goc!;
    const i = sangInput(r);
    if (i.fullName !== g.fullName || i.birthYear !== g.birthYear || i.paxCode !== g.paxCode) sua.push({ personKey: r.personKey, ...i });
  }
  return { expectedUpdatedAt, them, sua, huy: [...huy] };
}

/** Câu hỏi huỷ người (bảng sửa sau xác nhận). */
export const cauHuyNguoi = (r: DongKhach, so: number): string => `Huỷ ${r.ten.trim() || `khách ${so}`} khỏi danh sách? (dùng khi nhập nhầm)`;
