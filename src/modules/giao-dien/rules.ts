// Luật thuần của module giao-dien: dòng chi tiết nhật ký `giao_dien_changed` (ADR-0087 điều 6). Không D1, không import module khác.
import { NUM } from "../../shared/giao-dien.ts";
import { PERMISSION_CODES } from "../../shared/permissions.ts";
import { MAN_UI, laCheDoHopLe, timMuc, type DongChinhSach } from "../../shared/ui-truong.ts";

const NHAN = new Map(NUM.map((n) => [n.khoa, n.nhan] as const));

/** Chi tiết nhật ký: "Nền thanh trên: #ffffff → #0c4a6e; Phông nội dung: mặc định → nunito". Chỉ khoá + giá trị (không dữ liệu cá nhân). */
export function chiTietDoi(cu: Readonly<Record<string, string>>, moi: Readonly<Record<string, string>>): string {
  const khoa = [...new Set([...Object.keys(cu), ...Object.keys(moi)])].filter((k) => cu[k] !== moi[k]).sort();
  if (khoa.length === 0) return "Không đổi";
  return khoa.map((k) => `${NHAN.get(k) ?? k}: ${cu[k] ?? "mặc định"} → ${moi[k] ?? "mặc định"}`).join("; ");
}

// ---- Chính sách hiện / ẩn / bắt buộc (ADR-0194 đợt 1) ----------------------------------------------------------------------------------------------------

export interface DongGhi { truong: string; quyen: string; cheDo: string }

/**
 * Kiểm thân `POST /api/cai-dat/giao-dien`: màn trong danh mục, mỗi dòng có trường TRONG danh mục, quyền là mã quyền thật, chế độ mà cờ của mục cho phép; không lặp ô; không rỗng.
 * Cả lô hợp lệ mới trả `ok` (một dòng xấu ⇒ không ghi gì). Câu lỗi tiếng Việt, không lộ mã thô ngoài tên trường người dùng vừa gửi.
 */
export function kiemYeuCauChinhSach(body: unknown): { ok: true; man: string; dong: DongGhi[] } | { ok: false; message: string } {
  if (!body || typeof body !== "object") return { ok: false, message: "Thân yêu cầu không hợp lệ." };
  const { man, thayDoi } = body as { man?: unknown; thayDoi?: unknown };
  if (typeof man !== "string" || !(MAN_UI as readonly string[]).includes(man)) return { ok: false, message: "Màn hình không có trong danh mục chỉnh được." };
  if (!Array.isArray(thayDoi) || thayDoi.length === 0) return { ok: false, message: "Chưa có thay đổi nào để lưu." };
  if (thayDoi.length > 200) return { ok: false, message: "Quá nhiều thay đổi trong một lần lưu." };
  const thay = new Set<string>();
  const dong: DongGhi[] = [];
  for (const d of thayDoi) {
    if (!d || typeof d !== "object") return { ok: false, message: "Có dòng thay đổi không hợp lệ." };
    const { truong, quyen, cheDo } = d as Record<string, unknown>;
    if (typeof truong !== "string" || typeof quyen !== "string" || typeof cheDo !== "string") return { ok: false, message: "Có dòng thay đổi thiếu thông tin." };
    if (!timMuc(man, truong)) return { ok: false, message: `Trường «${truong.slice(0, 40)}» không nằm trong danh mục được chỉnh.` };
    if (!(PERMISSION_CODES as readonly string[]).includes(quyen)) return { ok: false, message: "Nhóm quyền không hợp lệ." };
    if (!laCheDoHopLe(man, truong, cheDo)) return { ok: false, message: `Trường «${truong.slice(0, 40)}» không cho chọn chế độ này.` };
    const k = `${truong}/${quyen}`;
    if (thay.has(k)) return { ok: false, message: "Một ô bị chọn hai lần trong cùng lần lưu." };
    thay.add(k);
    dong.push({ truong, quyen, cheDo });
  }
  return { ok: true, man, dong };
}

/** Dòng chi tiết nhật ký `ui_policy_changed`: chỉ mã màn, mã trường, quyền, chế độ — «tao-don: passengers/SALES → AN; …». Không dữ liệu cá nhân. */
export const chiTietChinhSach = (man: string, dong: readonly DongGhi[]): string => `${man}: ${dong.map((d) => `${d.truong}/${d.quyen} → ${d.cheDo}`).join("; ")}`;

/** Chỉ giữ dòng ĐÚNG danh mục + quyền thật + chế độ cờ cho phép, và bỏ chế độ HIEN (mặc định) — thứ giao diện và luật giải dùng. */
export const dongHopLe = (ds: readonly DongChinhSach[]): DongChinhSach[] =>
  ds.filter((d) => d.cheDo !== "HIEN" && (PERMISSION_CODES as readonly string[]).includes(d.quyen) && laCheDoHopLe(d.man, d.truong, d.cheDo));
