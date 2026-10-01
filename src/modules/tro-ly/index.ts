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
  TroLyBoNaoLichSuResponse, TroLyBoNaoResponse, TroLyCaiDatResponse, TroLyHoiResponse, TroLyKhungResponse, TroLyLichSuResponse, TroLyLoiDanResponse, TroLyNguCanhResponse, TroLyThuKhoaResponse, TroLyThuResponse,
} from "../../shared/contracts";
import { error, escapeLike, intParam, json, readJson, UUID_RE } from "../../shared/http";
import { can, PERMISSION_CODES, PERMISSION_LABEL, type PermissionCode } from "../../shared/permissions";
import { route, type AppModule } from "../../shared/router";
import {
  CAU_CHUA_BAT, CAU_HET_TRAN_THANG, CAU_HOI_THO_TOI_DA, CAU_LOI, CAU_QUA_DAI, CAU_VAI_TAT, cauHetTranNgay, cheCauHoi, chiPhiMicroUsd, chiaKho,
  doanNguCanh, duocDungTroLy, ketQuaThuKhoa, khoaCuoi, khoangThang, kiemCaiDat, kiemLoiDan, kiemNguCanh, kiemVai, NHO_TRONG_MS, quyetDinhTran, thanThuKhoa, thanYeuCau,
  truyVanTim, uocTokenVao, type SuDung,
} from "../../shared/tro-ly";
import { LOI_NHAC_MAC_DINH, boNaoHieuLuc, kiemBoNao, phanDoi } from "../../shared/tro-ly-bo-nao";
import { DANH_SACH_MAU, DO_DAI, DO_DAI_NHAN, MUC_NHAN, uocMotCauMicroUsd, vuotTranThang } from "../../shared/tro-ly-mau";
import { goiOpenAi, traLoiMotCau } from "./goi-mau";
import { mucTranTren } from "../../shared/tro-ly-van-nghia";
import { timDoanTheoNghia } from "./van-nghia";
import { GIOI_HAN_TRO_LY as G } from "../../shared/tro-ly-gioi-han";
import { vnToday } from "../../shared/vn-date";
import {
  boNaoStatement, cacBanBoNao, cacBanLoiDan, caiDatStatement, coNguCanh, demCauHomNay, demCauHomNayCongTy, docBoNao, docCaiDat, docLoiDan, docNguCanh, docVai, ghiLuot, hoiDapStatement, lichSu,
  loiDanStatement, luotStatement, nguCanhStatement, nguoiDaHoi, nhoLuot, theoVai, tongThang, vaiStatement, type LuotHoi,
} from "./repository";

/** Khoá OpenAI đang đặt (secret `OPENAI_API_KEY`); rỗng / chỉ khoảng trắng = chưa có. */
const khoaCua = (env: Env): string | null => env.OPENAI_API_KEY?.trim() || null;

/** Chỉ MÃ lý do — không nội dung, không thân phản hồi của OpenAI. */
const logLoi = (lyDo: string): void => console.error(JSON.stringify({ event: "tro_ly_loi", ly_do: lyDo }));

/**
 * ADR-0073 Đ7b + ADR-0082 Đ5(1) — MỘT chỗ kiểm trần tháng TRƯỚC MỌI lần gọi API (Embeddings lẫn mẫu trả lời), cho route hỏi VÀ ô thử.
 * Mức trần trên = token ước của thân yêu cầu CHƯA có tài liệu (lời nhắc + phần nhớ + câu mới) + NGAN_SACH_TOKEN (tài liệu tối đa) theo giá vào + token ra tối đa
 * theo giá ra + tiền embedding ước của truy vấn tìm (mucTranTren). `vuot` ⇒ KHÔNG gọi gì. `conLai` = phần trần còn lại sau mức trần trên — trần cho tiền tính bù
 * đoạn (Đ5(2), timDoanTheoNghia). Vượt trần do nhiều lượt song song vẫn có thể xảy ra, chặn trên bởi số lượt song song × mức trần trên (ADR-0073 Đ7b).
 */
export const kiemTranTruocKhiGoi = (
  boNao: { mau: string; tokenRaToiDa: number }, thanKhongTaiLieu: Record<string, unknown>, truyVan: string, daDungThang: number, tranThang: number,
): { vuot: boolean; conLai: number } => {
  const toiDa = mucTranTren(boNao.mau, uocTokenVao(thanKhongTaiLieu), boNao.tokenRaToiDa, truyVan);
  return { vuot: vuotTranThang(daDungThang, toiDa, tranThang), conLai: tranThang - daDungThang - toiDa };
};

const usd = (micro: number): number => micro / 1_000_000;
/** Cộng mức dùng hai lần gọi (phòng thủ gọi lại không nhớ); cả hai null ⇒ null. */
const congSuDung = (a: SuDung | null, b: SuDung | null): SuDung | null =>
  a && b ? { vao: a.vao + b.vao, vaoDem: a.vaoDem + b.vaoDem, ra: a.ra + b.ra } : (a ?? b);
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
    soLuotThuThang: t.soThu,
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

const GHI_CHU_UOC_TINH = "Ước tính thô một câu: 6.000 token vào + số token trả lời tối đa — chưa tính token suy nghĩ và phần nhớ.";
const TRANG_BAN_BO_NAO = 30;

/**
 * Bộ não hiệu lực — MỘT chỗ đọc cho mọi nơi dùng (câu hỏi, Thử key, PUT tính phần đổi, GET; ruling F8/F12): bản đã lưu + lời dặn (giọng / lời dặn cũ khi
 * chưa có bản — B5) qua boNaoHieuLuc (bản trỏ mẫu đã bỏ ⇒ thông số mặc định, giữ lời nhắc — R1).
 */
async function boNaoHienHanh(db: D1Database): Promise<ReturnType<typeof boNaoHieuLuc>> {
  const [ban, loiDan] = await Promise.all([docBoNao(db), docLoiDan(db)]);
  return boNaoHieuLuc(ban, loiDan);
}

/** Bộ não hiện hành + danh sách mẫu (giá, mức, ước tính) + bản mặc định cho nút "Xem / Khôi phục mặc định" (B1). */
async function boNaoPhanHoi(db: D1Database): Promise<TroLyBoNaoResponse> {
  const { boNao, macDinh } = await boNaoHienHanh(db);
  return {
    hienHanh: { ...boNao },
    macDinh,
    loiNhacMacDinh: LOI_NHAC_MAC_DINH,
    danhSachMau: DANH_SACH_MAU.map((m) => ({
      ma: m.ma, ten: m.ten, gia: { ...m.gia }, mucSuyNghi: m.mucSuyNghi.map((x) => ({ ma: x, nhan: MUC_NHAN[x] })), ngayTraGia: m.ngayTraGia,
      uocMotCauUsd: usd(uocMotCauMicroUsd(m.ma, boNao.tokenRaToiDa)),
    })),
    doDai: DO_DAI.map((x) => ({ ma: x, nhan: DO_DAI_NHAN[x] })),
    ghiChuUocTinh: GHI_CHU_UOC_TINH,
  };
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
      // ADR-0073 Đ4 (N1, N4): mã cuộc trò chuyện do khung sinh — thiếu / null ⇒ hỏi như câu đầu; sai dạng ⇒ 400. KHÔNG nhận nội dung lượt trước từ trình duyệt.
      const cuocTho = body?.cuocTroChuyen;
      if (cuocTho !== undefined && cuocTho !== null && (typeof cuocTho !== "string" || !UUID_RE.test(cuocTho))) {
        return error(400, "invalid_input", "Mã cuộc trò chuyện không hợp lệ — bấm \"Cuộc trò chuyện mới\" rồi hỏi lại.");
      }
      const cuocTroChuyen = typeof cuocTho === "string" ? cuocTho : null;
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
      const [soCauHomNay, thang, nguCanh, { boNao }] = await Promise.all([
        demCauHomNay(db, staff.id, ngayVn), tongThang(db, tu, den), docNguCanh(db), boNaoHienHanh(db),
      ]);
      // ADR-0073 Đ2: bộ não hiệu lực = bản đã lưu; chưa có bản ⇒ mặc định + giọng / lời dặn cũ (B5); bản trỏ mẫu đã bỏ ⇒ thông số mặc định, giữ lời nhắc (R1).
      const luot = (ketQua: LuotHoi["ketQua"], u: SuDung | null, tienNhung = 0): LuotHoi => ({
        id: crypto.randomUUID(), staffId: staff.id, ngayVn, vao: u?.vao ?? 0, vaoDem: u?.vaoDem ?? 0, ra: u?.ra ?? 0,
        chiPhi: chiPhiMicroUsd(u, boNao.mau) + tienNhung, // ADR-0082 Đ5(3), P1: tiền mẫu + tiền embedding; token chỉ của mẫu
        ketQua, mau: ketQua === "het_tran" ? null : boNao.mau, laThu: false, at, // het_tran: không gọi mẫu ⇒ mau null (chú thích LuotHoi)
      });
      // ADR-0066 điều 6: trần kiểm TRƯỚC khi dựng lời nhắc (lớp một: đã chạm trần); lớp hai (chi phí tối đa của lượt — ADR-0073 Đ7b) kiểm sau khi dựng thân yêu cầu, trước khi gọi. Kiểm-rồi-ghi không nguyên tử: vài câu gửi cùng lúc có thể vượt trần một chút
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
            ketQua: l.ketQua === "loi" ? "loi" : "ok", at, cuocTroChuyen,
          }),
        ]);
      };
      // ADR-0073 Đ4 (N2, N3): ≤ 3 lượt gần nhất của CHÍNH người hỏi, CÙNG mã, kết quả ok, trong 2 giờ — MÁY CHỦ đọc tl_hoi_dap (đã che khi lưu).
      const nho = cuocTroChuyen ? await nhoLuot(db, staff.id, cuocTroChuyen, new Date(now.getTime() - NHO_TRONG_MS).toISOString()) : [];
      // N5: tìm bằng câu hiện tại + câu trước gần nhất (đã che). ADR-0082 Đ5(1): kiểm trần bằng MỨC TRẦN TRÊN trước MỌI lần gọi (embeddings lẫn mẫu).
      const truyVan = truyVanTim(cauHoi, nho.at(-1)?.cauHoi ?? null);
      const tran = kiemTranTruocKhiGoi(boNao, thanYeuCau(boNao, staff.permissions, [], cauHoi, nho), truyVan, thang.tong, caiDat.tranThangMicroUsd);
      if (tran.vuot) {
        await ghiLuot(db, luot("het_tran", null));
        return error(429, "tro_ly_het_tran_thang", CAU_HET_TRAN_THANG);
      }
      // ADR-0082 Đ2–Đ4 + ADR-0069 điều 4: đoạn ngữ cảnh đang bật vào CÙNG kho; chọn đoạn trộn nghĩa + từ khoá (lỗi / sát trần ⇒ lùi từ khoá).
      const tim = await timDoanTheoNghia(env, khoa, { truyVan, perms: staff.permissions, kho: [...chiaKho(), ...doanNguCanh(nguCanh)], conLaiMicroUsd: tran.conLai });
      const doan = tim.daChon.map((x) => x.doan);
      // `than` = TOÀN BỘ đầu vào (lời nhắc + phần nhớ + câu mới + tài liệu đã chọn).
      const than = thanYeuCau(boNao, staff.permissions, doan, cauHoi, nho);
      // P1 (Đ7a): kq.traLoi đã qua anSoTien trong traLoiMotCau — biến này là thứ DUY NHẤT được trả và được lưu (bài route "HÀNG RÀO lọc số tiền").
      let kq = await traLoiMotCau(env, khoa, than, doan);
      // Phòng thủ (nhật ký thi công: chưa kiểm được OpenAI nhận `input` nhiều lượt cùng `instructions`): 400 cho yêu cầu CÓ phần nhớ ⇒ gọi lại ĐÚNG MỘT lần
      // không nhớ (một lượt, như trước ADR-0073). Log chỉ tên sự kiện. Mức dùng của lần đầu (nếu có) cộng vào lượt — tiền đã tiêu vẫn tính.
      if (!kq.ok && kq.status === 400 && nho.length) {
        console.error(JSON.stringify({ event: "tro_ly_nho_bi_tu_choi" }));
        const dau = kq.suDung;
        const lai = await traLoiMotCau(env, khoa, thanYeuCau(boNao, staff.permissions, doan, cauHoi), doan);
        kq = { ...lai, suDung: congSuDung(dau, lai.suDung) };
      }
      if (!kq.ok) {
        logLoi(kq.loi);
        await ghi(luot("loi", kq.suDung, tim.tienNhungMicroUsd), CAU_LOI, []);
        return error(502, "tro_ly_loi", CAU_LOI);
      }
      await ghi(luot("ok", kq.suDung, tim.tienNhungMicroUsd), kq.traLoi, kq.nguon);
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
      // ADR-0073 B10: thử với MẪU ĐANG CHỌN; lượt ghi la_thu = 1 (tính tiền tháng, không tính trần ngày).
      const { boNao } = await boNaoHienHanh(env.DB);
      const kq = await goiOpenAi(env, khoa, thanThuKhoa(boNao.mau));
      const now = new Date();
      const at = now.toISOString();
      // ADR-0069 điều 2: lượt thử ghi vào sổ lượt hỏi với chi phí thật (usage) — không nội dung, không dòng lịch sử (không phải câu của người dùng).
      const u = kq.suDung;
      await ghiLuot(env.DB, {
        id: crypto.randomUUID(), staffId: staff.id, ngayVn: vnToday(now), vao: u?.vao ?? 0, vaoDem: u?.vaoDem ?? 0, ra: u?.ra ?? 0, chiPhi: chiPhiMicroUsd(u, boNao.mau),
        ketQua: "loi" in kq ? "loi" : "ok", mau: boNao.mau, laThu: true, at,
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

    // ADR-0073 Đ1, Đ2: bộ não (mẫu, mức suy nghĩ, độ dài, token ra, TOÀN BỘ lời nhắc) — chỉ Toàn quyền. Lưu = thêm bản (chỉ-thêm); "quay lại" / "khôi phục mặc
    // định" = giao diện gửi lại nội dung qua CHÍNH route này (kiemBoNao chạy lại). Nhật ký chỉ ghi PHẦN đổi (B7), không nội dung.
    route("GET", "/api/tro-ly/bo-nao", "office", async ({ env, staff }) => {
      if (!can(staff, "settings.ops")) return error(403, "forbidden", "Chỉ Toàn quyền xem được bộ não trợ lý.");
      return json(await boNaoPhanHoi(env.DB) satisfies TroLyBoNaoResponse);
    }),

    route("PUT", "/api/tro-ly/bo-nao", "office", async ({ env, request, staff }) => {
      if (!can(staff, "settings.ops")) return error(403, "forbidden", "Chỉ Toàn quyền đổi được bộ não trợ lý.");
      const input = kiemBoNao(await readJson(request));
      if (!input.ok) return error(400, "invalid_input", input.message);
      const db = env.DB;
      const cu = (await boNaoHienHanh(db)).boNao;
      const at = new Date().toISOString();
      await db.batch([boNaoStatement(db, input.value, at, staff.id), nhatKy(db, staff.id, at, `bộ não: ${phanDoi(cu, input.value)}`)]);
      return json(await boNaoPhanHoi(db) satisfies TroLyBoNaoResponse);
    }),

    route("GET", "/api/tro-ly/bo-nao/lich-su", "office", async ({ env, staff }) => {
      if (!can(staff, "settings.ops")) return error(403, "forbidden", "Chỉ Toàn quyền xem được lịch sử bộ não.");
      const ds = await cacBanBoNao(env.DB);
      return json({
        cacBan: ds.slice(0, TRANG_BAN_BO_NAO).map((b, i) => ({
          id: b.id, luc: b.luc, nguoi: b.nguoi, mau: b.mau, mucSuyNghi: b.mucSuyNghi, doDai: b.doDai, tokenRaToiDa: b.tokenRaToiDa, loiNhac: b.loiNhac,
          phanDoi: phanDoi(ds[i + 1] ?? null, b),
        })),
      } satisfies TroLyBoNaoLichSuResponse);
    }),

    // ADR-0073 Đ5: ô thử — cấu hình CHƯA lưu (qua CÙNG kiemBoNao với PUT — T2) + câu hỏi + MỘT vai giả định (chỉ tên nhóm vai vào lời nhắc); chạy đúng đường
    // ống thật (che, tìm đoạn theo vai, gọi, nguồn, ẩn tiền — traLoiMotCau). Chạy được khi trợ lý TẮT (T4 — thử trước khi bật) nhưng KHÔNG miễn trần tiền tháng
    // (T3; kiemTranTruocKhiGoi — MỘT hàm với route hỏi, ruling F7); không trần ngày (la_thu = 1); không nhớ; không ghi tl_hoi_dap; không đổi bộ não đã lưu (T5).
    // Không ghi audit_log: lượt thử không đổi cấu hình; dấu vết là dòng tl_luot_hoi (người, ngày, mẫu, tiền — không nội dung).
    // ADR-0082: cùng `kiemTranTruocKhiGoi` + `timDoanTheoNghia` với route hỏi; trả thêm `doanDaChon` + `chiPhiVanNghiaMicroUsd`.
    route("POST", "/api/tro-ly/thu", "office", async ({ env, request, staff }) => {
      if (!can(staff, "settings.ops")) return error(403, "forbidden", "Chỉ Toàn quyền thử được trợ lý.");
      const body = await readJson(request);
      const bn = kiemBoNao((body?.boNao ?? null) as Record<string, unknown> | null);
      if (!bn.ok) return error(400, "invalid_input", bn.message);
      const raw = body?.cauHoi;
      if (typeof raw !== "string" || !raw.trim()) return error(400, "invalid_input", "Gõ câu hỏi thử trước khi bấm.");
      if (raw.length > CAU_HOI_THO_TOI_DA) return error(400, "invalid_input", CAU_QUA_DAI);
      const vaiThu = body?.vai;
      if (typeof vaiThu !== "string" || !(PERMISSION_CODES as readonly string[]).includes(vaiThu)) return error(400, "invalid_input", "Chọn một vai giả định để thử.");
      const khoa = khoaCua(env);
      // T4: thiếu khoá ⇒ 503 như hỏi thường; trợ lý tắt KHÔNG chặn ô thử.
      if (!khoa) return error(503, "tro_ly_chua_bat", CAU_CHUA_BAT);
      const cauHoi = cheCauHoi(raw);
      if (!cauHoi) return error(400, "invalid_input", "Gõ câu hỏi thử trước khi bấm.");

      const db = env.DB;
      const boNao = bn.value;
      const perms = [vaiThu as PermissionCode];
      const now = new Date();
      const at = now.toISOString();
      const ngayVn = vnToday(now);
      const { tu, den } = khoangThang(ngayVn);
      // Tổng tháng đọc MỚI trong request này (gồm lượt thử — T3).
      const [caiDat, thang, nguCanh] = await Promise.all([docCaiDat(db), tongThang(db, tu, den), docNguCanh(db)]);
      const luot = (ketQua: LuotHoi["ketQua"], u: SuDung | null, tienNhung = 0): LuotHoi => ({
        id: crypto.randomUUID(), staffId: staff.id, ngayVn, vao: u?.vao ?? 0, vaoDem: u?.vaoDem ?? 0, ra: u?.ra ?? 0,
        chiPhi: chiPhiMicroUsd(u, boNao.mau) + tienNhung, // ADR-0082 P1, P3: tiền mẫu + tiền embedding của lượt thử
        ketQua, mau: ketQua === "het_tran" ? null : boNao.mau, laThu: true, at,
      });
      // ADR-0082 P3: CÙNG kiểm trần mức trên + CÙNG hàm tìm với route hỏi (không nhớ ⇒ truy vấn = câu hỏi thử).
      const tran = kiemTranTruocKhiGoi(boNao, thanYeuCau(boNao, perms, [], cauHoi), cauHoi, thang.tong, caiDat.tranThangMicroUsd);
      if (tran.vuot) {
        await ghiLuot(db, luot("het_tran", null));
        return error(429, "tro_ly_het_tran_thang", CAU_HET_TRAN_THANG);
      }
      const tim = await timDoanTheoNghia(env, khoa, { truyVan: cauHoi, perms, kho: [...chiaKho(), ...doanNguCanh(nguCanh)], conLaiMicroUsd: tran.conLai });
      const doan = tim.daChon.map((x) => x.doan);
      const kq = await traLoiMotCau(env, khoa, thanYeuCau(boNao, perms, doan, cauHoi), doan);
      const l = luot(kq.ok ? "ok" : "loi", kq.suDung, tim.tienNhungMicroUsd);
      await ghiLuot(db, l);
      if (!kq.ok) {
        logLoi(`thu_${kq.loi}`);
        if (kq.loi === "rong") return error(502, "tro_ly_loi", CAU_LOI);
        // Cùng câu lời thường với Thử key (vd. 400 ⇒ mau_tu_choi "mẫu không nhận mức suy nghĩ…"); không chuyển tiếp chữ lỗi của OpenAI.
        const tk = ketQuaThuKhoa(kq.status === null ? { mang: true } : { status: kq.status, maLoi: kq.maLoi });
        return error(502, tk.ma, tk.cau);
      }
      const tienMau = l.chiPhi - tim.tienNhungMicroUsd; // R4: phản hồi tách tiền mẫu và tiền tìm theo nghĩa; dòng lượt giữ tổng
      return json({
        traLoi: kq.traLoi, nguon: kq.nguon, tokenVao: l.vao, tokenRa: l.ra, chiPhiMicroUsd: tienMau, chiPhiUsd: usd(tienMau),
        chiPhiVanNghiaMicroUsd: tim.tienNhungMicroUsd, mau: boNao.mau,
        doanDaChon: tim.daChon.map((x) => ({ ten: x.doan.ten, theoNghia: x.theoNghia, theoTuKhoa: x.theoTuKhoa })),
      } satisfies TroLyThuResponse);
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
