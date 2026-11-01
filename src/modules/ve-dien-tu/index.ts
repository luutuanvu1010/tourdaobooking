// Module ve-dien-tu — KHO VÉ ĐIỆN TỬ (ADR-0153, accepted 2026-10-31). Sở hữu `vdt_*`. Route: /api/ve*.
// Phụ thuộc: audit (nhật ký — chỉ số lượng và nhãn nhóm, KHÔNG BAO GIỜ mã vé), catalog (kiểm mã tour qua hàm công bố). Cạnh tới staff / thongbao / orders (chỉ đọc view)
// thêm khi dùng (ADR-0153 Đ1 mục 2). Chiều orders → ve-dien-tu KHÔNG có cạnh: gốc lắp ráp (src/index.ts) tiêm hàm cấp / trả vé vào ctx.
// Module khác CHỈ import từ file này.
import { auditStatement } from "../audit";
import { clearAttempts, reserveAttempts } from "../auth";
import { getEffectiveServices } from "../catalog";
import { UUID_RE, error, json, kemLocation, readJson } from "../../shared/http";
import { can } from "../../shared/permissions";
import { route, type AppModule } from "../../shared/router";
import { LOAI_NOI_DUNG, bamSha256, dauPhanHoiTepChung, giaiBase64, nhanLoaiTep, taoKhoaNgauNhien, type LoaiTep } from "../../shared/tep-dinh-kem";
import { vnToday } from "../../shared/vn-date";
import { canVe, thuDu } from "./rules.ts";
import { DANG_TOKEN, bamToken, hanDuongDan, soSanhHangThoiGian, taoToken, trangVeKhach } from "./duong-dan-khach.ts";
import { NHAN_NHOM, soanCapVe, soanTraVe, veDangGiu, type GhiNhatKy, type NhatKyVe } from "./cap-ve.ts";
import { datVeVaoKho, type VeChuanBi } from "./kho-tep.ts";
import { TOI_DA_VE_MOI_DOT, TOI_DA_VE_MOI_LO, che4SoCuoi, kiemLo, kiemVeMoi } from "./nhap-lo.ts";
import { cauChenLink, cauDemMoLink, cauThuHoiLink, docHanCuoiCuaDon, docLinkCuaDon, docLinkTheoBam, docLinkTheoId, docVeCuaLink, type LinkKhach, cauChenGiao, cauChenLo, cauChenVe, cauDanhDauLo, docChuDon, docPhanBoDeXem, docPhanBoMoCuaDon, cauKichHoatLo, cauSuaMaTour, demVeCuaLo, docLo, maVeDaCo, thongKeKho } from "./repository.ts";

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
/** Mã phân bổ do D1 sinh (`lower(hex(randomblob(16)))`), không phải UUID. */
const MA_PHAN_BO = /^[0-9a-f]{32}$/;
/** `vdt_ticket.content_kind` lưu kiểu MIME (khi nhập lô); đổi ngược về loại tệp cho `dauPhanHoiTepChung`. Không nhận ra ⇒ PNG (ảnh, không bao giờ loại chạy được). */
const loaiTuMime = (mime: string): LoaiTep => (LOAI_ANH.find((l) => LOAI_NOI_DUNG[l] === mime) ?? "png");
// ---- Đường dẫn khách: đầu phản hồi, 404 duy nhất, giới hạn tốc độ -----------------------------------------------------------------------------------------------
const DAU_KHACH = { "cache-control": "no-store", "x-content-type-options": "nosniff", "cross-origin-resource-policy": "same-origin", "referrer-policy": "no-referrer", "x-robots-tag": "noindex, nofollow" } as const;
/** MỘT thân, MỘT bộ đầu cho mọi lý do không thấy (sai token, hết hạn, thu hồi, vé ngoài khoảng) — không phân biệt được từ ngoài. */
const khongThayDuongDan = (): Response => new Response("Không tìm thấy.", { status: 404, headers: { ...DAU_KHACH, "content-type": "text/plain; charset=utf-8" } });
/** Giới hạn tốc độ chống dò token: mỗi lần gọi đặt chỗ theo địa chỉ và theo tổng; thành công thì TRẢ chỗ (chỉ lần sai tính). Vượt ⇒ 429 (không phân biệt token đúng / sai). */
const HAN_MUC_IP = 20;
const HAN_MUC_TONG = 400;
async function mocDuongDanKhach(env: Env, request: Request, token: string): Promise<{ loi: Response; link?: undefined; tra?: undefined } | { loi?: undefined; link: LinkKhach; tra: () => Promise<void> }> {
  const ip = (request.headers.get("cf-connecting-ip") ?? "khong-ro").slice(0, 64);
  const chan = await reserveAttempts(env.DB, [{ key: `vekhach:ip:${ip}`, max: HAN_MUC_IP }, { key: "vekhach:tong", max: HAN_MUC_TONG }]);
  if (!chan.allowed) return { loi: new Response("Thử lại sau ít phút.", { status: 429, headers: { ...DAU_KHACH, "content-type": "text/plain; charset=utf-8", "retry-after": String(chan.retryAfterSeconds) } }) };
  if (!DANG_TOKEN.test(token)) return { loi: khongThayDuongDan() };
  const bam = await bamToken(token);
  const link = await docLinkTheoBam(env.DB, bam);
  const hopLe = link !== null && soSanhHangThoiGian(link.token_hash, bam) && link.revoked_at === null && link.expires_at >= new Date().toISOString();
  if (!hopLe) return { loi: khongThayDuongDan() };
  return { link, tra: () => clearAttempts(env.DB, null, chan.ids) };
}
const DON_KHONG_THAY = () => error(404, "not_found", "Không tìm thấy đơn.");
const VE_KHONG_THAY = () => error(404, "not_found", "Không tìm thấy vé.");
const KHONG_QUYEN_GUI = () => error(403, "forbidden", "Bạn không có quyền xem hoặc gửi vé của đơn này.");
const CHUA_THU_DU = () => error(403, "chua_thu_du", "Đơn chưa thu đủ tiền nên chưa xem hoặc gửi được vé.");
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

    // DANH SÁCH VÉ CỦA ĐƠN (ADR-0153 Đ3): CHỈ số lượng theo nhóm khách (cần / đang giữ / thiếu) và cờ «đã thu đủ» — không ảnh, không mã. Theo ô `order.view` nên Kế toán cũng thấy.
    // Thứ tự: mã đơn → chủ đơn (view công bố của orders; không có ⇒ 404) → `can` (không đủ quyền ⇒ cùng 404, không lộ đơn có tồn tại) → dịch vụ + số khách hiệu lực → đếm vé giữ.
    route("GET", "/api/ve/don/:orderId", "office", async ({ env, staff, params, isAssigned, dichVuChoVe, tienDonVe }) => {
      const orderId = params.orderId!;
      if (!UUID_RE.test(orderId)) return DON_KHONG_THAY();
      const [chu, assigned] = await Promise.all([docChuDon(env.DB, orderId), isAssigned(orderId)]);
      if (chu === null || !can(staff, "order.view", { ownerId: chu, assigned })) return DON_KHONG_THAY();
      const dv = await dichVuChoVe(orderId);
      const dichVu = [];
      for (const d of dv) {
        const can_ = canVe(d.pax);
        const giu = await veDangGiu(env.DB, d.serviceId);
        const nhom = (["ADULT", "CHILD", "SENIOR"] as const).filter((n) => can_[n] > 0 || giu[n] > 0).map((n) => ({ nhom: n, nhan: NHAN_NHOM[n], can: can_[n], giu: giu[n], thieu: Math.max(0, can_[n] - giu[n]) }));
        dichVu.push({ serviceId: d.serviceId, catalogCode: d.catalogCode, nhom });
      }
      const duongDan = (await docLinkCuaDon(env.DB, orderId)).map((l) => ({ id: l.id, hetHan: l.expires_at, daThuHoi: l.revoked_at !== null, luotMo: l.opened_count })); // KHÔNG token (chỉ lưu băm)
      const du = thuDu(await tienDonVe(orderId));
      // Mã phân bổ (KHÔNG phải mã vé) để giao diện gọi route ảnh — chỉ khi người xem có ô gửi vé VÀ đơn thu đủ; route ảnh vẫn kiểm lại cả hai.
      const veXem = du && can(staff, "ve.cap.send", { ownerId: chu, assigned }) ? (await docPhanBoMoCuaDon(env.DB, orderId, null)).map((id, i) => ({ id, stt: i + 1 })) : [];
      return json({ dichVu, thuDu: du, duongDan, veXem });
    }),

    // ẢNH VÉ (ADR-0153 Đ3): chỉ khi đơn THU ĐỦ. Thứ tự cố định (bài khoá thứ tự ở xem-giao-ve.test.ts): sec-fetch-site → kho → mã → phân bổ → chủ đơn → `can(ve.cap.send)` → thu đủ
    // → NHẬT KÝ + đóng dấu «đã lộ» (một lô) → mới đọc kho. Mọi cách hỏng trước nhật ký ⇒ không đọc kho. Đóng dấu `revealed_at` ngay lần đầu để vé đã lộ không bao giờ về kho (Đ1 mục 6).
    route("GET", "/api/ve/anh/:allocationId", "office", async ({ request, env, staff, params, isAssigned, tienDonVe }) => {
      const sfs = request.headers.get("sec-fetch-site");
      if (sfs !== null && sfs !== "same-origin" && sfs !== "none") return error(403, "forbidden", "Không mở ảnh vé từ trang khác.");
      const kho = env.VE_DIEN_TU;
      if (!kho) return KHO_CHUA_BAT();
      const id = params.allocationId!;
      if (!MA_PHAN_BO.test(id)) return VE_KHONG_THAY();
      const pb = await docPhanBoDeXem(env.DB, id);
      if (!pb) return VE_KHONG_THAY();
      const [chu, assigned] = await Promise.all([docChuDon(env.DB, pb.order_id), isAssigned(pb.order_id)]);
      if (chu === null) return VE_KHONG_THAY();
      if (!can(staff, "ve.cap.send", { ownerId: chu, assigned })) return KHONG_QUYEN_GUI();
      if (!thuDu(await tienDonVe(pb.order_id))) return CHUA_THU_DU();
      const at = new Date().toISOString();
      await env.DB.batch([
        auditStatement(env.DB, { staffId: staff.id, action: "ve_xem_anh", at, orderId: pb.order_id, targetType: "ve", targetId: pb.order_service_id, detail: `Xem ảnh vé số ${pb.slot_no}` }),
        cauDanhDauLo(env.DB, pb.id, at, staff.id),
      ]);
      const obj = await kho.get(pb.storage_key);
      if (!obj) {
        console.error(JSON.stringify({ level: "error", event: "ve_dien_tu_thieu_doi_tuong", allocId: pb.id }));
        return VE_KHONG_THAY();
      }
      return new Response(obj.body, { status: 200, headers: dauPhanHoiTepChung({ id: pb.id, loai: loaiTuMime(pb.content_kind), tenDau: "ve" }) });
    }),

    // GIAO VÉ (kênh Zalo; ADR-0153 Đ3): ghi MỖI vé một lần giao + đóng dấu «đã lộ» + một dòng nhật ký (số lượng). `requestId` do giao diện sinh mỗi lần bấm: bấm đúp cùng mã thì
    // `INSERT OR IGNORE` bỏ qua và nhật ký (gác `changes() > 0`) không ghi lần hai. Phản hồi chỉ có SỐ vé, không mã. Việc gửi tin Zalo là của nhân viên (ảnh lấy từ route ảnh).
    route("POST", "/api/ve/giao", "office", async ({ env, request, staff, isAssigned, tienDonVe }) => {
      const raw = await readJson(request);
      const orderId = typeof raw?.orderId === "string" ? raw.orderId : "";
      const requestId = typeof raw?.requestId === "string" ? raw.requestId : "";
      const serviceId = typeof raw?.serviceId === "string" ? raw.serviceId : null;
      if (!UUID_RE.test(orderId) || !UUID_RE.test(requestId) || (serviceId !== null && !UUID_RE.test(serviceId))) return BAD_JSON();
      const [chu, assigned] = await Promise.all([docChuDon(env.DB, orderId), isAssigned(orderId)]);
      if (chu === null) return DON_KHONG_THAY();
      if (!can(staff, "ve.cap.send", { ownerId: chu, assigned })) return KHONG_QUYEN_GUI();
      if (!thuDu(await tienDonVe(orderId))) return CHUA_THU_DU();
      const ds = await docPhanBoMoCuaDon(env.DB, orderId, serviceId);
      if (ds.length === 0) return json({ daGiao: 0 });
      const at = new Date().toISOString();
      const cau: D1PreparedStatement[] = [];
      ds.forEach((a, i) => {
        cau.push(cauChenGiao(env.DB, { id: `${requestId}:${a}`, allocId: a, by: staff.id, at, kenh: "ZALO" }));
        if (i === 0) cau.push(auditStatement(env.DB, { staffId: staff.id, action: "ve_giao", at, orderId, targetType: "ve", targetId: serviceId ?? orderId, detail: `Giao ${ds.length} vé qua Zalo` }, "changes() > 0"));
        cau.push(cauDanhDauLo(env.DB, a, at, staff.id));
      });
      await env.DB.batch(cau);
      return json({ daGiao: ds.length });
    }),

    // TẠO ĐƯỜNG DẪN CHO KHÁCH (ADR-0153 Đ2): chỉ khi đơn thu đủ và đã có vé. Token trả ĐÚNG MỘT LẦN, D1 chỉ lưu băm. Hạn = ngày dùng cuối của vé + 7 ngày. Đường dẫn là lộ vé ra ngoài
    // vĩnh viễn nên đóng dấu «đã lộ» cho mọi vé của đơn ngay lúc tạo (vé đã lộ không bao giờ về kho). Một lô: đường dẫn → nhật ký (chỉ số vé + hạn) → dấu lộ từng vé.
    route("POST", "/api/ve/duong-dan", "office", async ({ env, request, staff, isAssigned, tienDonVe }) => {
      const raw = await readJson(request);
      const orderId = typeof raw?.orderId === "string" ? raw.orderId : "";
      if (!UUID_RE.test(orderId)) return BAD_JSON();
      const [chu, assigned] = await Promise.all([docChuDon(env.DB, orderId), isAssigned(orderId)]);
      if (chu === null) return DON_KHONG_THAY();
      if (!can(staff, "ve.cap.send", { ownerId: chu, assigned })) return KHONG_QUYEN_GUI();
      if (!thuDu(await tienDonVe(orderId))) return CHUA_THU_DU();
      const [den, ds] = await Promise.all([docHanCuoiCuaDon(env.DB, orderId), docPhanBoMoCuaDon(env.DB, orderId, null)]);
      if (den === null || ds.length === 0) return error(409, "chua_co_ve", "Đơn chưa được giữ vé nào nên chưa tạo được đường dẫn cho khách.");
      const token = taoToken();
      const hetHan = hanDuongDan(den);
      const at = new Date().toISOString();
      const id = crypto.randomUUID();
      await env.DB.batch([
        cauChenLink(env.DB, { id, orderId, bam: await bamToken(token), hetHan, at, by: staff.id }),
        auditStatement(env.DB, { staffId: staff.id, action: "ve_tao_duong_dan", at, orderId, targetType: "ve", targetId: orderId, detail: `Tạo đường dẫn vé cho khách · ${ds.length} vé · hạn ${hetHan.slice(0, 10)}` }),
        ...ds.map((a) => cauDanhDauLo(env.DB, a, at, staff.id)),
      ]);
      return json({ id, duongDan: `/ve/${token}`, hetHan });
    }),

    route("POST", "/api/ve/duong-dan/:id/thu-hoi", "office", async ({ env, staff, params, isAssigned }) => {
      const id = params.id!;
      if (!UUID_RE.test(id)) return VE_KHONG_THAY();
      const link = await docLinkTheoId(env.DB, id);
      if (!link) return VE_KHONG_THAY();
      const [chu, assigned] = await Promise.all([docChuDon(env.DB, link.order_id), isAssigned(link.order_id)]);
      if (chu === null) return VE_KHONG_THAY();
      if (!can(staff, "ve.cap.send", { ownerId: chu, assigned })) return KHONG_QUYEN_GUI();
      const at = new Date().toISOString();
      await env.DB.batch([
        cauThuHoiLink(env.DB, id, at, staff.id),
        auditStatement(env.DB, { staffId: staff.id, action: "ve_thu_hoi_duong_dan", at, orderId: link.order_id, targetType: "ve", targetId: link.order_id, detail: "Thu hồi đường dẫn vé của khách" }, "changes() > 0"),
      ]);
      return json({ ok: true });
    }),

    // HAI ROUTE CÔNG KHAI CHỈ ĐỌC (ADR-0153 Đ2). Cùng một khuôn: giới hạn tốc độ (đặt chỗ TRƯỚC khi tra; thành công thì trả chỗ nên chỉ lần SAI mới tính) → tra theo BĂM token
    // → so băm hằng thời gian → hạn / thu hồi. Sai, hết hạn, thu hồi, vé ngoài khoảng: CÙNG một 404 (cùng thân, cùng đầu). Trang không script, không tên khách / mã đơn / giá / mã vé.
    route("GET", "/ve/:token", "public", async ({ env, request, params }) => {
      const kq = await mocDuongDanKhach(env, request, params.token!);
      if (kq.loi) return kq.loi;
      const ve = await docVeCuaLink(env.DB, kq.link.order_id);
      if (ve.length === 0) return khongThayDuongDan();
      const at = new Date().toISOString();
      await env.DB.batch([cauDemMoLink(env.DB, kq.link.id, at), ...ve.map((v) => cauDanhDauLo(env.DB, v.id, at, null))]);
      await kq.tra();
      const html = trangVeKhach(params.token!, ve.map((v, i) => ({ slot: i + 1, nhom: v.pax_group as "ADULT" | "CHILD" | "SENIOR", tuNgay: v.valid_from, denNgay: v.valid_to })));
      return new Response(html, { status: 200, headers: { ...DAU_KHACH, "content-type": "text/html; charset=utf-8", "content-security-policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'" } });
    }),

    route("GET", "/api/ve-khach/:token/anh/:slot", "public", async ({ env, request, params }) => {
      const kho = env.VE_DIEN_TU;
      if (!kho) return khongThayDuongDan();
      const kq = await mocDuongDanKhach(env, request, params.token!);
      if (kq.loi) return kq.loi;
      const slot = /^[1-9][0-9]{0,2}$/.test(params.slot!) ? Number(params.slot) : 0;
      const ve = await docVeCuaLink(env.DB, kq.link.order_id);
      const v = slot >= 1 ? ve[slot - 1] : undefined;
      if (!v) return khongThayDuongDan();
      const at = new Date().toISOString();
      await env.DB.batch([cauDanhDauLo(env.DB, v.id, at, null)]);
      const obj = await kho.get(v.storage_key);
      if (!obj) return khongThayDuongDan();
      await kq.tra();
      return new Response(obj.body, { status: 200, headers: { ...dauPhanHoiTepChung({ id: v.id, loai: loaiTuMime(v.content_kind), tenDau: "ve" }) } });
    }),
  ],
};
