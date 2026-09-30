// Module tro-ly — trợ lý AI "Hỗ trợ" trả lời cách dùng app (ADR-0066, accepted 2026-09-30). Sở hữu bảng tl_luot_hoi, tl_cai_dat (migration 0050).
// Không import module nào (ALLOWED_EDGES rỗng). AI KHÔNG ghi gì vào dữ liệu nghiệp vụ, không đọc đơn / khách / tiền (Hiến chương 5.11, 5.15): chỉ đọc kho tri
// thức thuần (src/shared/tro-ly.ts) và ghi MỘT dòng đếm (không nội dung) cho mỗi câu hỏi.
// KHÔNG BAO GIỜ ghi nội dung câu hỏi / câu trả lời ra console hay nhật ký — dòng log lỗi chỉ có MÃ lý do (bài tro-ly-route.test.ts + run.mjs của e2e canh).
// Không ghi audit_log khi đổi cài đặt: tl_cai_dat là bảng chỉ thêm, mỗi bản mang created_by / created_at — dấu vết trên chính bảng (Hiến chương 5.5).
import type { TroLyCaiDatResponse, TroLyHoiResponse } from "../../shared/contracts";
import { error, json, readJson } from "../../shared/http";
import { can } from "../../shared/permissions";
import { route, type AppModule } from "../../shared/router";
import {
  CAU_CHUA_BAT, CAU_CHUA_CO, CAU_HET_TRAN_THANG, CAU_LOI, HET_GIO_MS, cauHetTranNgay, cheCauHoi, chiPhiMicroUsd, chonDoan, docPhanHoi, khoangThang, kiemCaiDat,
  quyetDinhTran, tachNguon, thanYeuCau, type SuDung,
} from "../../shared/tro-ly";
import { vnToday } from "../../shared/vn-date";
import { demCauHomNay, docCaiDat, ghiLuot, themCaiDat, tongThang, type LuotHoi } from "./repository";

const OPENAI_MAC_DINH = "https://api.openai.com";

/** Khoá OpenAI đang đặt (secret `OPENAI_API_KEY`); rỗng / chỉ khoảng trắng = chưa có. */
const khoaCua = (env: Env): string | null => env.OPENAI_API_KEY?.trim() || null;

/** Chỉ MÃ lý do — không nội dung, không thân phản hồi của OpenAI. */
const logLoi = (lyDo: string): void => console.error(JSON.stringify({ event: "tro_ly_loi", ly_do: lyDo }));

type KetQuaGoi = { chu: string; suDung: SuDung | null } | { loi: string; suDung: SuDung | null };

async function goiOpenAi(env: Env, khoa: string, than: Record<string, unknown>): Promise<KetQuaGoi> {
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
    if (!res.ok) return { loi: `http_${res.status}`, suDung: doc.suDung };
    if (!doc.chu) return { loi: "rong", suDung: doc.suDung };
    return doc;
  } catch (e) {
    return { loi: ctl.signal.aborted ? "het_gio" : e instanceof Error ? `mang_${e.name}` : "mang", suDung: null };
  } finally {
    clearTimeout(hen);
  }
}

async function trangThaiCaiDat(env: Env): Promise<TroLyCaiDatResponse> {
  const ngay = vnToday(new Date());
  const { tu, den } = khoangThang(ngay);
  const [c, t] = await Promise.all([docCaiDat(env.DB), tongThang(env.DB, tu, den)]);
  return {
    bat: c.bat,
    tranThangUsd: c.tranThangMicroUsd / 1_000_000,
    tranNgay: c.tranNgay,
    coKhoa: khoaCua(env) !== null,
    thang: ngay.slice(0, 7),
    chiPhiThangUsd: t.tong / 1_000_000,
    soCauThang: t.so,
  };
}

export const troLyModule: AppModule = {
  name: "tro-ly",
  routes: [
    // ADR-0066 điều 1: mọi tài khoản đăng nhập (cổng staff) + ô assistant.ask (any cho cả 9 mã quyền).
    route("POST", "/api/tro-ly/hoi", "staff", async ({ env, request, staff }) => {
      if (!can(staff, "assistant.ask")) return error(403, "forbidden", "Tài khoản này chưa dùng được trợ lý.");
      const body = await readJson(request);
      const raw = body?.cauHoi;
      if (typeof raw !== "string" || !raw.trim()) return error(400, "invalid_input", "Gõ câu hỏi trước khi gửi.");
      const db = env.DB;
      const caiDat = await docCaiDat(db);
      const khoa = khoaCua(env);
      // ADR-0066 điều 8: tắt hoặc thiếu khoá → 503 (mã riêng — KHÔNG phải `maintenance`, mã đó bật màn bảo trì toàn trang ở web/api.ts).
      if (!caiDat.bat || !khoa) return error(503, "tro_ly_chua_bat", CAU_CHUA_BAT);

      const now = new Date();
      const at = now.toISOString();
      const ngayVn = vnToday(now);
      const { tu, den } = khoangThang(ngayVn);
      const [soCauHomNay, thang] = await Promise.all([demCauHomNay(db, staff.id, ngayVn), tongThang(db, tu, den)]);
      const luot = (ketQua: LuotHoi["ketQua"], u: SuDung | null): LuotHoi => ({
        id: crypto.randomUUID(), staffId: staff.id, ngayVn, vao: u?.vao ?? 0, vaoDem: u?.vaoDem ?? 0, ra: u?.ra ?? 0, chiPhi: chiPhiMicroUsd(u), ketQua, at,
      });
      // ADR-0066 điều 6: trần kiểm TRƯỚC khi dựng lời nhắc / gọi mạng. Kiểm-rồi-ghi không nguyên tử: vài câu gửi cùng lúc có thể vượt trần một chút
      // (mỗi câu ~0,001 USD) — chấp nhận, ghi ở đặc tả; lớp hai là giới hạn ngân sách ở bảng điều khiển OpenAI.
      const qd = quyetDinhTran(caiDat, { soCauHomNay, chiPhiThang: thang.tong });
      if (qd === "het_tran_thang" || qd === "het_tran_ngay") {
        await ghiLuot(db, luot("het_tran", null));
        return qd === "het_tran_thang"
          ? error(429, "tro_ly_het_tran_thang", CAU_HET_TRAN_THANG)
          : error(429, "tro_ly_het_tran_ngay", cauHetTranNgay(caiDat.tranNgay));
      }

      // ADR-0066 điều 5: che + cắt TRÊN MÁY CHỦ trước khi rời Worker; chỉ gửi tên nhóm vai (trong lời nhắc), không tên / SĐT / id người hỏi.
      const cauHoi = cheCauHoi(raw);
      if (!cauHoi) return error(400, "invalid_input", "Gõ câu hỏi trước khi gửi.");
      const doan = chonDoan(cauHoi, staff.permissions);
      if (!doan.length) {
        await ghiLuot(db, luot("ok", null));
        return json({ traLoi: CAU_CHUA_CO, nguon: [] } satisfies TroLyHoiResponse);
      }
      const kq = await goiOpenAi(env, khoa, thanYeuCau(staff.permissions, doan, cauHoi));
      if ("loi" in kq) {
        logLoi(kq.loi);
        await ghiLuot(db, luot("loi", kq.suDung));
        return error(502, "tro_ly_loi", CAU_LOI);
      }
      await ghiLuot(db, luot("ok", kq.suDung));
      return json(tachNguon(kq.chu, doan) satisfies TroLyHoiResponse);
    }),

    // ADR-0066 điều 7, 10 + trang ghép: cài đặt chỉ Toàn quyền (ô settings.ops), cổng office. Xem bật / tắt, trần, chi phí tháng này.
    route("GET", "/api/tro-ly/cai-dat", "office", async ({ env, staff }) => {
      if (!can(staff, "settings.ops")) return error(403, "forbidden", "Chỉ Toàn quyền xem được cài đặt trợ lý.");
      return json(await trangThaiCaiDat(env) satisfies TroLyCaiDatResponse);
    }),

    route("POST", "/api/tro-ly/cai-dat", "office", async ({ env, request, staff }) => {
      if (!can(staff, "settings.ops")) return error(403, "forbidden", "Chỉ Toàn quyền đổi được cài đặt trợ lý.");
      const input = kiemCaiDat(await readJson(request));
      if (!input.ok) return error(400, "invalid_input", input.message);
      await themCaiDat(env.DB, input.value, new Date().toISOString(), staff.id);
      return json(await trangThaiCaiDat(env) satisfies TroLyCaiDatResponse);
    }),
  ],
};
