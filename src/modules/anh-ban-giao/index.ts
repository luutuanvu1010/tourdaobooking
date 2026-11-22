// Module anh-ban-giao — «Ảnh bàn giao» (ADR-0232, accepted 2026-11-22; migration 0190; kho R2 binding ANH_BAN_GIAO). Module NGHIÊM, tiền tố bảng abg_.
// Route nằm dưới /api/anh-ban-giao/* — NGOÀI cổng đơn (tài xế công ty phải vào được mà không mở cổng đơn cho tài xế, ADR-0232 Đ1). Mỗi route hỏi ô của Đ4.
// Không import dispatch / van-chuyen / parties: «người phụ trách» (ctx.isAssigned), «tài xế của chuyến» (ctx.taiXeLaiChang), số năm giữ (ctx.soNamGiuAnh) do gốc
// lắp ráp tiêm. Nội dung ảnh, ghi chú, lý do ẩn, khoá kho KHÔNG vào nhật ký (chi tiết nhật ký chỉ mã ảnh 8 ký tự). Thứ tự xem: ô → nhật ký → đọc kho (Hiến chương 5.22).
import { auditStatement } from "../audit";
import { can } from "../../shared/permissions";
import { UUID_RE, error, json, readJson } from "../../shared/http";
import { route, type AppModule } from "../../shared/router";
import { TEP_MOI_GIO, bamSha256, dauPhanHoiTepChung, taoKhoaNgauNhien, CHUA_TAI_DUOC_SAU_MS } from "../../shared/tep-dinh-kem";
import {
  LY_DO_GO_ANH, TOI_DA_THAN_ANH_BAN_GIAO, CAU_QUA_CO_ANH, hanGiuAnh, kiemAnhBanGiao, kiemLyDoAnh,
  type AnhBanGiaoDanhSachResponse, type AnhBanGiaoTomTatResponse, type AnhBanGiaoChoXoaResponse, type LoaiViec,
} from "../../shared/anh-ban-giao";
import {
  anAnhStatement, anhChoXoa, anhCuaDon, anhTheoId, chenAnhStatement, chenYeuCauStatement, danhDauYeuCauStatement, demAnhGanDay, goTheoPhieuStatements, khoCuaPhieu,
  phieuDangCho, quyetGoStatement, trangThaiDon,
} from "./repository";
import { datAnh, docAnh, xoaAnhKhoiKho } from "./kho-anh";
import { maBase64 } from "../../shared/tep-hien-thi";

const KHONG_CO = () => error(404, "not_found", "Không tìm thấy ảnh bàn giao.");
const KHONG_CO_DON = () => error(404, "not_found", "Không tìm thấy đơn.");
const KHO_TAT = () => error(503, "storage_unavailable", "Kho ảnh bàn giao chưa sẵn sàng. Hãy báo quản trị kỹ thuật.");
const KHONG_TAI = () => error(403, "forbidden", "Bạn không được gửi ảnh bàn giao cho đơn này.");
const KHONG_XEM = () => error(403, "forbidden", "Bạn không được xem ảnh bàn giao của đơn này.");
const CHI_TOAN_QUYEN = () => error(403, "forbidden", "Chỉ Toàn quyền được làm việc này.");
const DON_CHUA_XAC_NHAN = () => error(409, "order_not_confirmed", "Chỉ gửi được ảnh bàn giao cho đơn đã xác nhận, chưa huỷ.");
const CHUA_CO_CHINH_SACH = () => error(409, "no_photo_policy", "Chưa gửi được ảnh bàn giao: chính sách riêng tư đang hiệu lực chưa ghi thời hạn giữ ảnh. Hãy báo Toàn quyền.");
const QUA_TRAN_GIO = () => error(429, "rate_limited", "Ảnh chưa được gửi: bạn đã gửi quá 20 ảnh bàn giao trong một giờ. Chờ khoảng một giờ rồi gửi lại.");
const TRANG_KHAC = () => error(403, "forbidden", "Chỉ mở được ảnh từ trang của Nền tảng.");

/** Cửa sổ trần ảnh / giờ — cùng cách đếm với trigger abg_photo_rate_ins. */
const dauCuaSo = (now: Date): string => new Date(now.getTime() - 60 * 60 * 1000).toISOString();
const ma8 = (id: string) => id.slice(0, 8);
/** Lỗi trigger của lô chèn ảnh (lô thua): dịch sang mã HTTP, không 5xx. */
function loiTrigger(e: unknown): Response | null {
  const m = e instanceof Error ? e.message : String(e);
  if (/\bphoto_rate_limited:/.test(m)) return QUA_TRAN_GIO();
  if (/\bphoto_order_full:/.test(m)) return error(409, "order_full", "Đơn này đã có đủ 30 ảnh bàn giao.");
  if (/\bphoto_order_not_confirmed:/.test(m)) return DON_CHUA_XAC_NHAN();
  if (/\bphoto_target_mismatch:/.test(m)) return error(400, "invalid_input", "Dịch vụ hoặc lượt đón không thuộc đơn này.");
  if (/\bphoto_retention_hold:/.test(m)) return error(409, "retention_hold", "Ảnh này chưa tới hạn giữ nên chưa xoá được.");
  return null;
}

/** Câu của gốc lắp ráp gộp vào lô Thực hiện phiếu xoá của parties (ADR-0232 Đ7, biến thể 7B). Có lính gác cùng lô. */
export function cauXoaAnhTheoPhieu(db: D1Database, phieuId: string, at: string, by: string): D1PreparedStatement[] {
  return goTheoPhieuStatements(db, { phieuId, at, by });
}
/** SAU lô Thực hiện phiếu: xoá đối tượng R2 của các ảnh vừa quyết gỡ. Không ném (dòng còn «chờ xoá» nếu kho lỗi). */
export async function xoaKhoAnhTheoPhieu(db: D1Database, kho: R2Bucket | undefined, phieuId: string): Promise<void> {
  if (!kho) return;
  try {
    await xoaAnhKhoiKho(db, kho, await khoCuaPhieu(db, phieuId), () => new Date().toISOString());
  } catch (e) {
    console.error(JSON.stringify({ level: "error", event: "anh_ban_giao_xoa_theo_phieu_loi", loi: e instanceof Error ? e.name : "unknown" }));
  }
}

export const anhBanGiaoModule: AppModule = {
  name: "anh-ban-giao",
  routes: [
    // TẢI (Đ5): cỡ thân TRƯỚC khi đọc → mã đơn → đơn có thật (404) → đã xác nhận (409) → thân (luật thuần: 400/413/415) → ô order.photo.upload với assigned =
    // người phụ trách đơn HOẶC tài xế đang lái chuyến chở lượt đón đã chọn (403) → chính sách có số năm (409) → kho (503) → trần giờ (429) → MỘT lô: dòng ảnh +
    // nhật ký chỉ mã → đặt hai đối tượng R2 SAU lô (lỗi không ném — dòng ở «tải dở dang»).
    route("POST", "/api/anh-ban-giao/don/:orderId", "staff", async ({ env, request, params, staff, isAssigned, taiXeLaiChang, soNamGiuAnh }) => {
      if (Number(request.headers.get("content-length") ?? "0") > TOI_DA_THAN_ANH_BAN_GIAO) return error(413, "payload_too_large", CAU_QUA_CO_ANH);
      const orderId = params.orderId!;
      if (!UUID_RE.test(orderId)) return KHONG_CO_DON();
      const st = await trangThaiDon(env.DB, orderId);
      if (st === null) return KHONG_CO_DON();
      if (st !== "confirmed") return DON_CHUA_XAC_NHAN();
      const k = kiemAnhBanGiao(await readJson(request));
      if (!k.ok) return error(k.status, k.code, k.message);
      const [phuTrach, laiChang] = await Promise.all([isAssigned(orderId), k.value.changId ? taiXeLaiChang(k.value.changId) : Promise.resolve(false)]);
      if (!can(staff, "order.photo.upload", { assigned: phuTrach || laiChang })) return KHONG_TAI();
      const soNam = await soNamGiuAnh();
      if (soNam === null) return CHUA_CO_CHINH_SACH();
      const kho = env.ANH_BAN_GIAO;
      if (!kho) return KHO_TAT();
      const now = new Date();
      if ((await demAnhGanDay(env.DB, staff.id, dauCuaSo(now))) >= TEP_MOI_GIO) return QUA_TRAN_GIO();
      const id = crypto.randomUUID();
      const at = now.toISOString();
      try {
        await env.DB.batch([
          chenAnhStatement(env.DB, {
            id, orderId, dichVuId: k.value.dichVuId, changId: k.value.changId, loaiViec: k.value.loaiViec, ghiChu: k.value.ghiChu, khoaNho: taoKhoaNgauNhien("abg"),
            khoaXem: taoKhoaNgauNhien("abg"), coNho: k.value.nho.length, coXem: k.value.xem.length, bam: await bamSha256(k.value.xem), hanGiu: hanGiuAnh(at, soNam), at, by: staff.id,
          }),
          auditStatement(env.DB, { orderId, staffId: staff.id, action: "handover_photo_added", at, detail: `ảnh ${ma8(id)}` }, "changes() > 0"),
        ]);
      } catch (e) {
        const r = loiTrigger(e);
        if (r) return r;
        throw e;
      }
      const daLuu = await datAnh(env.DB, kho, { anhId: id, nho: k.value.nho, xem: k.value.xem, luc: () => new Date().toISOString() });
      return json({ ok: true, id, daLuu }, 201);
    }),

    // TÓM TẮT cho nút ở trang đơn: số ảnh người gọi xem được + có được gửi không. KHÔNG nội dung ảnh ⇒ không nhật ký. Không xem, không gửi được ⇒ 403.
    route("GET", "/api/anh-ban-giao/don/:orderId/tom-tat", "staff", async ({ env, params, staff, isAssigned, soNamGiuAnh }) => {
      const orderId = params.orderId!;
      if (!UUID_RE.test(orderId)) return KHONG_CO_DON();
      const [st, phuTrach] = await Promise.all([trangThaiDon(env.DB, orderId), isAssigned(orderId)]);
      if (st === null) return KHONG_CO_DON();
      const duocTai = can(staff, "order.photo.upload", { assigned: phuTrach });
      const xemMoi = can(staff, "order.photo.view");
      const xemCuaMinh = can(staff, "order.photo.view", { ownerId: staff.id });
      if (!duocTai && !xemCuaMinh) return KHONG_XEM();
      const ds = await anhCuaDon(env.DB, orderId);
      const thayAn = can(staff, "order.photo.hide");
      const soAnh = ds.filter((r) => r.stored_at !== null && (r.hidden_at === null || thayAn) && (xemMoi || r.created_by === staff.id)).length;
      const coTheTai = duocTai && st === "confirmed" && (await soNamGiuAnh()) !== null && Boolean(env.ANH_BAN_GIAO);
      return json({ soAnh, coTheTai } satisfies AnhBanGiaoTomTatResponse);
    }),

    // DANH SÁCH kèm ảnh nhỏ (Đ6): mỗi lượt mở ghi MỘT dòng nhật ký nêu các mã ảnh, TRƯỚC khi đọc kho. Ảnh đã ẩn chỉ người giữ ô ẩn thấy (có nhãn).
    route("GET", "/api/anh-ban-giao/don/:orderId", "staff", async ({ env, request, params, staff, nhanNhanVien }) => {
      const sfs = request.headers.get("sec-fetch-site");
      if (sfs !== null && sfs !== "same-origin" && sfs !== "none") return TRANG_KHAC();
      const orderId = params.orderId!;
      if (!UUID_RE.test(orderId)) return KHONG_CO_DON();
      if ((await trangThaiDon(env.DB, orderId)) === null) return KHONG_CO_DON();
      if (!can(staff, "order.photo.view", { ownerId: staff.id })) return KHONG_XEM();
      const kho = env.ANH_BAN_GIAO;
      if (!kho) return KHO_TAT();
      const thayAn = can(staff, "order.photo.hide");
      const ds = (await anhCuaDon(env.DB, orderId)).filter(
        (r) => r.stored_at !== null && (r.hidden_at === null || thayAn) && can(staff, "order.photo.view", { ownerId: r.created_by }),
      );
      if (ds.length > 0) {
        await env.DB.batch([
          auditStatement(env.DB, { orderId, staffId: staff.id, action: "handover_photo_list_viewed", at: new Date().toISOString(), detail: `ảnh ${ds.map((r) => ma8(r.id)).join(", ")}` }),
        ]);
      }
      const ten = (await nhanNhanVien([...new Set(ds.map((r) => r.created_by))])) ?? new Map<string, string>();
      const anh = await Promise.all(ds.map(async (r) => {
        const obj = await docAnh(kho, r.thumb_key);
        const anhNho = obj ? maBase64(new Uint8Array(await obj.arrayBuffer())) : null;
        if (!obj) console.error(JSON.stringify({ level: "error", event: "anh_ban_giao_thieu_doi_tuong", anhId: r.id }));
        return {
          id: r.id, loaiViec: r.task_kind as LoaiViec, ghiChu: r.note, dichVuId: r.order_service_id, changId: r.transfer_leg_id, nguoiTai: ten.get(r.created_by) ?? null,
          luc: r.created_at, daAn: r.hidden_at !== null, anhNho,
        };
      }));
      return json({ anh, coTheAn: thayAn, coTheXoa: can(staff, "order.photo.purge") } satisfies AnhBanGiaoDanhSachResponse);
    }),

    // XEM ẢNH LỚN (Đ6): sec-fetch-site → 503 kho → mã → ảnh có thật, đã lưu, chưa gỡ (mọi cách hỏng ⇒ CÙNG một 404; ảnh đã ẩn ⇒ 404 với người không giữ ô ẩn)
    // → ô order.photo.view với ownerId = người tải (403) → GHI NHẬT KÝ chỉ mã → đọc kho → thân + no-store, nosniff, CSP sandbox.
    route("GET", "/api/anh-ban-giao/anh/:anhId", "staff", async ({ env, request, params, staff }) => {
      const sfs = request.headers.get("sec-fetch-site");
      if (sfs !== null && sfs !== "same-origin" && sfs !== "none") return TRANG_KHAC();
      const kho = env.ANH_BAN_GIAO;
      if (!kho) return KHO_TAT();
      const anhId = params.anhId!;
      if (!UUID_RE.test(anhId)) return KHONG_CO();
      const a = await anhTheoId(env.DB, anhId);
      if (!a || a.stored_at === null || a.purged_at !== null || (a.hidden_at !== null && !can(staff, "order.photo.hide"))) return KHONG_CO();
      if (!can(staff, "order.photo.view", { ownerId: a.created_by })) return KHONG_XEM();
      await env.DB.batch([auditStatement(env.DB, { orderId: a.order_id, staffId: staff.id, action: "handover_photo_viewed", at: new Date().toISOString(), detail: `ảnh ${ma8(a.id)}` })]);
      const obj = await docAnh(kho, a.view_key);
      if (!obj) {
        console.error(JSON.stringify({ level: "error", event: "anh_ban_giao_thieu_doi_tuong", anhId: a.id }));
        return KHONG_CO();
      }
      return new Response(obj.body, { status: 200, headers: dauPhanHoiTepChung({ id: a.id, loai: "jpg", tenDau: "anh-ban-giao" }) });
    }),

    // ẨN (Đ7): chỉ Toàn quyền, BẮT BUỘC lý do (lý do nằm ở dòng ảnh; nhật ký chỉ mã). Một chiều; tệp vẫn ở kho.
    route("POST", "/api/anh-ban-giao/anh/:anhId/an", "office", async ({ env, request, params, staff }) => {
      if (!can(staff, "order.photo.hide")) return CHI_TOAN_QUYEN();
      const anhId = params.anhId!;
      if (!UUID_RE.test(anhId)) return KHONG_CO();
      const lyDo = kiemLyDoAnh((await readJson(request))?.lyDo);
      if (!lyDo) return error(400, "invalid_input", "Ghi lý do ẩn (từ 3 đến 300 ký tự).");
      const a = await anhTheoId(env.DB, anhId);
      if (!a || a.purged_at !== null) return KHONG_CO();
      const DA_AN = () => error(409, "conflict", "Ảnh này đã được ẩn.");
      if (a.hidden_at !== null) return DA_AN();
      const at = new Date().toISOString();
      const res = await env.DB.batch([
        anAnhStatement(env.DB, { id: a.id, at, by: staff.id, lyDo }),
        auditStatement(env.DB, { orderId: a.order_id, staffId: staff.id, action: "handover_photo_hidden", at, detail: `ảnh ${ma8(a.id)}` }, "changes() > 0"),
      ]);
      if ((res[0]?.meta.changes ?? 0) === 0) return DA_AN();
      return json({ ok: true });
    }),

    // XOÁ (Đ7, Đ8; chỉ Toàn quyền, ô order.photo.purge). Thân `{ lyDo, ghiChu, nguon?, phieuId? }`:
    //  - GIAY_TO_CHUP_NHAM (Đ8) / HET_HAN (sau hạn giữ): quyết gỡ ngay; ghiChu bắt buộc (3–300 ký tự, vào nhật ký tối đa 200 ký tự như khuôn gỡ biên lai).
    //  - XOA_THEO_YEU_CAU + nguon KHACH (khách không tài khoản): một lô chèn yêu cầu (ghiChu = kênh, cách xác minh — KHÔNG vào nhật ký) + quyết gỡ ngay.
    //  - XOA_THEO_YEU_CAU + nguon PHIEU + phieuId (phiếu ADR-0126 còn chờ): chỉ ĐÁNH DẤU — ảnh bị gỡ trong lô Thực hiện phiếu của parties.
    // Trigger hạn giữ quyết lý do nào qua được (409 retention_hold). Gỡ xong thì xoá kho SAU lô (lỗi không ném — dòng «chờ xoá»).
    route("POST", "/api/anh-ban-giao/anh/:anhId/xoa", "office", async ({ env, request, params, staff }) => {
      if (!can(staff, "order.photo.purge")) return CHI_TOAN_QUYEN();
      const kho = env.ANH_BAN_GIAO;
      if (!kho) return KHO_TAT();
      const anhId = params.anhId!;
      if (!UUID_RE.test(anhId)) return KHONG_CO();
      const body = await readJson(request);
      const lyDo = body?.lyDo;
      const ghiChu = kiemLyDoAnh(body?.ghiChu);
      if (lyDo !== "GIAY_TO_CHUP_NHAM" && lyDo !== "HET_HAN" && lyDo !== "XOA_THEO_YEU_CAU") return error(400, "invalid_input", "Chọn lý do xoá ảnh.");
      if (!ghiChu) return error(400, "invalid_input", "Ghi rõ lý do hoặc nguồn yêu cầu (từ 3 đến 300 ký tự).");
      const a = await anhTheoId(env.DB, anhId);
      if (!a || a.purged_at !== null) return KHONG_CO();
      if (a.stored_at === null) return error(409, "uploading", "Ảnh này đang được tải lên. Thử lại sau ít phút.");
      const at = new Date().toISOString();
      if (lyDo === "XOA_THEO_YEU_CAU" && body?.nguon === "PHIEU") {
        const phieuId = typeof body.phieuId === "string" && UUID_RE.test(body.phieuId) ? body.phieuId : null;
        if (!phieuId || !(await phieuDangCho(env.DB, phieuId))) return error(409, "erasure_ticket_not_pending", "Phiếu yêu cầu xoá không còn chờ xử lý.");
        if (a.erasure_request_id !== null) return error(409, "conflict", "Ảnh này đã được đánh dấu vào một yêu cầu xoá.");
        const yc = crypto.randomUUID();
        const res = await env.DB.batch([
          chenYeuCauStatement(env.DB, { id: yc, nguon: "PHIEU", phieuId, ghiChu: null, xongLuc: null, at, by: staff.id }),
          danhDauYeuCauStatement(env.DB, { id: a.id, yeuCauId: yc, at, by: staff.id }),
          auditStatement(env.DB, { orderId: a.order_id, staffId: staff.id, action: "handover_photo_erasure_marked", at, detail: `ảnh ${ma8(a.id)} · phiếu ${ma8(phieuId)}` }, "changes() > 0"),
        ]);
        if ((res[1]?.meta.changes ?? 0) === 0) return error(409, "conflict", "Ảnh vừa thay đổi — tải lại rồi thử lại.");
        return json({ ok: true, daDanhDau: true });
      }
      if (lyDo === "XOA_THEO_YEU_CAU" && body?.nguon !== "KHACH") return error(400, "invalid_input", "Chọn nguồn yêu cầu xoá: phiếu của người có tài khoản, hoặc khách báo qua kênh liên hệ.");
      const yc = lyDo === "XOA_THEO_YEU_CAU" ? crypto.randomUUID() : null;
      const lo: D1PreparedStatement[] = [];
      if (yc) lo.push(chenYeuCauStatement(env.DB, { id: yc, nguon: "KHACH", phieuId: null, ghiChu, xongLuc: at, at, by: staff.id }));
      lo.push(quyetGoStatement(env.DB, { id: a.id, at, lyDo: LY_DO_GO_ANH[lyDo], by: staff.id, yeuCauId: yc }));
      lo.push(auditStatement(env.DB, {
        orderId: a.order_id, staffId: staff.id, action: "handover_photo_purged", at,
        detail: `ảnh ${ma8(a.id)} · ${lyDo === "XOA_THEO_YEU_CAU" ? "theo yêu cầu của khách" : lyDo === "HET_HAN" ? `hết hạn giữ · ${ghiChu.slice(0, 200)}` : `ảnh lọt giấy tờ · ${ghiChu.slice(0, 200)}`}`,
      }, "changes() > 0"));
      let res: D1Result[];
      try {
        res = await env.DB.batch(lo);
      } catch (e) {
        const r = loiTrigger(e);
        if (r) return r;
        throw e;
      }
      if ((res[yc ? 1 : 0]?.meta.changes ?? 0) === 0) return error(409, "conflict", "Ảnh này đã được xoá.");
      await xoaAnhKhoiKho(env.DB, kho, [{ id: a.id, thumb_key: a.thumb_key, view_key: a.view_key }], () => new Date().toISOString());
      return json({ ok: true });
    }),

    // HÀNG CHỜ (Hiến chương 5.16, 5.25): tải dở dang, chờ xoá kho, quá hạn giữ. Không khoá kho trong DTO. Chỉ Toàn quyền.
    route("GET", "/api/anh-ban-giao/cho-xoa", "office", async ({ env, staff }) => {
      if (!can(staff, "order.photo.purge")) return CHI_TOAN_QUYEN();
      const now = Date.now();
      const { ds, conNua } = await anhChoXoa(env.DB, new Date(now - CHUA_TAI_DUOC_SAU_MS).toISOString(), new Date(now).toISOString());
      return json({
        anh: ds.map((r) => ({
          id: r.id, orderId: r.order_id, luc: r.created_at, hanGiu: r.retain_until,
          trangThai: r.purged_at !== null ? ("CHO_XOA_KHO" as const) : r.stored_at === null ? ("TAI_DO_DANG" as const) : ("QUA_HAN" as const),
        })),
        conNua,
      } satisfies AnhBanGiaoChoXoaResponse);
    }),
    // CHẠY LẠI: ảnh tải dở dang quá CHUA_TAI_DUOC_SAU_MS ⇒ quyết gỡ TAI_LEN_LOI; ảnh đã quyết gỡ ⇒ xoá kho. Ảnh QUÁ HẠN không tự xoá (máy không tự ghi — 5.25):
    // Toàn quyền bấm xoá từng ảnh với lý do HET_HAN.
    route("POST", "/api/anh-ban-giao/cho-xoa/chay-lai", "office", async ({ env, staff }) => {
      if (!can(staff, "order.photo.purge")) return CHI_TOAN_QUYEN();
      const kho = env.ANH_BAN_GIAO;
      if (!kho) return KHO_TAT();
      const now = Date.now();
      const doDangTruoc = new Date(now - CHUA_TAI_DUOC_SAU_MS).toISOString();
      const { ds, conNua } = await anhChoXoa(env.DB, doDangTruoc, new Date(now).toISOString());
      const at = new Date(now).toISOString();
      const doDang = ds.filter((r) => r.purged_at === null && r.stored_at === null);
      const lo = doDang.map((r) => quyetGoStatement(env.DB, { id: r.id, at, lyDo: LY_DO_GO_ANH.TAI_LEN_LOI, by: staff.id, doDangTruoc }));
      const kq = lo.length > 0 ? await env.DB.batch(lo) : [];
      const vuaGo = new Set(doDang.filter((_, i) => (kq[i]?.meta.changes ?? 0) > 0).map((r) => r.id));
      const canXoa = ds.filter((r) => r.purged_at !== null || vuaGo.has(r.id));
      const x = await xoaAnhKhoiKho(env.DB, kho, canXoa, () => new Date().toISOString());
      await env.DB.batch([auditStatement(env.DB, { staffId: staff.id, action: "handover_photo_purge_retried", at, targetType: "system", targetId: "anh-ban-giao", detail: `xoá kho ${x.daXoa} · lỗi ${x.loi}` })]);
      return json({ ok: true, daXoa: x.daXoa, loi: x.loi, conNua });
    }),
  ],
};
