// Gọi OpenAI Responses API + đường ống trả lời DÙNG CHUNG cho câu hỏi thật (POST /api/tro-ly/hoi) và ô thử (POST /api/tro-ly/thu — ADR-0073 Đ5 "chạy đúng
// đường ống thật"): gọi → tách nguồn (danh sách trắng, Đ6) → ẩn số tiền (Đ7a, Hiến chương 5.15). Không SQL (module nghiêm: SQL chỉ ở repository.ts).
// KHÔNG BAO GIỜ ghi nội dung ra console; chữ lỗi của OpenAI không đọc (có thể lặp lại khoá) — chỉ mã đã lọc (maLoiOpenAi).
import { HET_GIO_MS, docPhanHoi, maLoiOpenAi, tachNguon, type DoanTriThuc, type SuDung } from "../../shared/tro-ly";
import { anSoTien } from "../../shared/tro-ly-loc-tien";

const OPENAI_MAC_DINH = "https://api.openai.com";

export type KetQuaGoi =
  | { chu: string; suDung: SuDung | null }
  | { loi: string; suDung: SuDung | null; status: number | null; maLoi: string | null };

export async function goiOpenAi(env: Env, khoa: string, than: Record<string, unknown>): Promise<KetQuaGoi> {
  const goc = (env.OPENAI_BASE_URL?.trim() || OPENAI_MAC_DINH).replace(/\/+$/, "");
  const ctl = new AbortController();
  const hen = setTimeout(() => ctl.abort(), HET_GIO_MS);
  try {
    const res = await fetch(`${goc}/v1/responses`, {
      method: "POST",
      headers: { authorization: `Bearer ${khoa}`, "content-type": "application/json" },
      body: JSON.stringify(than),
      signal: ctl.signal,
    });
    const data: unknown = await res.json().catch(() => null);
    const doc = docPhanHoi(data);
    if (!res.ok) return { loi: `http_${res.status}`, suDung: doc.suDung, status: res.status, maLoi: maLoiOpenAi(data) };
    if (!doc.chu) return { loi: "rong", suDung: doc.suDung, status: res.status, maLoi: null };
    return doc;
  } catch (e) {
    return { loi: ctl.signal.aborted ? "het_gio" : e instanceof Error ? `mang_${e.name}` : "mang", suDung: null, status: null, maLoi: null };
  } finally {
    clearTimeout(hen);
  }
}

export type KetQuaTraLoi =
  | { ok: true; traLoi: string; nguon: string[]; suDung: SuDung | null }
  | { ok: false; loi: string; suDung: SuDung | null; status: number | null; maLoi: string | null };

/** Gọi mẫu rồi làm sạch câu trả lời: tách nguồn theo các đoạn ĐÃ GỬI, ẩn số tiền. Câu trả lời này là thứ DUY NHẤT được trả và được lưu. */
export async function traLoiMotCau(env: Env, khoa: string, than: Record<string, unknown>, doan: readonly DoanTriThuc[]): Promise<KetQuaTraLoi> {
  const kq = await goiOpenAi(env, khoa, than);
  if ("loi" in kq) return { ok: false, loi: kq.loi, suDung: kq.suDung, status: kq.status, maLoi: kq.maLoi };
  const ra = tachNguon(kq.chu, doan);
  return { ok: true, traLoi: anSoTien(ra.traLoi), nguon: ra.nguon, suDung: kq.suDung };
}
