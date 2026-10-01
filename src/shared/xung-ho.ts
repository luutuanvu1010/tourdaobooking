// Xưng hô của trợ lý "Mai" (ADR-0084, accepted 2026-10-01) — luật THUẦN, MỘT nơi cho máy chủ (lời nhắc, API khung chat, kiểm thân sửa hồ sơ) và giao diện
// (thay {ten} trong câu chào). Không import gì: tệp nạp ở mọi trang (web/tro-ly.ts) nên phải nhẹ.
// Đ2: NAM → "anh {tên}" / "em"; NU → "chị {tên}" / "em"; chưa ghi / giá trị lạ / thiếu tên → "bạn" / "mình". Tên gọi = pty_person.given_name (KHÔNG họ, KHÔNG
// tên đệm — Đ4). Không đoán giới tính theo tên (ADR-0084 phương án 2 đã loại).

/** Giá trị giới tính được lưu ở `pty_person.gender` (danh sách mở kiểm ở mã — Hiến chương: không CHECK liệt kê). NULL = chưa ghi. */
export const GIOI_TINH = ["NAM", "NU"] as const;
export type GioiTinh = (typeof GIOI_TINH)[number];
/** Nhãn tiếng Việt cho giao diện. */
export const GIOI_TINH_NHAN: Record<GioiTinh, string> = { NAM: "Nam", NU: "Nữ" };

export interface XungHo { readonly goi: string; readonly xung: string }

const KY_TU_LA = new RegExp("[\\u0000-\\u001f\\u007f\\u2028\\u2029\\u200e\\u200f\\u202a-\\u202e\\u2066-\\u2069]", "g");
/** Tên gọi sạch: bỏ ký tự điều khiển / đảo chiều, gộp khoảng trắng (kể cả xuống dòng), cắt hai đầu — luôn MỘT dòng. */
const tenSach = (ten: string | null | undefined): string => (typeof ten === "string" ? ten.replace(KY_TU_LA, " ").replace(/\s+/g, " ").trim() : "");

/** ADR-0084 Đ2. */
export function xungHo(tenGoi: string | null | undefined, gioiTinh: string | null | undefined): XungHo {
  const ten = tenSach(tenGoi);
  if (ten && gioiTinh === "NAM") return { goi: `anh ${ten}`, xung: "em" };
  if (ten && gioiTinh === "NU") return { goi: `chị ${ten}`, xung: "em" };
  return { goi: "bạn", xung: "mình" };
}

/** ADR-0084 Đ3: dòng MÁY CHỦ nối sau lời nhắc của bộ não (Toàn quyền không sửa được). Một dòng. */
export const dongMai = (x: XungHo): string => `Tên bạn là Mai, trợ lý của Tour Đảo. Người đang hỏi: gọi là '${x.goi}', xưng '${x.xung}'.`;

/**
 * ADR-0084 Đ5 + Đ2: câu chào mặc định (chỗ thay `{ten}` = cách gọi, `{xung}` = cách xưng). Phán quyết điều phối 2026-10-01 (sau kiểm độc lập TB-2): văn bản
 * Đ5 ("… em là Mai …") mâu thuẫn Đ2 ("bạn" thì xưng "mình") — chủ đã chốt cặp "bạn / mình", nên câu chào xưng theo `{xung}`.
 */
export const CAU_CHAO_MAC_DINH = "Chào {ten}, {xung} là Mai — trợ lý của Tour Đảo. {ten} cần hỏi gì về cách dùng app cứ hỏi {xung} nhé!";

const hoaDau = (s: string): string => (s ? s.charAt(0).toLocaleUpperCase("vi") + s.slice(1) : s);
/**
 * ADR-0084 Đ5: thay MỌI `{ten}` bằng cách gọi và MỌI `{xung}` bằng cách xưng. Chỗ thay đứng đầu câu (đầu chuỗi hoặc sau . ! ? … và khoảng trắng) ⇒ viết hoa
 * chữ đầu ("Anh Vũ cần…", "Mình là…") — giả định bề mặt, đảo ngược được. Câu không có chỗ thay giữ nguyên văn.
 */
export function thayTen(cauChao: string, x: XungHo): string {
  return cauChao.replace(/\{(ten|xung)\}/g, (_m, k: string, i: number, s: string) => {
    const v = k === "ten" ? x.goi : x.xung;
    return /(^|[.!?…]\s+)$/.test(s.slice(0, i)) ? hoaDau(v) : v;
  });
}

/** Giá trị đọc từ CSDL → giới tính hợp lệ hoặc NULL (giá trị lạ — chỉ có thể lọt bằng SQL tay — coi như chưa ghi). */
export const gioiTinhHopLe = (v: unknown): GioiTinh | null => (typeof v === "string" && (GIOI_TINH as readonly string[]).includes(v) ? (v as GioiTinh) : null);

type Kiem<T> = { ok: true; value: T } | { ok: false; message: string };
/** Ô giới tính trong thân sửa / tạo hồ sơ người: vắng (`undefined`) = giữ nguyên; `null` / `""` = xoá (chưa ghi); NAM / NU; còn lại ⇒ lỗi lời thường. */
export function kiemGioiTinh(v: unknown): Kiem<GioiTinh | null | undefined> {
  if (v === undefined) return { ok: true, value: undefined };
  if (v === null || v === "") return { ok: true, value: null };
  if (typeof v === "string" && (GIOI_TINH as readonly string[]).includes(v)) return { ok: true, value: v as GioiTinh };
  return { ok: false, message: "Giới tính chỉ nhận Nam, Nữ hoặc để trống." };
}
