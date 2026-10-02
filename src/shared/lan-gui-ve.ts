// LỚP CHỐNG GHI TRÙNG (ADR-0094 đ5; đặc tả §3.2) — VÒNG ĐỜI VÉ Ở MÁY KHÁCH, thuần (kho lưu, đồng hồ, bộ sinh vé tiêm vào). `web/api.ts` chỉ gọi mô-đun này.
//  - `moVe`: dùng lại vé đang mở cho cùng "dấu" (mã băm SHA-256 của ĐÚNG chuỗi sẽ gửi: phương thức + đường dẫn + thân JSON), hoặc sinh vé mới và GHI TRƯỚC
//    khi gửi. Bấm đúp (vé còn mở) ⇒ cùng vé.
//  - `ketThuc`: ĐÓNG vé khi máy chủ trả lời rõ (mọi 2xx — kể cả "đã ghi"; mọi 4xx trừ 409 `dang_xu_ly`); GIỮ vé khi không rõ (mất mạng, hết giờ, 5xx,
//    409 `dang_xu_ly`) ⇒ lần bấm lại cùng nội dung mang CÙNG vé. Hai lần ghi thật giống hệt nhau nối tiếp ⇒ lần 1 đóng vé ⇒ lần 2 vé mới (H4/T4).
//  - Nơi giữ: localStorage `lg:<staffId>`, mỗi mục {dấu → vé, mốc}, hạn 24 giờ, tối đa 50 mục (cũ nhất bị đẩy). Mục chỉ có mã băm + vé, không thân.
//    Chưa biết người đăng nhập, route có thân chứa bí mật (src/shared/lan-gui-bi-mat.ts), hay kho lỗi ⇒ chỉ bộ nhớ của trang.
//  - Không xoá vé khi bị đá về đăng nhập (phạm vi vé ở máy chủ là TÀI KHOẢN — đặc tả §3.2 mục 7).
import { laRouteBiMat, laRouteKhongVe } from "./lan-gui-bi-mat.ts";

export const HAN_VE_MS = 24 * 3600 * 1000;
export const TOI_DA_MUC = 50;
const PHUONG_THUC_GHI = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Phần của `Storage` mà mô-đun dùng (localStorage thật hoặc giả). */
export interface KhoLuu {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}
export interface VeMo {
  ve: string;
  /** khoá nội bộ (người + dấu) — chỉ để `ketThuc` tìm lại */
  readonly khoa: string;
  readonly nguoi: string | null;
  readonly dau: string;
  readonly luuKho: boolean;
}
/** Kết quả một lần gửi: phản hồi HTTP (kèm mã lỗi máy nếu có) hoặc mất mạng / hết giờ. */
export type KetQuaGui = { status: number; code?: string } | { matMang: true };

type Muc = { v: string; t: number };

const sha256Hex = async (s: string): Promise<string> =>
  [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))].map((b) => b.toString(16).padStart(2, "0")).join("");

/** Có ĐÓNG vé sau kết quả này không (đặc tả §3.2 mục 2–4). */
export function nenDongVe(kq: KetQuaGui): boolean {
  if ("matMang" in kq) return false;
  if (kq.status >= 200 && kq.status < 300) return true;
  if (kq.status >= 400 && kq.status < 500) return !(kq.status === 409 && kq.code === "dang_xu_ly");
  return false;
}

export function taoVongDoiVe(o: { kho: () => KhoLuu | null; dongHo: () => number; sinhVe: () => string; bam?: (s: string) => Promise<string> }) {
  const bam = o.bam ?? sha256Hex;
  const boNho = new Map<string, Muc>(); // khoá `${người}|${dấu}`
  let nguoi: string | null = null;

  const khoaKho = (id: string) => `lg:${id}`;
  function docKho(id: string): Record<string, Muc> {
    try {
      const raw = o.kho()?.getItem(khoaKho(id));
      const x = raw ? (JSON.parse(raw) as unknown) : null;
      return x && typeof x === "object" && !Array.isArray(x) ? (x as Record<string, Muc>) : {};
    } catch {
      return {};
    }
  }
  function ghiKho(id: string, muc: Record<string, Muc>): void {
    try {
      const kho = o.kho();
      if (!kho) return;
      const conHan = Object.entries(muc)
        .filter(([, m]) => m && typeof m.v === "string" && typeof m.t === "number" && o.dongHo() - m.t < HAN_VE_MS)
        .sort((a, b) => b[1].t - a[1].t)
        .slice(0, TOI_DA_MUC);
      if (conHan.length === 0) kho.removeItem(khoaKho(id));
      else kho.setItem(khoaKho(id), JSON.stringify(Object.fromEntries(conHan)));
    } catch {
      // kho bị chặn / đầy: bộ nhớ trang vẫn giữ vé
    }
  }
  const conHan = (m: Muc | undefined): m is Muc => !!m && o.dongHo() - m.t < HAN_VE_MS;

  return {
    /** Người đang đăng nhập (sau `/api/auth/me`); null = chưa biết ⇒ chỉ bộ nhớ trang. */
    datNguoi(id: string | null): void {
      nguoi = id;
    },
    /** Vé cho một lần gửi, hoặc null (phương thức đọc, route công khai). Ghi vé TRƯỚC khi trả (trước khi gửi). */
    async moVe(method: string, duongDan: string, than: string): Promise<VeMo | null> {
      const m = method.toUpperCase();
      if (!PHUONG_THUC_GHI.has(m) || laRouteKhongVe(m, duongDan)) return null;
      const dau = await bam(`${m}\n${duongDan}\n${than}`);
      const ai = nguoi;
      const luuKho = ai !== null && !laRouteBiMat(m, duongDan);
      const khoa = `${ai ?? ""}|${dau}`;
      let muc = boNho.get(khoa);
      if (!conHan(muc) && luuKho) {
        const k = docKho(ai)[dau];
        if (conHan(k)) muc = k;
      }
      if (!conHan(muc)) muc = { v: o.sinhVe(), t: o.dongHo() };
      boNho.set(khoa, muc);
      if (luuKho) ghiKho(ai, { ...docKho(ai), [dau]: muc });
      return { ve: muc.v, khoa, nguoi: ai, dau, luuKho };
    },
    /** Sau khi có kết quả: đóng vé khi máy chủ trả lời rõ, giữ khi không rõ. */
    ketThuc(mo: VeMo | null, kq: KetQuaGui): void {
      if (!mo || !nenDongVe(kq)) return;
      boNho.delete(mo.khoa);
      if (mo.luuKho && mo.nguoi !== null) {
        const tat = docKho(mo.nguoi);
        if (tat[mo.dau]?.v === mo.ve) {
          delete tat[mo.dau];
          ghiKho(mo.nguoi, tat);
        }
      }
    },
  };
}
