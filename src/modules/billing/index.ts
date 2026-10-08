// Module billing — sổ công nợ lượt 1 (ADR-0024 điều 1–2, ADR-0025, ADR-0026; kế hoạch docs/superpowers/plans/2026-09-29-so-tien-luot-1-ke-hoach.md §3.3–3.4).
// Giữ lần thu, phiếu sổ, dòng nợ; hai bước chốt đơn "Đã giao – đã thu đủ" và "Hoàn thành" (lô ghi gộp câu CHƯA CHẠY của orders / dispatch — ADR-0024 đ4).
// Chiều phụ thuộc: billing → orders, parties, staff, dispatch, audit. `orders` KHÔNG đọc bảng bil_; số "đã thu / còn lại" của mọi màn lấy qua route ở đây.
// Mỗi route hỏi `can()` với ô của MATRIX TRƯỚC khi đọc thân / ghi (cổng router chỉ lọc thô — ADR-0019). Bảng tin (ADR-0022, ADR-0025 đ8): route ghi dưới
// /api/orders/* báo `baoThayDoi` ĐÚNG MỘT lần, chỉ ở nhánh thành công, sau khi lô ghi xong (hàng rào src/bang-tin-guard.test.ts phủ tệp này).
import type {
  CocDemResponse, CocDoiChieuResponse, CocListResponse, KySoResponse, LedgerBalancesResponse, NhapKeToanResponse, OrderPaymentsResponse, ReceiptDto, SoCongNoResponse, SoCuaToiResponse,
  UnpaidSummaryResponse,
} from "../../shared/contracts";
import { UUID_RE, error, json, kemLocation, readJson, trangDon } from "../../shared/http";
import { docLenhNhapKeToan } from "../../shared/nhap-ke-toan";
import { can, seesOnlyAssignedOrders, type PermissionHolder } from "../../shared/permissions";
import { route, type AppModule } from "../../shared/router";
import { vnToday } from "../../shared/vn-date";
import { docGhiChuKy, khoaKyStatements, kiemKhoaKy, thangDaKhoa } from "../ky-so";
import { donDangThuTien, thongTinGiaoDon } from "../orders";
import { donChoNhapKeToan, docNhapKeToan, ghiNhapKeToan } from "./nhap-ke-toan";
import { accountingEnteredAmong, earliestLedgerMonth, orderOwners, soDongNoCuaNguoiRow } from "./repository";
import { cocChoBienNhan, cocCuaDon, danhSachCoc, demCoc, doiChieuCoc, ghiChiHoan, ghiChuyen, ghiDuyet, ghiHoanNgoai, ghiHuyDuyet, xacNhanHoanNgoai } from "./coc";
import {
  daGiao, ghiDieuChinh, ghiHoanKhach, ghiLanThu, ghiQuyetToan, hoanThanh, kySoResponse, soCongNo, soCuaToi, tienCuaDon, tienNhieuDon, xacNhanCongTyNhan, type NguoiGoi,
} from "./service";
import { ghiThayLanThu } from "./thay-lan-thu";

const NOT_FOUND = () => error(404, "not_found", "Không tìm thấy đơn.");
const FORBIDDEN_VIEW = () => error(403, "forbidden", "Tài khoản này không được xem thông tin này.");
const CANNOT_RECEIVE = () => error(403, "forbidden", "Tài khoản này không được ghi tiền cho đơn này.");
const CANNOT_RECEIVE_CANCELLED = () => error(403, "forbidden", "Đơn đã huỷ — chỉ Kế toán hoặc Toàn quyền ghi được lần thu (khách chuyển khoản muộn).");
const CANNOT_HANDOVER = () => error(403, "forbidden", "Chỉ hướng dẫn viên đang phụ trách đơn, Quản trị hoặc Toàn quyền mới bấm được Đã giao – đã thu đủ.");
const CANNOT_COMPLETE = () => error(403, "forbidden", "Chỉ Kế toán hoặc Toàn quyền mới bấm được Hoàn thành.");
const CANNOT_LEDGER = () => error(403, "forbidden", "Chỉ Kế toán hoặc Toàn quyền mới ghi được sổ công nợ.");
const CANNOT_MARK_ENTRY = () => error(403, "forbidden", "Chỉ Kế toán hoặc Toàn quyền mới đánh dấu được đã nhập phần mềm kế toán.");
const CANNOT_APPROVE = () => error(403, "forbidden", "Chỉ Quản trị hoặc Toàn quyền mới duyệt được hoàn cọc / xác nhận dòng đã hoàn ngoài hệ thống.");
const CANNOT_OUTSIDE = () => error(403, "forbidden", "Chỉ Toàn quyền mới ghi được dòng đã hoàn ngoài hệ thống.");
const CANNOT_REFUND = () => error(403, "forbidden", "Chỉ Kế toán hoặc Toàn quyền mới ghi được hoàn tiền cho khách.");
const CANNOT_CLOSE_PERIOD = () => error(403, "forbidden", "Chỉ Kế toán hoặc Toàn quyền mới khoá được sổ tháng.");

/** Người gọi cho service: `laKeToan` = có ô `ledger.write` (Kế toán, Toàn quyền — ghi người thu là người khác, chọn ngày phát sinh). */
const nguoiGoi = (staff: PermissionHolder & { partyId: string | null }): NguoiGoi => ({
  staffId: staff.id,
  partyId: staff.partyId,
  laKeToan: can(staff, "ledger.write"),
});

/** HÀM CÔNG BỐ (ADR-0068 G10) — CHỈ gốc lắp ráp gọi (ctx.gopHoSo): số dòng công nợ còn hiệu lực của một hồ sơ (dòng ở lại hồ sơ phụ khi gộp). */
export const soDongNoCuaNguoi = (db: D1Database, partyId: string): Promise<number> => soDongNoCuaNguoiRow(db, partyId);

export const billingModule: AppModule = {
  name: "billing",
  routes: [
    // Tiền của MỘT đơn (NT-F11): đã thu / còn lại / dư chờ hoàn, lần thu, lý do đang giữ + ai xử lý, nút nào hiện. Khuôn quyền = chi tiết đơn (ADR-0019 đ2):
    // `order.view` phạm vi đơn (chỉ-FIELD không phụ trách → 404), rồi `money.view`.
    route("GET", "/api/orders/:id/payments", "orders", async ({ env, params, staff, isAssigned }) => {
      const id = params.id!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      const [info, assigned] = await Promise.all([thongTinGiaoDon(env.DB, id), isAssigned(id)]);
      if (!info) return NOT_FOUND();
      const scope = { ownerId: info.ownerId, assigned };
      if (!can(staff, "order.view", scope)) return seesOnlyAssignedOrders(staff) ? NOT_FOUND() : FORBIDDEN_VIEW();
      if (!can(staff, "money.view", scope)) return FORBIDDEN_VIEW();
      // ADR-0089: khối cọc của đơn huỷ — cờ nút theo ĐÚNG ô của route ghi; tên người giữ tiền chỉ cho `ledger.view` phạm vi any.
      const coc = info.status === "cancelled"
        ? await cocCuaDon(env.DB, id, {
          coThePhanLoai: can(staff, "order.cancel.classify"),
          coTheDuyet: can(staff, "deposit.refund.approve"),
          coTheChi: can(staff, "payment.refund"),
          coTheChuyen: can(staff, "ledger.write"),
          coTheGhiHoanNgoai: can(staff, "deposit.outside.record"),
          coTheXacNhanHoanNgoai: can(staff, "deposit.refund.approve"),
          xemNguoiGiu: can(staff, "ledger.view"),
        })
        : null;
      const body = await tienCuaDon(env.DB, info, nguoiGoi(staff), {
        // Cờ theo ĐÚNG luật của route ghi (đ13): đơn huỷ thì thêm ô `ledger.write`.
        coTheGhiThu: can(staff, "payment.receive", scope) && (info.status !== "cancelled" || can(staff, "ledger.write")),
        coTheBamGiao: can(staff, "order.handover", { assigned }),
        coTheBamHoanThanh: can(staff, "order.complete"),
      }, coc);
      return json(body satisfies OrderPaymentsResponse);
    }),

    // Ghi một lần thu TRƯỚC "Đã giao" (ADR-0026 đ2, đ10): ô `payment.receive` { ownerId, assigned } — Đối tác chỉ đơn mình, HDV chỉ đơn đang phụ trách.
    // Người không phải Kế toán/Toàn quyền chỉ ghi người thu = mình hoặc Công ty (400). Sau "Đã giao" → 409 (NT-S3).
    route("POST", "/api/orders/:id/payments", "orders", async ({ env, request, params, staff, isAssigned, baoThayDoi }) => {
      const id = params.id!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      const [info, assigned] = await Promise.all([thongTinGiaoDon(env.DB, id), isAssigned(id)]);
      if (!info) return NOT_FOUND();
      if (!can(staff, "payment.receive", { ownerId: info.ownerId, assigned })) return CANNOT_RECEIVE();
      // ADR-0089 đ13 (NT-H10, H-C9): lần thu lên ĐƠN ĐÃ HUỶ (khách chuyển khoản muộn) chỉ Kế toán, Toàn quyền.
      if (info.status === "cancelled" && !can(staff, "ledger.write")) return CANNOT_RECEIVE_CANCELLED();
      const kq = await ghiLanThu(env.DB, { orderId: id, deliveredAt: info.deliveredAt, raw: await readJson(request), ai: nguoiGoi(staff) });
      if (!kq.ok) return kq.res;
      baoThayDoi({ orderId: id, thayDoi: "tien" });
      return json({ ok: true }, 201, { location: trangDon(id) });
    }),

    // ---- CỌC ĐƠN HUỶ (ADR-0089; migration 0079). Mỗi lệnh MỘT lô (ADR-0094 V1), 201 + Location trang đơn (V2). Luật tiền kiểm ở máy chủ (rules.ts) rồi
    // trigger 0079 kiểm lại. Các route /coc/... không trùng tiền tố route nào khác của orders/billing.
    // Duyệt hoàn / duyệt chuyển (đ4a, đ6, X-1): ô `deposit.refund.approve` (Quản trị, Toàn quyền). Thân { loai: "hoan" | "chuyen", soTien, lyDo, donNhan? (mã đơn) }.
    route("POST", "/api/orders/:id/coc/duyet", "office", async ({ env, request, params, staff, baoThayDoi }) => {
      if (!can(staff, "deposit.refund.approve")) return CANNOT_APPROVE();
      const id = params.id!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      if (!(await thongTinGiaoDon(env.DB, id))) return NOT_FOUND();
      const kq = await ghiDuyet(env.DB, { orderId: id, raw: await readJson(request), ai: nguoiGoi(staff) });
      if (!kq.ok) return kq.res;
      baoThayDoi({ orderId: id, thayDoi: "tien" });
      return json({ ok: true, duyetId: kq.value.duyetId }, 201, { location: trangDon(id) });
    }),

    // Huỷ duyệt phần chưa chi (đ4c): ô `deposit.refund.approve`. Thân { soTien, lyDo }.
    route("POST", "/api/orders/:id/coc/duyet/:duyetId/huy", "office", async ({ env, request, params, staff, baoThayDoi }) => {
      if (!can(staff, "deposit.refund.approve")) return CANNOT_APPROVE();
      const id = params.id!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      if (!(await thongTinGiaoDon(env.DB, id))) return NOT_FOUND();
      const kq = await ghiHuyDuyet(env.DB, { orderId: id, duyetId: params.duyetId!, raw: await readJson(request), ai: nguoiGoi(staff) });
      if (!kq.ok) return kq.res;
      baoThayDoi({ orderId: id, thayDoi: "tien" });
      return json({ ok: true }, 201, { location: trangDon(id) });
    }),

    // Ghi chi hoàn theo khoản duyệt (đ4b, đ4c): ô `payment.refund` (Kế toán, Toàn quyền); người chi ≠ người duyệt. Thân { duyetId, soTien, hinhThuc, nguoiTra, ngayPhatSinh?, ghiChu? }.
    route("POST", "/api/orders/:id/coc/chi", "office", async ({ env, request, params, staff, baoThayDoi }) => {
      if (!can(staff, "payment.refund")) return CANNOT_REFUND();
      const id = params.id!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      if (!(await thongTinGiaoDon(env.DB, id))) return NOT_FOUND();
      const kq = await ghiChiHoan(env.DB, { orderId: id, raw: await readJson(request), ai: nguoiGoi(staff) });
      if (!kq.ok) return kq.res;
      baoThayDoi({ orderId: id, thayDoi: "tien" });
      return json({ ok: true }, 201, { location: trangDon(id) });
    }),

    // Chuyển tiền sang đơn mới (đ6): ô `ledger.write` (Kế toán, Toàn quyền); người chuyển ≠ người duyệt; MỘT lô hai đơn. Thân { duyetId, soTien, nguoiGiu, ngayPhatSinh? }.
    // Bảng tin: báo CẢ hai đơn (một lời gọi trong vòng lặp — hàng rào đếm lời gọi theo văn bản).
    route("POST", "/api/orders/:id/coc/chuyen", "office", async ({ env, request, params, staff, baoThayDoi }) => {
      if (!can(staff, "ledger.write")) return CANNOT_LEDGER();
      const id = params.id!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      if (!(await thongTinGiaoDon(env.DB, id))) return NOT_FOUND();
      const kq = await ghiChuyen(env.DB, { orderId: id, raw: await readJson(request), ai: nguoiGoi(staff) });
      if (!kq.ok) return kq.res;
      for (const orderId of [id, kq.value.donNhanId]) baoThayDoi({ orderId, thayDoi: "tien" });
      return json({ ok: true, donNhanId: kq.value.donNhanId }, 201, { location: trangDon(id) });
    }),

    // Ghi "đã hoàn ngoài hệ thống" cho đơn huỷ cũ (đ16, X-3): ô `deposit.outside.record` (chỉ Toàn quyền). Thân { soTien, lyDo, ngayPhatSinh? }.
    route("POST", "/api/orders/:id/coc/hoan-ngoai", "office", async ({ env, request, params, staff, baoThayDoi }) => {
      if (!can(staff, "deposit.outside.record")) return CANNOT_OUTSIDE();
      const id = params.id!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      if (!(await thongTinGiaoDon(env.DB, id))) return NOT_FOUND();
      const kq = await ghiHoanNgoai(env.DB, { orderId: id, raw: await readJson(request), ai: nguoiGoi(staff) });
      if (!kq.ok) return kq.res;
      baoThayDoi({ orderId: id, thayDoi: "tien" });
      return json({ ok: true }, 201, { location: trangDon(id) });
    }),

    // Xác nhận / từ chối dòng "đã hoàn ngoài hệ thống" (X-4, lời chủ (b)): ô `deposit.refund.approve`; người xác nhận ≠ người ghi. Thân { dongY, lyDo? (bắt buộc khi từ chối) }.
    route("POST", "/api/orders/:id/coc/hoan-ngoai/:ghiId/xac-nhan", "office", async ({ env, request, params, staff, baoThayDoi }) => {
      if (!can(staff, "deposit.refund.approve")) return CANNOT_APPROVE();
      const id = params.id!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      if (!(await thongTinGiaoDon(env.DB, id))) return NOT_FOUND();
      const kq = await xacNhanHoanNgoai(env.DB, { orderId: id, ghiId: params.ghiId!, raw: await readJson(request), ai: nguoiGoi(staff) });
      if (!kq.ok) return kq.res;
      baoThayDoi({ orderId: id, thayDoi: "tien" });
      return json({ ok: true }, 201, { location: trangDon(id) });
    }),

    // "ĐÃ GIAO – ĐÃ THU ĐỦ" (ADR-0025 điều 2–5): ô `order.handover` { assigned } — HDV đang phụ trách, Quản trị, Toàn quyền. MỘT lô ghi: [câu bảo vệ người phụ
    // trách của dispatch — chỉ khi người gọi được phép NHỜ đang phụ trách] → câu orders đặt mốc → [lần thu nhập ở bước này] → phiếu Đã giao (trigger kiểm
    // đã thu = phải thu) → nhật ký. Thân tuỳ chọn { lanThu }.
    route("POST", "/api/orders/:id/delivered", "orders", async ({ env, request, params, staff, isAssigned, baoThayDoi }) => {
      const id = params.id!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      const [info, assigned] = await Promise.all([thongTinGiaoDon(env.DB, id), isAssigned(id)]);
      if (!info) return NOT_FOUND();
      if (!can(staff, "order.handover", { assigned })) return CANNOT_HANDOVER();
      const body = await readJson(request);
      const lanThu = body && typeof body === "object" ? (body as Record<string, unknown>).lanThu : undefined;
      if (lanThu !== undefined && lanThu !== null && !can(staff, "payment.receive", { ownerId: info.ownerId, assigned })) return CANNOT_RECEIVE();
      // Người được phép CHỈ vì đang phụ trách (ô `assigned`) ⇒ lô kèm câu bảo vệ (đổi người phụ trách giữa lúc đọc và lúc ghi → lô không áp — NT-F4).
      const kq = await daGiao(env.DB, { orderId: id, info, ai: nguoiGoi(staff), canCauBaoVe: !can(staff, "order.handover"), rawLanThu: lanThu });
      if (!kq.ok) return kq.res;
      baoThayDoi({ orderId: id, thayDoi: "chot_giao" });
      return json({ ok: true });
    }),

    // "HOÀN THÀNH" (ADR-0025 điều 6–7): ô `order.complete` — Kế toán, Toàn quyền (Quản trị KHÔNG). Lô: câu orders → phiếu Hoàn thành (trigger: không còn ai nợ
    // công ty vì đơn) → nhật ký. Cổng "office".
    route("POST", "/api/orders/:id/completed", "office", async ({ env, params, staff, baoThayDoi }) => {
      if (!can(staff, "order.complete")) return CANNOT_COMPLETE();
      const id = params.id!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      const info = await thongTinGiaoDon(env.DB, id);
      if (!info) return NOT_FOUND();
      const kq = await hoanThanh(env.DB, { orderId: id, info, ai: nguoiGoi(staff) });
      if (!kq.ok) return kq.res;
      baoThayDoi({ orderId: id, thayDoi: "hoan_thanh" });
      return json({ ok: true });
    }),

    // DẤU "ĐÃ NHẬP PHẦN MỀM KẾ TOÁN" (ADR-0060 điều 4) — đọc: `order.view` phạm vi đơn (chỉ-FIELD không phụ trách → 404, như /payments), rồi ô xem riêng
    // `accounting.entry.view` cùng phạm vi (Đối tác một mình → 403 — Q-2 "Không"; lai SALES + PARTNER qua nhờ ô SALES). Dòng trước đó chỉ cho ô ghi (A-7).
    route("GET", "/api/orders/:id/nhap-ke-toan", "orders", async ({ env, params, staff, isAssigned }) => {
      const id = params.id!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      const [don, assigned] = await Promise.all([donChoNhapKeToan(env.DB, id), isAssigned(id)]);
      if (!don) return NOT_FOUND();
      const scope = { ownerId: don.ownerId, assigned };
      if (!can(staff, "order.view", scope)) return seesOnlyAssignedOrders(staff) ? NOT_FOUND() : FORBIDDEN_VIEW();
      if (!can(staff, "accounting.entry.view", scope)) return FORBIDDEN_VIEW();
      return json((await docNhapKeToan(env.DB, id, { coTheGhi: can(staff, "accounting.entry.mark"), status: don.status })) satisfies NhapKeToanResponse);
    }),

    // Ghi dấu (ADR-0060 điều 3): ô `accounting.entry.mark` KHÔNG ngữ cảnh (Kế toán, Toàn quyền — Quản trị KHÔNG). Đánh dấu chỉ khi đơn đã xác nhận (A-3);
    // bỏ dấu mọi trạng thái, bắt buộc lý do (A-4). Chạy được sau "Đã giao" / "Hoàn thành" (route billing — không thuộc NT-F7). Khoá lạc quan `truocDo`.
    // Bảng tin: loại "tien" — chỉ làm mới màn hình, KHÔNG gõ cửa điện thoại (ADR-0045); gửi trùng trạng thái → 200, không ghi, không báo.
    route("POST", "/api/orders/:id/nhap-ke-toan", "office", async ({ env, request, params, staff, baoThayDoi }) => {
      if (!can(staff, "accounting.entry.mark")) return CANNOT_MARK_ENTRY();
      const id = params.id!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      const don = await donChoNhapKeToan(env.DB, id);
      if (!don) return NOT_FOUND();
      const doc = docLenhNhapKeToan(await readJson(request));
      if (!doc.ok) return error(400, "invalid_input", doc.message);
      const kq = await ghiNhapKeToan(env.DB, { orderId: id, status: don.status, lenh: doc.lenh, staffId: staff.id });
      if (!kq.ok) return kq.res;
      if (kq.doi) baoThayDoi({ orderId: id, thayDoi: "tien" });
      return json({ ok: true, doi: kq.doi });
    }),

    // Tiền nhiều đơn cùng lúc (danh sách, Trang chủ, "Việc của tôi") — POST chỉ-đọc (thân = danh sách id, tối đa 100; GĐ kế hoạch §3.4). Mỗi đơn hỏi
    // `order.view` + `money.view` với phạm vi CỦA ĐƠN ĐÓ; đơn không được xem tiền bị bỏ khỏi kết quả (không 403 cả lô).
    route("POST", "/api/ledger/balances", "orders", async ({ env, request, staff, myHandledOrderIds }) => {
      if (!can(staff, "money.view", { ownerId: staff.id }) && !can(staff, "money.view", { assigned: true })) return FORBIDDEN_VIEW();
      const body = await readJson(request);
      const raw = body && typeof body === "object" ? (body as Record<string, unknown>).orderIds : undefined;
      if (!Array.isArray(raw) || raw.length > 100 || raw.some((x) => typeof x !== "string" || !UUID_RE.test(x))) {
        return error(400, "invalid_input", "Danh sách đơn không hợp lệ (tối đa 100 mã).");
      }
      const ids = [...new Set(raw as string[])];
      const [owners, handled] = await Promise.all([orderOwners(env.DB, ids), myHandledOrderIds()]);
      const phuTrach = new Set(handled);
      const xemDuoc = ids.filter((id) => {
        const scope = { ownerId: owners.get(id), assigned: phuTrach.has(id) };
        return owners.has(id) && can(staff, "order.view", scope) && can(staff, "money.view", scope);
      });
      const tien = await tienNhieuDon(env.DB, xemDuoc);
      const balances: LedgerBalancesResponse["balances"] = {};
      for (const [id, t] of tien) balances[id] = { phaiThu: t.phaiThu, daThu: t.daThu, conLai: t.conLai, du: t.du, chuaRo: t.chuaRo, daGiao: t.daGiao, hoanThanh: t.hoanThanh };
      return json({ balances } satisfies LedgerBalancesResponse);
    }),

    // Ô "Còn thiếu tiền" của Trang chủ (rời getDashboard của orders — ADR-0026 đ9): số đơn đã xác nhận chưa Đã giao còn phải thu + tổng. Khuôn quyền của Trang
    // chủ: ba ô KHÔNG ngữ cảnh (xem được mọi đơn, mọi tiền).
    route("GET", "/api/ledger/unpaid-summary", "orders", async ({ env, staff }) => {
      if (!can(staff, "order.view") || !can(staff, "money.view")) return FORBIDDEN_VIEW();
      const don = await donDangThuTien(env.DB);
      const tien = await tienNhieuDon(env.DB, [...don.keys()]);
      let count = 0;
      let total = 0;
      let earliestDate: string | null = null;
      for (const t of tien.values()) {
        if (t.conLai <= 0) continue;
        count++;
        total += t.conLai;
        if (t.ngayDiSomNhat && (earliestDate === null || t.ngayDiSomNhat < earliestDate)) earliestDate = t.ngayDiSomNhat;
      }
      return json({ count, total, earliestDate } satisfies UnpaidSummaryResponse);
    }),

    // "Sổ của tôi" (ADR-0026 đ7): ô `ledger.view` phạm vi của mình — mọi tài khoản nội bộ (Đối tác, tài xế: none). Cổng "staff" (HDV không qua cổng office).
    route("GET", "/api/ledger/mine", "staff", async ({ env, staff }) => {
      if (!can(staff, "ledger.view", { ownerId: staff.id })) return FORBIDDEN_VIEW();
      return json((await soCuaToi(env.DB, staff.partyId)) satisfies SoCuaToiResponse);
    }),

    // Sổ công nợ của Kế toán (ADR-0026 đ7): ô `ledger.view` KHÔNG ngữ cảnh (= any — Kế toán, Toàn quyền).
    route("GET", "/api/ledger", "office", async ({ env, staff }) => {
      if (!can(staff, "ledger.view")) return FORBIDDEN_VIEW();
      return json((await soCongNo(env.DB)) satisfies SoCongNoResponse);
    }),

    // ---- Cọc đơn huỷ — danh sách / đối chiếu / ô đếm cho Kế toán (ADR-0089 đ5 nhắc, đ9c, đ11, đ16): ô `ledger.view` KHÔNG ngữ cảnh (= any — Kế toán,
    // Toàn quyền). Tiền tố tĩnh; không có route `/api/ledger/:…` nào nuốt mất.
    route("GET", "/api/ledger/coc", "office", async ({ env, staff }) => {
      if (!can(staff, "ledger.view")) return FORBIDDEN_VIEW();
      return json((await danhSachCoc(env.DB)) satisfies CocListResponse);
    }),
    route("GET", "/api/ledger/coc/doi-chieu", "office", async ({ env, staff }) => {
      if (!can(staff, "ledger.view")) return FORBIDDEN_VIEW();
      return json((await doiChieuCoc(env.DB)) satisfies CocDoiChieuResponse);
    }),
    route("GET", "/api/ledger/coc/dem", "office", async ({ env, staff }) => {
      if (!can(staff, "ledger.view")) return FORBIDDEN_VIEW();
      return json((await demCoc(env.DB)) satisfies CocDemResponse);
    }),

    // Kế toán bấm "Công ty đã nhận" (H3): khoản "Công ty thu" do người khác khai hết tính vào nợ người khai. Ô `ledger.write`.
    route("POST", "/api/ledger/company-receipts/:receiptId/confirm", "office", async ({ env, request, params, staff, baoThayDoi }) => {
      if (!can(staff, "ledger.write")) return CANNOT_LEDGER();
      if (!UUID_RE.test(params.receiptId!)) return error(404, "not_found", "Không tìm thấy lần thu.");
      const kq = await xacNhanCongTyNhan(env.DB, { receiptId: params.receiptId!, raw: await readJson(request), ai: nguoiGoi(staff) });
      if (!kq.ok) return kq.res;
      baoThayDoi({ orderId: kq.value.orderId, thayDoi: "tien" });
      return json({ ok: true });
    }),

    // Nộp về công ty / công ty trả (ADR-0026 đ5), phân bổ theo đơn. Ô `ledger.write`.
    route("POST", "/api/ledger/settlements", "office", async ({ env, request, staff, baoThayDoi }) => {
      if (!can(staff, "ledger.write")) return CANNOT_LEDGER();
      const kq = await ghiQuyetToan(env.DB, { raw: await readJson(request), ai: nguoiGoi(staff) });
      if (!kq.ok) return kq.res;
      for (const orderId of kq.value.orderIds) baoThayDoi({ orderId, thayDoi: "tien" });
      return json({ ok: true }, 201, { location: kq.value.orderIds.length === 1 ? trangDon(kq.value.orderIds[0]!) : "/orders" });
    }),

    // Hoàn khách (ADR-0026 đ5, M2): ô `payment.refund` — Kế toán, Toàn quyền (Quản trị không — H4).
    route("POST", "/api/ledger/refunds", "office", async ({ env, request, staff, baoThayDoi }) => {
      if (!can(staff, "payment.refund")) return CANNOT_REFUND();
      const kq = await ghiHoanKhach(env.DB, { raw: await readJson(request), ai: nguoiGoi(staff) });
      if (!kq.ok) return kq.res;
      baoThayDoi({ orderId: kq.value.orderId, thayDoi: "tien" });
      return json({ ok: true }, 201, { location: trangDon(kq.value.orderId) });
    }),

    // Điều chỉnh / đảo, lý do bắt buộc (ADR-0026 đ8). Ô `ledger.write`.
    route("POST", "/api/ledger/adjustments", "office", async ({ env, request, staff, baoThayDoi }) => {
      if (!can(staff, "ledger.write")) return CANNOT_LEDGER();
      const kq = await ghiDieuChinh(env.DB, { raw: await readJson(request), ai: nguoiGoi(staff) });
      if (!kq.ok) return kq.res;
      if (kq.value.orderId) baoThayDoi({ orderId: kq.value.orderId, thayDoi: "tien" });
      return json({ ok: true }, 201, { location: kq.value.orderId ? trangDon(kq.value.orderId) : "/home" });
    }),

    // "Thay lần thu" (ADR-0088 đ2): N lần thu cũ → M lần thu mới, MỘT lô; ô `ledger.write` (Kế toán, Toàn quyền — không thêm mã quyền). Đường sửa sai DUY NHẤT
    // của lần thu sau Đã giao (đảo đơn lẻ bị chặn — đ3).
    route("POST", "/api/ledger/receipt-replacements", "office", async ({ env, request, staff, baoThayDoi }) => {
      if (!can(staff, "ledger.write")) return CANNOT_LEDGER();
      const kq = await ghiThayLanThu(env.DB, { raw: await readJson(request), ai: nguoiGoi(staff) });
      if (!kq.ok) return kq.res;
      baoThayDoi({ orderId: kq.value.orderId, thayDoi: "tien" });
      return json({ ok: true }, 201, { location: trangDon(kq.value.orderId) });
    }),

    // ---- KHOÁ SỔ THÁNG (ADR-0080 phần D1; module ky-so giữ bảng, route ở đây vì cần sổ của billing). Tiền tố tĩnh `/api/ledger/ky`, không nuốt route nào khác.
    // Xem kỳ: ô `ledger.view` KHÔNG ngữ cảnh (= any — Kế toán, Toàn quyền): tháng đã khoá, tháng khoá được kế tiếp, bảng kiểm của tháng đó (chỉ mã đơn, số tiền, ngày).
    route("GET", "/api/ledger/ky", "office", async ({ env, staff }) => {
      if (!can(staff, "ledger.view")) return FORBIDDEN_VIEW();
      return json((await kySoResponse(env.DB, { homNay: vnToday(new Date()), coQuyenKhoa: can(staff, "ledger.period.close") })) satisfies KySoResponse);
    }),
    // Khoá MỘT tháng đã qua, lần lượt từng tháng, không mở lại: ô `ledger.period.close` (Kế toán, Toàn quyền — Quản trị KHÔNG). Thân tuỳ chọn { ghiChu? }. MỘT lô: câu khoá + nhật ký
    // (`changes() > 0`); lớp CSDL (trigger 0090) kiểm lại "liền kề" và "không sửa / xoá" — lỗi dịch sang 409 tiếng Việt. 201 + Location + `KySoResponse` mới.
    route("POST", "/api/ledger/ky/:period/khoa", "office", async ({ env, request, params, staff }) => {
      if (!can(staff, "ledger.period.close")) return CANNOT_CLOSE_PERIOD();
      const period = params.period!;
      const homNay = vnToday(new Date());
      const kiem = async () => kiemKhoaKy({ period, homNay, daKhoa: await thangDaKhoa(env.DB), thangSoSomNhat: await earliestLedgerMonth(env.DB) });
      const k = await kiem();
      if (!k.ok) return error(k.status, k.code, k.message);
      const body = await readJson(request);
      const gc = docGhiChuKy(body?.ghiChu);
      if (!gc.ok) return error(400, "invalid_input", gc.message);
      try {
        await env.DB.batch(khoaKyStatements(env.DB, { period, note: gc.value, at: new Date().toISOString(), by: staff.id }));
      } catch (e) {
        const m = e instanceof Error ? e.message : String(e);
        // Hai người khoá cùng lúc / tháng vừa được khoá giữa lúc đọc và lúc ghi.
        if (/UNIQUE constraint failed: ky_period_close\.period/.test(m) || /\bky_append_only:/.test(m)) return error(409, "stale", "Tháng này vừa được khoá — tải lại.");
        if (/\bperiod_not_adjacent:/.test(m)) {
          const lai = await kiem();
          return lai.ok ? error(409, "stale", "Tháng này vừa được khoá — tải lại.") : error(lai.status, lai.code, lai.message);
        }
        throw e;
      }
      return kemLocation(json((await kySoResponse(env.DB, { homNay, coQuyenKhoa: true })) satisfies KySoResponse, 201), "/khoa-thang");
    }),
  ],
};

/** API công khai cho module `receipt` (biên nhận — Task 8): đã trả / còn lại của một đơn, cùng hàm `conLai` (một nguồn). KHÔNG tự kiểm quyền. */
export async function soTienBienNhan(db: D1Database, orderId: string): Promise<{ daTra: number; conLai: number; huy: ReceiptDto["huy"] } | null> {
  const [t, huy] = await Promise.all([tienNhieuDon(db, [orderId]).then((m) => m.get(orderId)), cocChoBienNhan(db, orderId)]);
  return t ? { daTra: t.daThu, conLai: t.conLai, huy } : null;
}

/** API công khai cho `receipt` (QR thanh toán — ADR-0108 đ3): còn lại + đơn đã "Đã giao" chưa, cùng hàm `conLai` (một nguồn). KHÔNG tự kiểm quyền. */
export async function soTienChoQr(db: D1Database, orderId: string): Promise<{ conLai: number; daGiao: boolean } | null> {
  const t = (await tienNhieuDon(db, [orderId])).get(orderId);
  return t ? { conLai: t.conLai, daGiao: t.daGiao } : null;
}

/**
 * ADR-0060 điều 5 — hàm đọc tập id do GỐC LẮP RÁP tiêm vào `ctx.nhapKeToanCuaDon` (orders không đọc bảng bil_): trong các đơn `orderIds`, đơn nào có trạng
 * thái hiện tại = đã nhập phần mềm kế toán. KHÔNG tự kiểm quyền — route của orders hỏi `accounting.entry.view` trước khi dùng kết quả. Một truy vấn, MỘT tham số.
 */
export const nhapKeToanCuaDon = (db: D1Database, orderIds: readonly string[]): Promise<Set<string>> => accountingEnteredAmong(db, orderIds);
