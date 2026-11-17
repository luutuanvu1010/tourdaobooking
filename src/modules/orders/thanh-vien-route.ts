// ROUTE «chờ người quản lý» của nháp thành viên tổ chức (ADR-0213 Đ8.2, Đ8.4, Đ8.6; mốc B2 đợt 2 đăng ký, Task 16). Ba lệnh: thành viên Gửi người quản lý xác nhận / Rút lại; người quản lý
// Trả lại kèm lý do thuộc danh sách đóng. «Gửi lên Tour Đảo» của người quản lý là route Gửi đơn sẵn có (xac-nhan-route.ts). Mỗi lệnh MỘT db.batch: đẩy mốc đơn (khoá lạc quan) → câu của
// `ord_member_submit` (`changes() > 0`) → nhật ký (`changes() > 0`, đích danh người nhận tin: target_type 'staff' — Ruling R11). Lưu nháp vẫn không báo ai (ADR-0045).
// SQL ở chang-hanh-khach-repo.ts / xac-nhan-repo.ts (nửa nghiêm). Luật đọc / ghi nháp ở MỘT nơi (xem-don-nhap.ts qua `quyenGhiNhap`).
import { auditStatement } from "../audit";
import { UUID_RE, error, json, readJson, trangDon } from "../../shared/http";
import { can } from "../../shared/permissions";
import { route } from "../../shared/router";
import { MA_LY_DO_TRA_LAI, laMaLyDoTraLai } from "../../shared/to-chuc";
import { NOT_ACTING_FOR_ORG, chanGhiNhap, conThayMatToChuc, quyenGhiNhap } from "./xac-nhan-chung";
import { orderTouchDraft, yeuCauMoCuaDon } from "./xac-nhan-repo";
import { tvChoMo, tvDongStatement, tvMoStatement } from "./chang-hanh-khach-repo";
import { getMeta, nextStamp } from "./repository";

const NOT_FOUND_DON = () => error(404, "not_found", "Không tìm thấy đơn.");
const STALE = () => error(409, "stale", "Đơn vừa được người khác sửa, hãy tải lại rồi làm lại.");
const DA_GIAO_DON = () => error(409, "order_delivered", "Đơn đã ở bước Khách đã trả đủ: không sửa, huỷ hay đổi người phụ trách được nữa.");
/** ADR-0213 Đ8.7: tổ chức không còn người quản lý có hiệu lực (câu nguyên văn của ADR). */
const ORG_NO_MANAGER = () => error(409, "org_no_manager", "Tổ chức chưa có người quản lý, hãy liên hệ Tour Đảo");
const KHONG_PHAI_DON_THANH_VIEN = () => error(409, "not_member_order", "Chỉ đơn lập thay mặt tổ chức với tư cách thành viên mới gửi người quản lý xác nhận.");
const CHE_DO_CHI_SOAN = () => error(409, "org_mode_draft_only", "Tổ chức đang ở chế độ Chỉ soạn: người quản lý tự xem nháp của bạn, không cần gửi.");
const NGUOI_LAP_DA_ROI = () => error(409, "member_left_org", "Người lập đơn không còn là thành viên của tổ chức nên không trả lại được. Hãy gửi đơn lên Tour Đảo hoặc huỷ đơn.");
const KHONG_CHO = () => error(409, "member_submit_not_open", "Đơn này không có yêu cầu gửi người quản lý đang chờ.");

export const thanhVienRoutes = () => [
  // GỬI NGƯỜI QUẢN LÝ XÁC NHẬN (Đ8.2 «Soạn và gửi»): chỉ người lập là thành viên lúc lập, còn liên kết; nháp chưa chờ văn phòng; tổ chức có người quản lý có hiệu lực (người nhận tin).
  route("POST", "/api/orders/:id/gui-quan-ly", "orders", async ({ env, params, staff, benDangThayMat, cheDoThanhVien, nguoiQuanLyCoHieuLuc, baoThayDoi }) => {
    const id = params.id!;
    if (!UUID_RE.test(id)) return NOT_FOUND_DON();
    const meta = await getMeta(env.DB, id);
    if (!meta) return NOT_FOUND_DON();
    { const chan = await chanGhiNhap(meta, staff, benDangThayMat, NOT_FOUND_DON); if (chan) return chan; } // người khác 404; đã rời 403; đang chờ 409
    if (!can(staff, "order.modify", { ownerId: meta.staffId })) return error(403, "forbidden", "Chỉ người lập đơn mới gửi người quản lý xác nhận.");
    if (meta.deliveredAt) return DA_GIAO_DON();
    if (meta.status !== "draft" || meta.staffId !== staff.id) return error(409, "order_not_draft", "Chỉ gửi được đơn nháp của chính bạn.");
    if (meta.actingLinkKind !== "MEMBER" || meta.actingPartyId === null) return KHONG_PHAI_DON_THANH_VIEN();
    const org = meta.actingPartyId;
    if ((await cheDoThanhVien(org)) !== "SOAN_VA_GUI") return CHE_DO_CHI_SOAN();
    if (await yeuCauMoCuaDon(env.DB, id)) return error(409, "confirm_already_open", "Đơn này đã gửi kiểm vé và đang chờ.");
    const ql = await nguoiQuanLyCoHieuLuc(org);
    if (!ql) return ORG_NO_MANAGER();
    const at = nextStamp(meta.updatedAt);
    let kq: D1Result[];
    try {
      kq = await env.DB.batch([
        orderTouchDraft(env.DB, id, at, meta.updatedAt),
        tvMoStatement(env.DB, { id: crypto.randomUUID(), orderId: id, memberStaffId: staff.id, orgPartyId: org, at }),
        auditStatement(env.DB, { orderId: id, staffId: staff.id, action: "order_member_submitted", at, targetType: "staff", targetId: ql.staffId, detail: "Gửi người quản lý xác nhận" }, "changes() > 0"),
      ]);
    } catch (e) {
      if (/UNIQUE constraint failed: ord_member_submit/.test(e instanceof Error ? e.message : "")) return error(409, "member_submit_open", "Đơn này đã gửi người quản lý và đang chờ.");
      throw e;
    }
    if ((kq[0]!.meta.changes ?? 0) === 0 || (kq[1]!.meta.changes ?? 0) === 0) return STALE();
    baoThayDoi({ orderId: id, thayDoi: "sua" });
    return json({ ok: true }, 201, { location: trangDon(id) });
  }),

  // RÚT LẠI (Đ8.2): người lập rút nháp đang chờ người quản lý — được ghi TRONG lúc chờ (khác lưu nháp), vẫn phải còn liên kết (Review Focus 5: người đã rời không rút được).
  route("POST", "/api/orders/:id/rut-gui-quan-ly", "orders", async ({ env, params, staff, benDangThayMat, baoThayDoi }) => {
    const id = params.id!;
    if (!UUID_RE.test(id)) return NOT_FOUND_DON();
    const meta = await getMeta(env.DB, id);
    if (!meta) return NOT_FOUND_DON();
    const quyen = await quyenGhiNhap(meta, staff, { benDangThayMat }, NOT_FOUND_DON, { choPhepDangCho: true });
    if ("chan" in quyen) return quyen.chan;
    if (!can(staff, "order.modify", { ownerId: meta.staffId })) return error(403, "forbidden", "Chỉ người lập đơn mới rút lại được.");
    if (meta.deliveredAt) return DA_GIAO_DON();
    if (meta.status !== "draft" || meta.staffId !== staff.id || !meta.dangChoQuanLy) return KHONG_CHO();
    const at = nextStamp(meta.updatedAt);
    const kq = await env.DB.batch([
      orderTouchDraft(env.DB, id, at, meta.updatedAt),
      tvDongStatement(env.DB, { orderId: id, trangThai: "DA_RUT", lyDo: null, at, by: staff.id }),
      auditStatement(env.DB, { orderId: id, staffId: staff.id, action: "order_member_withdrawn", at, detail: "Rút lại yêu cầu gửi người quản lý" }, "changes() > 0"),
    ]);
    if ((kq[0]!.meta.changes ?? 0) === 0 || (kq[1]!.meta.changes ?? 0) === 0) return STALE();
    baoThayDoi({ orderId: id, thayDoi: "sua" });
    return json({ ok: true });
  }),

  // TRẢ LẠI (Đ8.2): người quản lý có hiệu lực trả nháp đang chờ về thành viên, lý do thuộc danh sách đóng; người quản lý thôi thấy nháp («Soạn và gửi»). Ô `order.submit` với cờ `quanLyBenDat`
  // (ruling R13 — ô gửi nhận cờ; trả lại là quyết định của bước gửi). Người lập gọi ⇒ 403.
  route("POST", "/api/orders/:id/tra-lai", "orders", async ({ env, request, params, staff, benDangThayMat, laQuanLyCuaBen, cheDoThanhVien, nguoiLapConThayMat, baoThayDoi }) => {
    const id = params.id!;
    if (!UUID_RE.test(id)) return NOT_FOUND_DON();
    const meta = await getMeta(env.DB, id);
    if (!meta) return NOT_FOUND_DON();
    if (meta.status === "draft" && meta.staffId === staff.id) return error(403, "forbidden", "Chỉ người quản lý của tổ chức mới trả lại được đơn.");
    const quyen = await quyenGhiNhap(meta, staff, { benDangThayMat, laQuanLyCuaBen, cheDoThanhVien }, NOT_FOUND_DON);
    if ("chan" in quyen) return quyen.chan;
    const quanLyBenDat = quyen.thayNguoiLap; // ngoại lệ có tên vừa xác nhận người gọi là người quản lý có hiệu lực của tổ chức bên đặt
    if (!can(staff, "order.submit", { ownerId: meta.staffId, quanLyBenDat })) return error(403, "forbidden", "Chỉ người quản lý của tổ chức mới trả lại được đơn.");
    if (meta.deliveredAt) return DA_GIAO_DON();
    if (meta.status !== "draft" || !meta.dangChoQuanLy) return KHONG_CHO();
    const body = await readJson(request);
    if (!laMaLyDoTraLai(body?.lyDo)) return error(400, "invalid_input", `Lý do trả lại phải là một trong: ${MA_LY_DO_TRA_LAI.join(", ")}.`);
    if (!(await conThayMatToChuc(meta, benDangThayMat))) return NOT_ACTING_FOR_ORG();
    // Vòng sửa 1 (I-2; ADR-0213 Đ5 «Nháp của người đã rời tổ chức»: người quản lý chỉ gửi lên hoặc huỷ): trả lại cho người đã rời làm nháp kẹt vĩnh viễn ⇒ 409.
    if (meta.actingPartyId === null || !(await nguoiLapConThayMat(meta.staffId, meta.actingPartyId))) return NGUOI_LAP_DA_ROI();
    const at = nextStamp(meta.updatedAt);
    const kq = await env.DB.batch([
      orderTouchDraft(env.DB, id, at, meta.updatedAt),
      tvDongStatement(env.DB, { orderId: id, trangThai: "TRA_LAI", lyDo: body.lyDo, at, by: staff.id }),
      auditStatement(env.DB, { orderId: id, staffId: staff.id, action: "order_member_returned", at, targetType: "staff", targetId: meta.staffId, detail: `Trả lại: ${body.lyDo}` }, "changes() > 0"),
    ]);
    if ((kq[0]!.meta.changes ?? 0) === 0 || (kq[1]!.meta.changes ?? 0) === 0) return STALE();
    baoThayDoi({ orderId: id, thayDoi: "sua" });
    return json({ ok: true });
  }),
];
