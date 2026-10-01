// Module tro-ly — trợ lý AI "Hỗ trợ" trả lời cách dùng app (ADR-0066, accepted 2026-09-30) + bảng điều khiển của Toàn quyền (ADR-0069, accepted 2026-09-30).
// Sở hữu bảng tl_luot_hoi, tl_cai_dat (migration 0050), tl_vai, tl_loi_dan, tl_ngu_canh, tl_hoi_dap (migration 0054).
// Phụ thuộc: `audit` (ghi `tro_ly_settings_changed` cùng lô với bản cài đặt mới — không nội dung, Hiến chương 5.12) và `staff` (CHỈ ở tầng SQL: tên người
// qua view công bố v_stf_staff_label). AI KHÔNG ghi gì vào dữ liệu nghiệp vụ, không đọc đơn / khách / tiền (Hiến chương 5.11, 5.15): chỉ đọc kho tri thức thuần
// (src/shared/tro-ly.ts) + đoạn ngữ cảnh Toàn quyền đặt, và ghi cho mỗi câu MỘT dòng đếm (tl_luot_hoi, không nội dung) + MỘT dòng lịch sử (tl_hoi_dap: câu hỏi
// ĐÃ CHE — đúng chuỗi đã gửi OpenAI, câu trả lời, nguồn) trong CÙNG một lô. Lịch sử chỉ Toàn quyền đọc (ô settings.ops).
// KHÔNG BAO GIỜ ghi nội dung câu hỏi / câu trả lời ra console hay nhật ký kiểm toán — dòng log lỗi chỉ có MÃ lý do (bài tro-ly-route.test.ts + run.mjs của e2e canh).
// Khoá OpenAI chỉ qua secret; route quản lý chỉ trả tối đa 4 ký tự cuối (`khoaCuoi`); "Thử key" không chuyển tiếp chữ lỗi của OpenAI (có thể lặp lại khoá).
// ADR-0073: bộ não tuỳ biến (tl_bo_nao), ô thử, nhớ 3 lượt, lọc số tiền + kiểm trần trước khi gọi. Gọi mẫu + làm sạch câu trả lời ở goi-mau.ts.
import { auditStatement } from "../audit";
import type {
  TroLyCaiDatResponse, TroLyHoiResponse, TroLyKhungResponse, TroLyLichSuResponse, TroLyLoiDanResponse, TroLyNguCanhResponse, TroLyThuKhoaResponse,
} from "../../shared/contracts";
import { error, escapeLike, intParam, json, readJson, UUID_RE } from "../../shared/http";
import { can, PERMISSION_CODES, PERMISSION_LABEL, type PermissionCode } from "../../shared/permissions";
import { route, type AppModule } from "../../shared/router";
import {
  CAU_CHUA_BAT, CAU_HET_TRAN_THANG, CAU_HOI_THO_TOI_DA, CAU_LOI, CAU_QUA_DAI, CAU_VAI_TAT, cauHetTranNgay, cheCauHoi, chiPhiMicroUsd, chiaKho, chonDoan,
  doanNguCanh, duocDungTroLy, ketQuaThuKhoa, khoaCuoi, khoangThang, kiemCaiDat, kiemLoiDan, kiemNguCanh, kiemVai, quyetDinhTran, thanThuKhoa, thanYeuCau,
  type SuDung,
} from "../../shared/tro-ly";
import { boNaoHieuLuc } from "../../shared/tro-ly-bo-nao";
import { MAU_MAC_DINH } from "../../shared/tro-ly-mau";
import { goiOpenAi, traLoiMotCau } from "./goi-mau";
import { GIOI_HAN_TRO_LY as G } from "../../shared/tro-ly-gioi-han";
import { vnToday } from "../../shared/vn-date";
import {
  cacBanLoiDan, caiDatStatement, coNguCanh, demCauHomNay, demCauHomNayCongTy, docCaiDat, docLoiDan, docNguCanh, docVai, ghiLuot, hoiDapStatement, lichSu,
  loiDanStatement, luotStatement, nguCanhStatement, nguoiDaHoi, theoVai, tongThang, vaiStatement, type LuotHoi,
} from "./repository";

/** Khoá OpenAI đang đặt (secret `OPENAI_API_KEY`); rỗng / chỉ khoảng trắng = chưa có. */
const khoaCua = (env: Env): string | null => env.OPENAI_API_KEY?.trim() || null;

/** Chỉ MÃ lý do — không nội dung, không thân phản hồi của OpenAI. */
const logLoi = (lyDo: string): void => console.error(JSON.stringify({ event: "tro_ly_loi", ly_do: lyDo }));

const usd = (micro: number): number => micro / 1_000_000;
const duVai = (v: Partial<Record<PermissionCode, boolean>>): Record<PermissionCode, boolean> =>
  Object.fromEntries(PERMISSION_CODES.map((p) => [p, v[p] === true])) as Record<PermissionCode, boolean>;

async function trangThaiCaiDat(env: Env): Promise<TroLyCaiDatResponse> {
  const ngay = vnToday(new Date());
  const { tu, den } = khoangThang(ngay);
  const db = env.DB;
  const [c, t, homNay, vai, tv] = await Promise.all([docCaiDat(db), tongThang(db, tu, den), demCauHomNayCongTy(db, ngay), docVai(db), theoVai(db, tu, den)]);
  return {
    bat: c.bat,
    tranThangUsd: usd(c.tranThangMicroUsd),
    tranNgay: c.tranNgay,
    coKhoa: khoaCua(env) !== null,
    khoaCuoi: khoaCuoi(env.OPENAI_API_KEY),
    thang: ngay.slice(0, 7),
    chiPhiThangUsd: usd(t.tong),
    soCauThang: t.so,
    soCauHomNay: homNay,
    vai: duVai(vai),
    theoVai: tv
      .filter((x): x is typeof x & { vai: PermissionCode } => (PERMISSION_CODES as readonly string[]).includes(x.vai))
      .map((x) => ({ vai: x.vai, soCau: x.so, chiPhiUsd: usd(x.chiPhi) })),
  };
}

/** Dòng nhật ký "đổi cài đặt trợ lý" — `phan` chỉ nêu PHẦN đã đổi (không nội dung). */
const nhatKy = (db: D1Database, staffId: string, at: string, phan: string): D1PreparedStatement =>
  auditStatement(db, { staffId, action: "tro_ly_settings_changed", at, targetType: "system", targetId: "tro-ly", detail: phan });

async function loiDanPhanHoi(db: D1Database): Promise<TroLyLoiDanResponse> {
  const [hienHanh, cacBan] = await Promise.all([docLoiDan(db), cacBanLoiDan(db)]);
  return { hienHanh: { ...hienHanh, cauHoiMau: [...hienHanh.cauHoiMau] }, cacBan: cacBan.map((b) => ({ ...b, cauHoiMau: [...b.cauHoiMau] })) };
}

async function nguCanhPhanHoi(db: D1Database): Promise<TroLyNguCanhResponse> {
  return { doan: (await docNguCanh(db)).map((d) => ({ doanId: d.doanId, tieuDe: d.tieuDe, noiDung: d.noiDung, bat: d.bat, luc: d.luc })) };
}

const NGAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const TRANG_LICH_SU = 30;
const KET_QUA_NHAN: Record<string, string> = { ok: "Đã trả lời", loi: "Lỗi" };

export const troLyModule: AppModule = {
  name: "tro-ly",
  routes: [
    // ADR-0069 điều 3, 4: cờ "được dùng" (MỘT hàm duocDungTroLy với route hỏi) + câu chào, câu hỏi mẫu cho khung Hỗ trợ. Không đọc gì khác.
    route("GET", "/api/tro-ly/khung", "staff", async ({ env, staff }) => {
      if (!can(staff, "assistant.ask")) return json({ duocDung: false, cauChao: "", cauHoiMau: [] } satisfies TroLyKhungResponse);
      const [vai, ld] = await Promise.all([docVai(env.DB), docLoiDan(env.DB)]);
      if (!duocDungTroLy(staff.permissions, vai)) return json({ duocDung: false, cauChao: "", cauHoiMau: [] } satisfies TroLyKhungResponse);
      return json({ duocDung: true, cauChao: ld.cauChao, cauHoiMau: [...ld.cauHoiMau] } satisfies TroLyKhungResponse);
    }),

    // ADR-0066 điều 1 + ADR-0069 điều 3: mọi tài khoản đăng nhập (cổng staff) + ô assistant.ask + ÍT NHẤT một quyền đang bật ở bảng điều khiển.
    // ADR-0073: bộ não hiệu lực (mẫu, mức suy nghĩ, độ dài, token ra, lời nhắc); không khớp đoạn nào VẪN gọi mẫu (M1); câu trả lời qua traLoiMotCau (nguồn + ẩn tiền).
    route("POST", "/api/tro-ly/hoi", "staff", async ({ env, request, staff }) => {
      if (!can(staff, "assistant.ask")) return error(403, "forbidden", "Tài khoản này chưa dùng được trợ lý.");
      const body = await readJson(request);
      const raw = body?.cauHoi;
      if (typeof raw !== "string" || !raw.trim()) return error(400, "invalid_input", "Gõ câu hỏi trước khi gửi.");
      // Kiểm độc lập I-1: câu thô quá dài bị từ chối TRƯỚC khi che (không đọc CSDL, không ghi dòng, không gọi mạng).
      if (raw.length > CAU_HOI_THO_TOI_DA) return error(400, "invalid_input", CAU_QUA_DAI);
      const db = env.DB;
      const [caiDat, vai] = await Promise.all([docCaiDat(db), docVai(db)]);
      // ADR-0069 điều 3: vai tắt ⇒ 403 lời thường TRƯỚC trần, không gọi mạng, không ghi dòng.
      if (!duocDungTroLy(staff.permissions, vai)) return error(403, "tro_ly_vai_tat", CAU_VAI_TAT);
      const khoa = khoaCua(env);
      // ADR-0066 điều 8: tắt hoặc thiếu khoá → 503 (mã riêng — KHÔNG phải `maintenance`, mã đó bật màn bảo trì toàn trang ở web/api.ts).
      if (!caiDat.bat || !khoa) return error(503, "tro_ly_chua_bat", CAU_CHUA_BAT);

      const now = new Date();
      const at = now.toISOString();
      const ngayVn = vnToday(now);
      const { tu, den } = khoangThang(ngayVn);
      const [soCauHomNay, thang, loiDan, nguCanh] = await Promise.all([
        demCauHomNay(db, staff.id, ngayVn), tongThang(db, tu, den), docLoiDan(db), docNguCanh(db),
      ]);
      // ADR-0073 Đ2: bộ não hiệu lực. Task 6 thay `null` bằng bản đã lưu (docBoNao); chưa có bản ⇒ mặc định + giọng / lời dặn cũ (B5).
      const { boNao } = boNaoHieuLuc(null, loiDan);
      const luot = (ketQua: LuotHoi["ketQua"], u: SuDung | null): LuotHoi => ({
        id: crypto.randomUUID(), staffId: staff.id, ngayVn, vao: u?.vao ?? 0, vaoDem: u?.vaoDem ?? 0, ra: u?.ra ?? 0, chiPhi: chiPhiMicroUsd(u, boNao.mau),
        ketQua, mau: ketQua === "het_tran" ? null : boNao.mau, laThu: false, at, // het_tran: không gọi mẫu ⇒ mau null (chú thích LuotHoi)
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
      // ADR-0069 điều 5: lịch sử lưu ĐÚNG biến `cauHoi` này (bản đã che) — không bao giờ `raw`.
      const cauHoi = cheCauHoi(raw);
      if (!cauHoi) return error(400, "invalid_input", "Gõ câu hỏi trước khi gửi.");
      const ghi = async (l: LuotHoi, traLoi: string, nguon: readonly string[]): Promise<void> => {
        await db.batch([
          luotStatement(db, l),
          hoiDapStatement(db, {
            luotId: l.id, staffId: staff.id, vai: staff.permissions, ngayVn, cauHoiDaChe: cauHoi, traLoi, nguon, chiPhi: l.chiPhi,
            ketQua: l.ketQua === "loi" ? "loi" : "ok", at,
          }),
        ]);
      };
      // ADR-0069 điều 4: đoạn ngữ cảnh đang bật vào CÙNG kho tìm đoạn (cùng ngân sách token) với hướng dẫn.
      const doan = chonDoan(cauHoi, staff.permissions, [...chiaKho(), ...doanNguCanh(nguCanh)]);
      // P1 (Đ7a): kq.traLoi đã qua anSoTien trong traLoiMotCau — biến này là thứ DUY NHẤT được trả và được lưu (bài route "HÀNG RÀO lọc số tiền").
      const kq = await traLoiMotCau(env, khoa, thanYeuCau(boNao, staff.permissions, doan, cauHoi), doan);
      if (!kq.ok) {
        logLoi(kq.loi);
        await ghi(luot("loi", kq.suDung), CAU_LOI, []);
        return error(502, "tro_ly_loi", CAU_LOI);
      }
      await ghi(luot("ok", kq.suDung), kq.traLoi, kq.nguon);
      return json({ traLoi: kq.traLoi, nguon: kq.nguon } satisfies TroLyHoiResponse);
    }),

    // ---- Bảng điều khiển (ADR-0069 điều 1): chỉ Toàn quyền — cổng office + ô settings.ops ở MỌI route dưới đây ----

    route("GET", "/api/tro-ly/cai-dat", "office", async ({ env, staff }) => {
      if (!can(staff, "settings.ops")) return error(403, "forbidden", "Chỉ Toàn quyền xem được cài đặt trợ lý.");
      return json(await trangThaiCaiDat(env) satisfies TroLyCaiDatResponse);
    }),

    route("POST", "/api/tro-ly/cai-dat", "office", async ({ env, request, staff }) => {
      if (!can(staff, "settings.ops")) return error(403, "forbidden", "Chỉ Toàn quyền đổi được cài đặt trợ lý.");
      const input = kiemCaiDat(await readJson(request));
      if (!input.ok) return error(400, "invalid_input", input.message);
      const at = new Date().toISOString();
      await env.DB.batch([caiDatStatement(env.DB, input.value, at, staff.id), nhatKy(env.DB, staff.id, at, "bật / tắt và trần chi phí")]);
      return json(await trangThaiCaiDat(env) satisfies TroLyCaiDatResponse);
    }),

    route("POST", "/api/tro-ly/vai", "office", async ({ env, request, staff }) => {
      if (!can(staff, "settings.ops")) return error(403, "forbidden", "Chỉ Toàn quyền đổi được cài đặt trợ lý.");
      const input = kiemVai(await readJson(request));
      if (!input.ok) return error(400, "invalid_input", input.message);
      const db = env.DB;
      const cu = await docVai(db);
      const at = new Date().toISOString();
      const doi = PERMISSION_CODES.filter((p) => cu[p] !== input.value[p]);
      if (doi.length) await db.batch([...doi.map((p) => vaiStatement(db, p, input.value[p], at, staff.id)), nhatKy(db, staff.id, at, "công tắc theo vai")]);
      return json(await trangThaiCaiDat(env) satisfies TroLyCaiDatResponse);
    }),

    route("POST", "/api/tro-ly/thu-khoa", "office", async ({ env, staff }) => {
      if (!can(staff, "settings.ops")) return error(403, "forbidden", "Chỉ Toàn quyền thử được key.");
      const khoa = khoaCua(env);
      if (!khoa) return json(ketQuaThuKhoa({ chuaDat: true }) satisfies TroLyThuKhoaResponse);
      const kq = await goiOpenAi(env, khoa, thanThuKhoa(MAU_MAC_DINH));
      const now = new Date();
      const at = now.toISOString();
      // ADR-0069 điều 2: lượt thử ghi vào sổ lượt hỏi với chi phí thật (usage) — không nội dung, không dòng lịch sử (không phải câu của người dùng).
      const u = kq.suDung;
      await ghiLuot(env.DB, {
        id: crypto.randomUUID(), staffId: staff.id, ngayVn: vnToday(now), vao: u?.vao ?? 0, vaoDem: u?.vaoDem ?? 0, ra: u?.ra ?? 0, chiPhi: chiPhiMicroUsd(u, MAU_MAC_DINH),
        ketQua: "loi" in kq ? "loi" : "ok", mau: MAU_MAC_DINH, laThu: false, at,
      });
      if (!("loi" in kq)) return json(ketQuaThuKhoa({ ok: true }) satisfies TroLyThuKhoaResponse);
      logLoi(`thu_khoa_${kq.loi}`);
      // Hết token ra mà chưa có chữ ("rong") vẫn là khoá dùng được.
      if (kq.loi === "rong") return json(ketQuaThuKhoa({ ok: true }) satisfies TroLyThuKhoaResponse);
      return json(ketQuaThuKhoa(kq.status === null ? { mang: true } : { status: kq.status, maLoi: kq.maLoi }) satisfies TroLyThuKhoaResponse);
    }),

    route("GET", "/api/tro-ly/loi-dan", "office", async ({ env, staff }) => {
      if (!can(staff, "settings.ops")) return error(403, "forbidden", "Chỉ Toàn quyền xem được lời dặn trợ lý.");
      return json(await loiDanPhanHoi(env.DB) satisfies TroLyLoiDanResponse);
    }),

    route("POST", "/api/tro-ly/loi-dan", "office", async ({ env, request, staff }) => {
      if (!can(staff, "settings.ops")) return error(403, "forbidden", "Chỉ Toàn quyền đổi được lời dặn trợ lý.");
      const input = kiemLoiDan(await readJson(request));
      if (!input.ok) return error(400, "invalid_input", input.message);
      const at = new Date().toISOString();
      await env.DB.batch([loiDanStatement(env.DB, input.value, at, staff.id), nhatKy(env.DB, staff.id, at, "lời dặn")]);
      return json(await loiDanPhanHoi(env.DB) satisfies TroLyLoiDanResponse);
    }),

    route("GET", "/api/tro-ly/ngu-canh", "office", async ({ env, staff }) => {
      if (!can(staff, "settings.ops")) return error(403, "forbidden", "Chỉ Toàn quyền xem được ngữ cảnh trợ lý.");
      return json(await nguCanhPhanHoi(env.DB) satisfies TroLyNguCanhResponse);
    }),

    route("POST", "/api/tro-ly/ngu-canh", "office", async ({ env, request, staff }) => {
      if (!can(staff, "settings.ops")) return error(403, "forbidden", "Chỉ Toàn quyền thêm được ngữ cảnh trợ lý.");
      const input = kiemNguCanh(await readJson(request));
      if (!input.ok) return error(400, "invalid_input", input.message);
      const db = env.DB;
      if ((await docNguCanh(db)).length >= G.soNguCanh) return error(400, "invalid_input", `Tối đa ${G.soNguCanh} đoạn ngữ cảnh — sửa hoặc tắt đoạn cũ thay vì thêm.`);
      const at = new Date().toISOString();
      await db.batch([nguCanhStatement(db, crypto.randomUUID(), input.value, at, staff.id), nhatKy(db, staff.id, at, "ngữ cảnh: thêm đoạn")]);
      return json(await nguCanhPhanHoi(db) satisfies TroLyNguCanhResponse);
    }),

    route("PUT", "/api/tro-ly/ngu-canh/:id", "office", async ({ env, request, params, staff }) => {
      if (!can(staff, "settings.ops")) return error(403, "forbidden", "Chỉ Toàn quyền sửa được ngữ cảnh trợ lý.");
      const id = params.id!;
      if (!UUID_RE.test(id)) return error(404, "not_found", "Không tìm thấy đoạn ngữ cảnh.");
      const input = kiemNguCanh(await readJson(request));
      if (!input.ok) return error(400, "invalid_input", input.message);
      const db = env.DB;
      if (!(await coNguCanh(db, id))) return error(404, "not_found", "Không tìm thấy đoạn ngữ cảnh.");
      const at = new Date().toISOString();
      await db.batch([nguCanhStatement(db, id, input.value, at, staff.id), nhatKy(db, staff.id, at, "ngữ cảnh: sửa hoặc bật / tắt đoạn")]);
      return json(await nguCanhPhanHoi(db) satisfies TroLyNguCanhResponse);
    }),

    // ADR-0069 điều 5: lịch sử hỏi đáp — chỉ Toàn quyền; lọc ngày (YYYY-MM-DD, giờ VN), người, vai; tìm chữ; 30 dòng mỗi trang. Không route xoá.
    route("GET", "/api/tro-ly/lich-su", "office", async ({ env, url, staff }) => {
      if (!can(staff, "settings.ops")) return error(403, "forbidden", "Chỉ Toàn quyền xem được lịch sử hỏi đáp.");
      const sp = url.searchParams;
      const ngay = (k: string): string | null | undefined => {
        const v = sp.get(k)?.trim();
        return !v ? null : NGAY_RE.test(v) ? v : undefined;
      };
      const tu = ngay("tu");
      const den = ngay("den");
      if (tu === undefined || den === undefined) return error(400, "invalid_input", "Ngày lọc không hợp lệ.");
      const nguoi = sp.get("nguoi")?.trim() || null;
      if (nguoi !== null && !UUID_RE.test(nguoi)) return error(400, "invalid_input", "Người lọc không hợp lệ.");
      const vai = sp.get("vai")?.trim() || null;
      if (vai !== null && !(PERMISSION_CODES as readonly string[]).includes(vai)) return error(400, "invalid_input", "Vai lọc không hợp lệ.");
      const q = (sp.get("q") ?? "").trim().slice(0, 100);
      const trang = intParam(sp.get("trang"), 1, 1, 10_000);
      const db = env.DB;
      const [dong, ds] = await Promise.all([
        lichSu(db, { tu, den, nguoi, vai, mauTim: q ? `%${escapeLike(q)}%` : null, gioiHan: TRANG_LICH_SU + 1, boQua: (trang - 1) * TRANG_LICH_SU }),
        nguoiDaHoi(db),
      ]);
      const nhan = (v: string): string => ((PERMISSION_CODES as readonly string[]).includes(v) ? PERMISSION_LABEL[v as PermissionCode] : "Vai cũ");
      return json({
        dong: dong.slice(0, TRANG_LICH_SU).map((d) => ({
          id: d.id, nguoi: d.nguoi ?? "Tài khoản không còn", vai: d.vai.map(nhan), cauHoi: d.cauHoi, traLoi: d.traLoi, nguon: d.nguon,
          chiPhiUsd: usd(d.chiPhi), ketQua: KET_QUA_NHAN[d.ketQua] ?? "Khác", luc: d.luc,
        })),
        coThem: dong.length > TRANG_LICH_SU,
        nguoi: ds.map((x) => ({ staffId: x.staffId, ten: x.nguoi ?? "Tài khoản không còn" })),
      } satisfies TroLyLichSuResponse);
    }),
  ],
};
