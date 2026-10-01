// Module billing — sổ công nợ lượt 1 (ADR-0024 điều 1–2, ADR-0025, ADR-0026; kế hoạch docs/superpowers/plans/2026-09-29-so-tien-luot-1-ke-hoach.md §3.3–3.4).
// Giữ lần thu, phiếu sổ, dòng nợ; hai bước chốt đơn "Đã giao – đã thu đủ" và "Hoàn thành" (lô ghi gộp câu CHƯA CHẠY của orders / dispatch — ADR-0024 đ4).
// Chiều phụ thuộc: billing → orders, parties, staff, dispatch, audit. `orders` KHÔNG đọc bảng bil_; số "đã thu / còn lại" của mọi màn lấy qua route ở đây.
// Mỗi route hỏi `can()` với ô của MATRIX TRƯỚC khi đọc thân / ghi (cổng router chỉ lọc thô — ADR-0019). Bảng tin (ADR-0022, ADR-0025 đ8): route ghi dưới
// /api/orders/* báo `baoThayDoi` ĐÚNG MỘT lần, chỉ ở nhánh thành công, sau khi lô ghi xong (hàng rào src/bang-tin-guard.test.ts phủ tệp này).
import type { LedgerBalancesResponse, NhapKeToanResponse, OrderPaymentsResponse, SoCongNoResponse, SoCuaToiResponse, UnpaidSummaryResponse } from "../../shared/contracts";
import { UUID_RE, error, json, readJson } from "../../shared/http";
import { docLenhNhapKeToan } from "../../shared/nhap-ke-toan";
import { can, seesOnlyAssignedOrders, type PermissionHolder } from "../../shared/permissions";
import { route, type AppModule } from "../../shared/router";
import { donDangThuTien, thongTinGiaoDon } from "../orders";
import { donChoNhapKeToan, docNhapKeToan, ghiNhapKeToan } from "./nhap-ke-toan";
import { accountingEnteredAmong, orderOwners, soDongNoCuaNguoiRow } from "./repository";
import {
  daGiao, ghiDieuChinh, ghiHoanKhach, ghiLanThu, ghiQuyetToan, hoanThanh, soCongNo, soCuaToi, tienCuaDon, tienNhieuDon, xacNhanCongTyNhan, type NguoiGoi,
} from "./service";

const NOT_FOUND = () => error(404, "not_found", "Không tìm thấy đơn.");
const FORBIDDEN_VIEW = () => error(403, "forbidden", "Tài khoản này không được xem thông tin này.");
const CANNOT_RECEIVE = () => error(403, "forbidden", "Tài khoản này không được ghi tiền cho đơn này.");
const CANNOT_HANDOVER = () => error(403, "forbidden", "Chỉ hướng dẫn viên đang phụ trách đơn, Quản trị hoặc Toàn quyền mới bấm được Đã giao – đã thu đủ.");
const CANNOT_COMPLETE = () => error(403, "forbidden", "Chỉ Kế toán hoặc Toàn quyền mới bấm được Hoàn thành.");
const CANNOT_LEDGER = () => error(403, "forbidden", "Chỉ Kế toán hoặc Toàn quyền mới ghi được sổ công nợ.");
const CANNOT_MARK_ENTRY = () => error(403, "forbidden", "Chỉ Kế toán hoặc Toàn quyền mới đánh dấu được đã nhập phần mềm kế toán.");
const CANNOT_REFUND = () => error(403, "forbidden", "Chỉ Kế toán hoặc Toàn quyền mới ghi được hoàn tiền cho khách.");

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
      const body = await tienCuaDon(env.DB, info, nguoiGoi(staff), {
        coTheGhiThu: can(staff, "payment.receive", scope),
        coTheBamGiao: can(staff, "order.handover", { assigned }),
        coTheBamHoanThanh: can(staff, "order.complete"),
      });
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
      const kq = await ghiLanThu(env.DB, { orderId: id, deliveredAt: info.deliveredAt, raw: await readJson(request), ai: nguoiGoi(staff) });
      if (!kq.ok) return kq.res;
      baoThayDoi({ orderId: id, thayDoi: "tien" });
      return json({ ok: true }, 201);
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
      return json({ ok: true }, 201);
    }),

    // Hoàn khách (ADR-0026 đ5, M2): ô `payment.refund` — Kế toán, Toàn quyền (Quản trị không — H4).
    route("POST", "/api/ledger/refunds", "office", async ({ env, request, staff, baoThayDoi }) => {
      if (!can(staff, "payment.refund")) return CANNOT_REFUND();
      const kq = await ghiHoanKhach(env.DB, { raw: await readJson(request), ai: nguoiGoi(staff) });
      if (!kq.ok) return kq.res;
      baoThayDoi({ orderId: kq.value.orderId, thayDoi: "tien" });
      return json({ ok: true }, 201);
    }),

    // Điều chỉnh / đảo, lý do bắt buộc (ADR-0026 đ8). Ô `ledger.write`.
    route("POST", "/api/ledger/adjustments", "office", async ({ env, request, staff, baoThayDoi }) => {
      if (!can(staff, "ledger.write")) return CANNOT_LEDGER();
      const kq = await ghiDieuChinh(env.DB, { raw: await readJson(request), ai: nguoiGoi(staff) });
      if (!kq.ok) return kq.res;
      if (kq.value.orderId) baoThayDoi({ orderId: kq.value.orderId, thayDoi: "tien" });
      return json({ ok: true }, 201);
    }),
  ],
};

/** API công khai cho module `receipt` (biên nhận — Task 8): đã trả / còn lại của một đơn, cùng hàm `conLai` (một nguồn). KHÔNG tự kiểm quyền. */
export async function soTienBienNhan(db: D1Database, orderId: string): Promise<{ daTra: number; conLai: number } | null> {
  const t = (await tienNhieuDon(db, [orderId])).get(orderId);
  return t ? { daTra: t.daThu, conLai: t.conLai } : null;
}

/**
 * ADR-0060 điều 5 — hàm đọc tập id do GỐC LẮP RÁP tiêm vào `ctx.nhapKeToanCuaDon` (orders không đọc bảng bil_): trong các đơn `orderIds`, đơn nào có trạng
 * thái hiện tại = đã nhập phần mềm kế toán. KHÔNG tự kiểm quyền — route của orders hỏi `accounting.entry.view` trước khi dùng kết quả. Một truy vấn, MỘT tham số.
 */
export const nhapKeToanCuaDon = (db: D1Database, orderIds: readonly string[]): Promise<Set<string>> => accountingEnteredAmong(db, orderIds);
