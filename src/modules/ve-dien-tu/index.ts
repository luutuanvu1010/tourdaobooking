// Module ve-dien-tu — KHO VÉ ĐIỆN TỬ (ADR-0153, accepted 2026-10-31). Sở hữu `vdt_*`. Route: /api/ve*.
// Phụ thuộc: audit (nhật ký — chỉ số lượng và nhãn nhóm, KHÔNG BAO GIỜ mã vé), catalog (kiểm mã tour qua hàm công bố). Cạnh tới staff / thongbao / orders (chỉ đọc view)
// thêm khi dùng (ADR-0153 Đ1 mục 2). Chiều orders → ve-dien-tu KHÔNG có cạnh: gốc lắp ráp (src/index.ts) tiêm hàm cấp / trả vé vào ctx.
// Module khác CHỈ import từ file này.
import { auditStatement } from "../audit";
import { getEffectiveServices } from "../catalog";
import { UUID_RE, error, json, kemLocation, readJson } from "../../shared/http";
import { can } from "../../shared/permissions";
import { route, type AppModule } from "../../shared/router";
import { LOAI_NOI_DUNG, bamSha256, giaiBase64, nhanLoaiTep, taoKhoaNgauNhien, type LoaiTep } from "../../shared/tep-dinh-kem";
import { vnToday } from "../../shared/vn-date";
import { NHAN_NHOM, soanCapVe, soanTraVe, veDangGiu, type GhiNhatKy, type NhatKyVe } from "./cap-ve.ts";
import { datVeVaoKho, type VeChuanBi } from "./kho-tep.ts";
import { TOI_DA_VE_MOI_DOT, TOI_DA_VE_MOI_LO, che4SoCuoi, kiemLo, kiemVeMoi } from "./nhap-lo.ts";
import { cauChenLo, cauChenVe, cauKichHoatLo, cauSuaMaTour, demVeCuaLo, docLo, maVeDaCo, thongKeKho } from "./repository.ts";

export { demVeTheoTrangThai } from "./repository.ts";

/** Nối nhật ký thật (module audit) vào các hàm soạn câu của cap-ve.ts. Gốc lắp ráp dùng khi tiêm (Task 5). */
export const nhatKyThat = (db: D1Database): GhiNhatKy => (e: NhatKyVe, onlyIf: string) => auditStatement(db, e, onlyIf);
export { NHAN_NHOM, soanCapVe, soanTraVe, veDangGiu };
export { canBangVeTheoSoKhach, capVeChoDon, soanTraVeKhiHuy } from "./noi-orders.ts";

const MAX_BYTE_ANH = 3 * 1024 * 1024;
/** Cỡ thân một đợt thêm vé: 10 ảnh × 3 MB base64 + dư. */
const TOI_DA_THAN_DOT = Math.ceil((TOI_DA_VE_MOI_DOT * MAX_BYTE_ANH) / 3) * 4 + 64 * 1024;
const LOAI_ANH: readonly LoaiTep[] = ["jpg", "png"];

const KHONG_QUYEN = () => error(403, "forbidden", "Bạn không có quyền quản lý kho vé điện tử.");
const KHONG_THAY = () => error(404, "not_found", "Không tìm thấy lô vé.");
const BAD_JSON = () => error(400, "invalid_input", "Nội dung gửi lên không hợp lệ.");
const KHO_CHUA_BAT = () => error(503, "storage_unavailable", "Kho vé điện tử chưa được bật. Vui lòng báo người phụ trách hệ thống.");

export const veDienTuModule: AppModule = {
  name: "ve-dien-tu",
  routes: [
    // Thống kê kho (tiêu chí D5): theo dịch vụ + nhóm khách; chỉ ĐẾM, không mã vé, không khoá kho.
    route("GET", "/api/ve/kho", "office", async ({ env, staff }) => {
      if (!can(staff, "ve.kho.manage")) return KHONG_QUYEN();
      const hom = new Date();
      const homNay = vnToday(hom);
      const hanSap = vnToday(new Date(hom.getTime() + 7 * 24 * 3600 * 1000));
      const dong = await thongKeKho(env.DB, homNay, hanSap);
      const ten = await getEffectiveServices(env.DB, [...new Set(dong.map((d) => d.catalog_code))]);
      return json({
        kho: dong.map((d) => ({
          catalogCode: d.catalog_code,
          tenDichVu: ten.get(d.catalog_code)?.name ?? null,
          nhomKhach: d.pax_group,
          conTrong: d.con_trong ?? 0,
          sapHetHan: d.sap_het_han ?? 0,
          daGiu: d.da_giu ?? 0,
          daGiao: d.da_giao ?? 0,
        })),
      });
    }),

    // Tạo lô (PENDING): một dịch vụ + một nhóm khách + tên sản phẩm in trên vé, chọn một lần cho cả lô.
    route("POST", "/api/ve/lo", "office", async ({ request, env, staff }) => {
      if (!can(staff, "ve.kho.manage")) return KHONG_QUYEN();
      const raw = await readJson(request);
      if (!raw) return BAD_JSON();
      const v = kiemLo(raw);
      if (!v.ok) return error(400, "invalid_input", v.message);
      const dv = await getEffectiveServices(env.DB, [v.value.catalogCode]);
      if (!dv.has(v.value.catalogCode)) return error(400, "invalid_input", "Dịch vụ không có trong danh mục.");
      const id = crypto.randomUUID();
      const at = new Date().toISOString();
      await env.DB.batch([
        cauChenLo(env.DB, { id, catalogCode: v.value.catalogCode, nhom: v.value.nhomKhach, tenSanPham: v.value.tenSanPham, at, by: staff.id }),
        auditStatement(env.DB, { staffId: staff.id, action: "ve_nhap_lo", at, targetType: "ve", targetId: v.value.catalogCode, detail: `Mở lô vé · ${NHAN_NHOM[v.value.nhomKhach]}` }),
      ]);
      return kemLocation(json({ loId: id }, 201), `/ve-kho?lo=${id}`);
    }),

    // Thêm một đợt vé vào lô PENDING. D1 TRƯỚC (dòng vé + nhật ký), kho SAU; lỗi kho không làm hỏng yêu cầu (vé chưa lưu thì không bao giờ được giữ chỗ).
    route("POST", "/api/ve/lo/:id/ve", "office", async ({ request, env, params, staff }) => {
      if (!can(staff, "ve.kho.manage")) return KHONG_QUYEN();
      const loId = params.id ?? "";
      if (!UUID_RE.test(loId)) return KHONG_THAY();
      if (Number(request.headers.get("content-length") ?? "0") > TOI_DA_THAN_DOT) return error(413, "file_too_large", `Mỗi đợt tối đa ${TOI_DA_VE_MOI_DOT} ảnh, mỗi ảnh tối đa 3 MB.`);
      const kho = env.VE_DIEN_TU;
      if (!kho) return KHO_CHUA_BAT();
      const raw = await readJson(request);
      if (!raw || !Array.isArray(raw.ve)) return BAD_JSON();
      if (raw.ve.length < 1 || raw.ve.length > TOI_DA_VE_MOI_DOT) return error(400, "invalid_input", `Mỗi đợt thêm từ 1 đến ${TOI_DA_VE_MOI_DOT} vé.`);
      const lo = await docLo(env.DB, loId);
      if (!lo) return KHONG_THAY();
      if (lo.status !== "PENDING") return error(409, "batch_closed", "Lô này đã đưa vào kho hoặc đã vô hiệu, không thêm vé được nữa.");
      if ((await demVeCuaLo(env.DB, loId)).tong + raw.ve.length > TOI_DA_VE_MOI_LO) return error(400, "invalid_input", `Một lô tối đa ${TOI_DA_VE_MOI_LO} vé.`);
      // Kiểm TỪNG vé trước khi chạm D1; một vé sai không kéo cả đợt.
      const hop: { thuTu: number; raw: Record<string, unknown>; ma: string; tuNgay: string; denNgay: string; gio: string | null; bytes: Uint8Array; loai: LoaiTep }[] = [];
      const loi: { thuTu: number; lyDo: string }[] = [];
      const trongDot = new Set<string>();
      raw.ve.forEach((x, i) => {
        const r = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
        const k = kiemVeMoi(r);
        if (!k.ok) return void loi.push({ thuTu: i, lyDo: k.message });
        const bytes = giaiBase64(r.noiDung);
        if (!bytes) return void loi.push({ thuTu: i, lyDo: "Ảnh không đọc được." });
        if (bytes.length > MAX_BYTE_ANH) return void loi.push({ thuTu: i, lyDo: "Ảnh quá 3 MB." });
        const loai = nhanLoaiTep(bytes);
        if (!loai || !LOAI_ANH.includes(loai)) return void loi.push({ thuTu: i, lyDo: "Chỉ nhận ảnh JPG hoặc PNG." });
        if (trongDot.has(k.value.maVe)) return void loi.push({ thuTu: i, lyDo: "Trùng mã vé với một ảnh khác trong đợt này." });
        trongDot.add(k.value.maVe);
        hop.push({ thuTu: i, raw: r, ma: k.value.maVe, tuNgay: k.value.tuNgay, denNgay: k.value.denNgay, gio: k.value.gio, bytes, loai });
      });
      const daCo = await maVeDaCo(env.DB, hop.map((h) => h.ma));
      const moi = hop.filter((h) => {
        if (!daCo.has(h.ma)) return true;
        loi.push({ thuTu: h.thuTu, lyDo: "Mã vé đã có trong kho, đã loại." });
        return false;
      });
      const at = new Date().toISOString();
      const chuanBi: VeChuanBi[] = [];
      const cau: D1PreparedStatement[] = [];
      for (const h of moi) {
        const id = crypto.randomUUID();
        chuanBi.push({ id, bytes: h.bytes, loai: h.loai });
        cau.push(cauChenVe(env.DB, { id, batchId: loId, maVe: h.ma, tuNgay: h.tuNgay, denNgay: h.denNgay, gio: h.gio, khoa: taoKhoaNgauNhien("vdt"), loaiNoiDung: LOAI_NOI_DUNG[h.loai], coBytes: h.bytes.length, bam: await bamSha256(h.bytes), at, by: staff.id }));
      }
      if (cau.length > 0) {
        cau.push(auditStatement(env.DB, { staffId: staff.id, action: "ve_nhap_lo", at, targetType: "ve", targetId: lo.catalog_code, detail: `Thêm vé vào lô · ${NHAN_NHOM[lo.pax_group as keyof typeof NHAN_NHOM]} · ${cau.length} vé` }, "changes() > 0"));
        await env.DB.batch(cau);
      }
      const chuaLuu = await datVeVaoKho(env.DB, kho, { batchId: loId, ve: chuanBi, luc: () => new Date().toISOString() });
      const dem = await demVeCuaLo(env.DB, loId);
      return json({
        loId,
        themDuoc: chuanBi.length - chuaLuu > 0 ? chuanBi.length - chuaLuu : 0,
        chuaLuuVaoKho: chuaLuu,
        loai: loi.sort((a, b) => a.thuTu - b.thuTu),
        veTrongLo: dem.daLuu,
        veDaNhap: moi.map((h) => ({ maVeCuoi: che4SoCuoi(h.ma), tuNgay: h.tuNgay, denNgay: h.denNgay })),
      });
    }),

    // Đưa lô vào kho (PENDING → ACTIVE): chỉ khi lô có ít nhất một vé đã lưu kho.
    route("POST", "/api/ve/lo/:id/xac-nhan", "office", async ({ env, params, staff }) => {
      if (!can(staff, "ve.kho.manage")) return KHONG_QUYEN();
      const loId = params.id ?? "";
      if (!UUID_RE.test(loId)) return KHONG_THAY();
      const lo = await docLo(env.DB, loId);
      if (!lo) return KHONG_THAY();
      const at = new Date().toISOString();
      const kq = await env.DB.batch([
        cauKichHoatLo(env.DB, loId, at, staff.id),
        auditStatement(env.DB, { staffId: staff.id, action: "ve_xac_nhan_lo", at, targetType: "ve", targetId: lo.catalog_code, detail: `Đưa lô vé vào kho · ${NHAN_NHOM[lo.pax_group as keyof typeof NHAN_NHOM]}` }, "changes() > 0"),
      ]);
      if ((kq[0]?.meta?.changes ?? 0) === 0) return error(409, "batch_not_ready", "Lô chưa có vé nào lưu được vào kho, hoặc đã được đưa vào kho trước đó.");
      return json({ loId, trangThai: "ACTIVE", veTrongLo: (await demVeCuaLo(env.DB, loId)).daLuu });
    }),

    // Sửa dịch vụ (mã tour) của lô — chỉ khi CHƯA vé nào của lô được giữ chỗ (trigger vdt_batch_code_locked canh ở cơ sở dữ liệu).
    route("POST", "/api/ve/lo/:id/sua-ma-tour", "office", async ({ request, env, params, staff }) => {
      if (!can(staff, "ve.kho.manage")) return KHONG_QUYEN();
      const loId = params.id ?? "";
      if (!UUID_RE.test(loId)) return KHONG_THAY();
      const raw = await readJson(request);
      const ma = typeof raw?.catalogCode === "string" ? raw.catalogCode.trim() : "";
      if (!raw || ma.length < 1 || ma.length > 40) return BAD_JSON();
      const lo = await docLo(env.DB, loId);
      if (!lo) return KHONG_THAY();
      if (!(await getEffectiveServices(env.DB, [ma])).has(ma)) return error(400, "invalid_input", "Dịch vụ không có trong danh mục.");
      const at = new Date().toISOString();
      try {
        await env.DB.batch([
          cauSuaMaTour(env.DB, loId, ma, at, staff.id),
          auditStatement(env.DB, { staffId: staff.id, action: "ve_sua_ma_tour", at, targetType: "ve", targetId: ma, detail: `Sửa dịch vụ của lô vé · ${NHAN_NHOM[lo.pax_group as keyof typeof NHAN_NHOM]}` }, "changes() > 0"),
        ]);
      } catch (e) {
        if (e instanceof Error && /vdt_one_way/.test(e.message)) return error(409, "batch_in_use", "Lô này đã có vé được giữ chỗ cho đơn nên không đổi dịch vụ được. Hãy vô hiệu lô và nhập lại.");
        throw e;
      }
      return json({ loId, catalogCode: ma });
    }),
  ],
};
