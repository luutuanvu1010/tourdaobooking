// Luật THUẦN của lựa chọn đón và khung giờ đón (ADR-0134) — một nguồn cho máy chủ (orders) và giao diện (form Tạo đơn). Không I/O, không import module.
// Import kèm đuôi .ts (chạy trực tiếp bằng `node --test`). Test cạnh tệp: khung-gio-don.test.ts.
//
// Đ1: mỗi dịch vụ chọn "Đón" (`DON`) hoặc "Không đón" (`KHONG_DON`); NULL = chưa chọn / đơn cũ. Đ3–Đ4: chọn khung ⇒ giờ đón (`pickup_time`) = giờ ĐẦU khung
// (giờ hẹn), `pickup_slot_end` = giờ CUỐI khung (giá trị chụp). Đ5: MỘT bộ khung dùng chung (bảng `ord_pickup_slot_policy`), 1–12 khung, sắp tăng, không chồng.
import { isHHMM } from "./vn-date.ts";

/** Lựa chọn đón của một dịch vụ (mã lưu ở `order_service.pickup_choice`; không bao giờ hiện mã ra người dùng — nhãn ở `NHAN_LUA_CHON_DON`). */
export type LuaChonDon = "DON" | "KHONG_DON";
export const NHAN_LUA_CHON_DON: Record<LuaChonDon, string> = { DON: "Đón", KHONG_DON: "Không đón" };
export const laLuaChonDon = (v: unknown): v is LuaChonDon => v === "DON" || v === "KHONG_DON";

/** Một khung giờ đón, giờ 24h "HH:MM". */
export interface KhungGio {
  tu: string;
  den: string;
}

export const MAX_KHUNG = 12;
export const MAX_CAU_LUU_Y = 200;
/** Năm khung gieo ở migration (ADR-0134 Bối cảnh) — giao diện dùng khi chưa đọc được chính sách (mất mạng). */
export const KHUNG_MAC_DINH: readonly KhungGio[] = [
  { tu: "07:30", den: "08:00" }, { tu: "08:00", den: "08:30" }, { tu: "08:30", den: "09:00" }, { tu: "09:00", den: "09:30" }, { tu: "09:30", den: "10:00" },
];
export const CAU_LUU_Y_MAC_DINH = "Giờ đón thực tế có thể điều chỉnh cho phù hợp tình hình hoạt động.";

/** Nhãn 24 giờ của khung: "07:30–08:00" (gạch nối dài). */
export const nhanKhung = (k: KhungGio): string => `${k.tu}–${k.den}`;

/** Kiểm danh sách khung (thân `POST /api/cai-dat/khung-gio-don`, và dòng đọc từ CSDL): 1–12 khung, HH:MM, giờ bắt đầu < giờ kết thúc, sắp tăng, không chồng nhau. */
export function kiemDanhSachKhung(raw: unknown): { ok: true; khung: KhungGio[] } | { ok: false; loi: string } {
  if (!Array.isArray(raw)) return { ok: false, loi: "Danh sách khung giờ không hợp lệ." };
  if (raw.length === 0) return { ok: false, loi: "Cần ít nhất một khung giờ đón." };
  if (raw.length > MAX_KHUNG) return { ok: false, loi: `Chỉ đặt được tối đa ${MAX_KHUNG} khung giờ đón.` };
  const khung: KhungGio[] = [];
  for (const [i, k] of raw.entries()) {
    const so = `Khung thứ ${i + 1}`;
    if (!k || typeof k !== "object" || Array.isArray(k)) return { ok: false, loi: `${so} không hợp lệ.` };
    const { tu, den } = k as Record<string, unknown>;
    if (typeof tu !== "string" || typeof den !== "string" || !isHHMM(tu) || !isHHMM(den)) {
      return { ok: false, loi: `${so}: giờ phải theo dạng HH:MM (24 giờ), ví dụ 07:30.` };
    }
    if (tu >= den) return { ok: false, loi: `${so}: giờ bắt đầu phải trước giờ kết thúc.` };
    const truoc = khung[khung.length - 1];
    if (truoc) {
      if (tu < truoc.tu) return { ok: false, loi: `${so}: các khung phải xếp theo giờ tăng dần.` };
      if (tu < truoc.den) return { ok: false, loi: `${so} chồng lên khung ${nhanKhung(truoc)}.` };
    }
    khung.push({ tu, den });
  }
  return { ok: true, khung };
}

/** Kiểm câu lưu ý: chữ, 1–200 ký tự sau khi bỏ khoảng trắng hai đầu. */
export function kiemCauLuuY(raw: unknown): { ok: true; cau: string } | { ok: false; loi: string } {
  if (typeof raw !== "string") return { ok: false, loi: "Câu lưu ý không hợp lệ." };
  const cau = raw.trim();
  if (cau.length === 0) return { ok: false, loi: "Cần câu lưu ý (hiện dưới hàng khung giờ)." };
  if (cau.length > MAX_CAU_LUU_Y) return { ok: false, loi: `Câu lưu ý tối đa ${MAX_CAU_LUU_Y} ký tự.` };
  return { ok: true, cau };
}
