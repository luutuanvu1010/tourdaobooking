// Bài "lịch sử đơn và tiền cọc của ĐỐI TÁC" (kiểm toán trước sử dụng 13/10/2026, lỗi D-1; chủ chốt cách vá: DANH SÁCH CHO PHÉP).
// CHẶN: tài khoản giữ quyền Đối tác (`holdsPartner` — Đối tác thuần VÀ mọi tài khoản lai) xem nội dung kế toán nội bộ của CHÍNH đơn mình qua
//   (1) `GET /api/orders/:id` → `history` (dòng sổ tiền, duyệt hoàn cọc kèm lý do tự do, tên Kế toán…),
//   (2) `GET /api/orders/:id/payments` → `coc.khoanDuyet[]` / `coc.hoanNgoaiDong[]` (lý do, người duyệt, người ghi) và `lanThu[]` (người ghi, ghi chú).
// Gốc lỗi: lọc kiểu danh sách CHẶN — loại dòng nhật ký thêm sau tự lộ. Bài này đổi chiều: Đối tác chỉ thấy các hành động ở danh sách dưới đây (CHỦ DUYỆT; đổi danh
// sách = đổi bài này cùng lúc, nên không thể lỡ tay). Có "răng": cùng dữ liệu HIỆN ra với Kế toán / Quản trị / Toàn quyền, nên một chỗ rò hay một chỗ siết quá tay đều bắt được.
// Khung thử: tests/audit (cả ứng dụng + SQLite thật). Hành động nhật ký gieo THẲNG vào `audit_log` (mỗi hành động của `AUDIT_ACTIONS` một dòng, người làm là Kế toán).
import { test } from "node:test";
import assert from "node:assert/strict";
import { AUDIT_ACTIONS, type AuditAction } from "./shared/audit-actions.ts";
import { DAU_DAT_GAP } from "./shared/chang-dua-don.ts";
import { can, type PermissionCode } from "./shared/permissions.ts";
import { HANH_DONG_NHAP_KE_TOAN } from "./shared/nhap-ke-toan.ts";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { seedStaff } from "../tests/audit/harness.mjs";
import { ACC, ADM, NGAY, PARTNER, SALES, SUP, setup } from "../tests/audit/dieu-phoi-khung.mjs";

type W = ReturnType<typeof setup>;
const AT = "2026-10-01T00:00:00.000Z";
const LY_DO = "Khách quen của giám đốc, hoàn thêm dù quá hạn, đừng báo đối tác";
const HYB = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2"; // SALES + PARTNER (tài khoản lai)
let seq = 0;
const uuid = () => `bbbbbbbb-bbbb-4bbb-8bbb-${String(++seq).padStart(12, "0")}`;

/** DANH SÁCH CHO PHÉP do chủ duyệt: hành động → chi tiết Đối tác được thấy. "giu" = giữ nguyên; null = bỏ chi tiết; chữ = đúng chữ này. */
const CHO_PHEP: Record<string, "giu" | null | string> = {
  created: null,
  updated: null,
  trip_updated: "giu",
  order_leg_added: "giu",
  order_leg_updated: "giu",
  order_leg_closed: "giu",
  order_leg_short_notice: "Đặt gấp — Quản trị đã duyệt", // quy tắc R-P21 đã có từ trước (lichSuTheoVai): người làm là "Quản trị"
  order_passenger_changed: "giu",
  confirmed: null,
  cancelled: "Công ty huỷ", // chỉ nhãn NHÓM lý do huỷ (công khai sẵn ở khối cọc); câu tự do bị bỏ
  order_cancelled_by_field: null,
  order_money_adjusted: "số khách: Tour đảo: người lớn 4 → 3", // cắt trước " · lý do: "
  order_money_adjusted_by_field: "số khách: Tour đảo: người lớn 4 → 3",
  payment_recorded: "giu",
  order_delivered: null,
  order_completed: null,
};

/** Chi tiết gieo cho từng hành động: chứa MẬT để thấy rõ chỗ nào rò. */
const MAT = "MAT-NOI-BO-7391";
function chiTietGieo(a: AuditAction): string {
  if (a === "cancelled") return `${MAT} tự do (Công ty huỷ)`; // khuôn thật: "<nhãn lý do hoặc ghi chú tự do> (<nhãn nhóm>)"
  if (a === "order_money_adjusted" || a === "order_money_adjusted_by_field") return `số khách: Tour đảo: người lớn 4 → 3 · lý do: ${MAT}`;
  if (a === "order_leg_short_notice") return `Chiều đi${DAU_DAT_GAP}${MAT}`;
  if (CHO_PHEP[a] === "giu") return `${a} chữ cố định của đơn`; // hành động giữ nguyên chi tiết: khuôn không chứa chữ nội bộ
  return `${a} ${MAT}`;
}

/** Đơn nháp (gieo SQL) của `chu`, một dịch vụ — chỉ để có nơi gắn dòng nhật ký. */
function nhapDon(w: W, chu: string): string {
  const id = uuid();
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, created_at, updated_at)
    VALUES (?, ?, ?, 'draft', 'Khách Giả', '0900000099', 1000000, 1000000, 1000000, ?, ?)`).run(id, `TD-LS-${seq}`, chu, AT, AT);
  w.sqlite.prepare(`INSERT INTO order_service (id, order_id, sort_order, name, unit, pax_adult, depart_date) VALUES (?, ?, 0, 'DV', 'manual', 1, ?)`).run(`${id}-s`, id, NGAY);
  w.sqlite.prepare(`INSERT INTO order_item (id, order_id, service_id, description, quantity, unit_price, line_total) VALUES (?, ?, ?, 'Người lớn', 1, 1000000, 1000000)`).run(`${id}-i`, id, `${id}-s`);
  return id;
}
/** Mỗi hành động của AUDIT_ACTIONS MỘT dòng nhật ký gắn đơn, người làm = `nguoi`. Dòng sau cùng: dòng `created` do chính `chu` làm (đối chứng "tên mình giữ nguyên"). */
function gieoMoiHanhDong(w: W, orderId: string, nguoi: string): void {
  let i = 0;
  const ghi = w.sqlite.prepare("INSERT INTO audit_log (id, order_id, staff_id, action, target_type, target_id, detail, created_at) VALUES (?, ?, ?, ?, 'order', ?, ?, ?)");
  for (const a of Object.keys(AUDIT_ACTIONS) as AuditAction[]) ghi.run(uuid(), orderId, nguoi, a, orderId, chiTietGieo(a), `2026-10-02T00:${String(Math.floor(i / 60)).padStart(2, "0")}:${String(i++ % 60).padStart(2, "0")}.000Z`);
}
const lichSu = async (w: W, as: string, id: string) => {
  const r = await w.call("GET", `/api/orders/${id}`, { as });
  assert.equal(r.status, 200, r.text);
  return r.json.history as { action: string; staffId: string | null; staffName: string; at: string; detail: string | null }[];
};

function dungWorld(): W {
  const w = setup();
  seedStaff(w.sqlite, { id: HYB, phone: "0900000012", name: "Sơn Lai Bán", perms: ["SALES", "PARTNER"] });
  return w;
}

test("D-1 (a) tái hiện: Đối tác không thấy lý do nội bộ, tên Kế toán, dòng sổ tiền qua lịch sử đơn và khối cọc; Kế toán / Toàn quyền vẫn thấy đủ", async () => {
  const w = dungWorld();
  const pr = await w.call("POST", "/api/orders", {
    as: PARTNER,
    body: { customerName: "Khách Đối Tác", customerPhone: "0933333333", services: [{ kind: "catalog", catalogCode: "ZA1", pax: { adult: 1, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 777000 }, departDate: NGAY, legs: [] }] },
  });
  assert.equal(pr.status, 201, pr.text);
  const id = pr.json.order.id;
  assert.equal((await w.call("POST", `/api/orders/${id}/status`, { as: PARTNER, body: { status: "confirmed" } })).status, 200);
  assert.equal((await w.call("POST", `/api/orders/${id}/payments`, { as: PARTNER, body: { soTien: 300000, hinhThuc: "CASH", nguoiThu: "cong_ty" } })).status, 201);
  const lt = (await w.call("GET", `/api/orders/${id}/payments`, { as: ACC })).json.lanThu[0];
  assert.equal((await w.call("POST", `/api/ledger/company-receipts/${lt.id}/confirm`, { as: ACC, body: {} })).status, 200);
  assert.equal((await w.call("POST", `/api/orders/${id}/status`, { as: SUP, body: { status: "cancelled", lyDo: "THOI_TIET" } })).status, 200);
  const dd = await w.call("POST", `/api/orders/${id}/coc/duyet`, { as: SUP, body: { loai: "hoan", soTien: 100000, lyDo: LY_DO } });
  assert.equal(dd.status, 201, dd.text);

  const pay = await w.call("GET", `/api/orders/${id}/payments`, { as: PARTNER });
  assert.equal(pay.status, 200, pay.text);
  const ord = await w.call("GET", `/api/orders/${id}`, { as: PARTNER });
  assert.equal(ord.status, 200, ord.text);
  const hs = JSON.stringify(ord.json.history);
  assert.ok(!JSON.stringify(pay.json).includes(LY_DO), "payments lộ lý do duyệt hoàn");
  assert.ok(!hs.includes(LY_DO), "history lộ lý do duyệt hoàn");
  assert.ok(!hs.includes("Kế Toán"), "history lộ tên Kế toán");
  assert.ok(!hs.includes("ledger_company_received") && !hs.includes("deposit_refund_approved"), "history lộ dòng sổ tiền / duyệt hoàn");
  assert.ok(!JSON.stringify(pay.json.coc.khoanDuyet).match(/"(lyDo|nguoiDuyet)"/), "khoanDuyet còn khoá lyDo / nguoiDuyet");
  // Đơn vẫn đọc được đủ ý: tạo, xác nhận, huỷ có mặt; khối cọc vẫn có số tiền.
  const acts = (ord.json.history as { action: string }[]).map((e) => e.action);
  for (const a of ["created", "confirmed", "cancelled"]) assert.ok(acts.includes(a), `Đối tác mất dòng ${a}`);
  for (const e of ord.json.history as { action: string; staffId: string | null; staffName: string }[]) assert.deepEqual([e.staffId, e.staffName], [null, ""], `Đối tác thấy người làm ở ${e.action}`); // ADR-0131 đ2
  assert.equal(pay.json.coc.khoanDuyet.length, 1);
  assert.equal(pay.json.coc.khoanDuyet[0].soTien, 100000);

  // Đối chứng (răng): người nội bộ vẫn thấy đủ.
  for (const as of [ACC, SUP, ADM]) {
    const h = JSON.stringify((await w.call("GET", `/api/orders/${id}`, { as })).json.history);
    assert.ok(h.includes(LY_DO) && h.includes("ledger_company_received"), "người nội bộ mất dòng sổ tiền / lý do");
  }
  const pk = (await w.call("GET", `/api/orders/${id}/payments`, { as: ACC })).json.coc.khoanDuyet[0];
  assert.equal(pk.lyDo, LY_DO);
  assert.equal(pk.nguoiDuyet, "Chủ");
});

test("D-1 (b) mọi hành động của audit-actions.ts: Đối tác (và tài khoản lai) chỉ thấy danh sách cho phép, chi tiết đã rút gọn đúng cách từng hành động", async () => {
  const w = dungWorld();
  const doiTac = nhapDon(w, PARTNER);
  const lai = nhapDon(w, HYB);
  for (const don of [doiTac, lai]) gieoMoiHanhDong(w, don, ACC);
  const nhapKt = HANH_DONG_NHAP_KE_TOAN as readonly string[];
  // Đối tác thuần: đúng danh sách cho phép. Tài khoản lai SALES+PARTNER: danh sách cho phép + hai dòng nhập kế toán (ADR-0060 điều 3 (ii): luật theo ô, lai thấy).
  for (const [as, don, ten, laLai] of [[PARTNER, doiTac, "Đối tác thuần", false], [HYB, lai, "SALES+PARTNER", true]] as const) {
    const h = await lichSu(w, as, don);
    const mongDoi = [...Object.keys(CHO_PHEP), ...(laLai ? nhapKt : [])].sort();
    assert.deepEqual([...new Set(h.map((e) => e.action))].sort(), mongDoi, `${ten}: tập hành động phải đúng danh sách cho phép`);
    assert.equal(h.length, mongDoi.length, `${ten}: mỗi hành động một dòng`);
    for (const e of h) {
      // ADR-0131 đ2: MỌI dòng trả cho Đối tác không tên, không mã người làm (kể cả dòng nhập kế toán của tài khoản lai và nhãn "Quản trị" của dòng đặt gấp).
      assert.deepEqual([e.staffId, e.staffName], [null, ""], `${ten}: ${e.action} còn người làm`);
      if (nhapKt.includes(e.action)) { assert.equal(e.detail, chiTietGieo(e.action as AuditAction), `${ten}: ${e.action} phải nguyên văn`); continue; }
      const cach = CHO_PHEP[e.action];
      assert.ok(cach !== undefined, `hành động ngoài danh sách: ${e.action}`);
      assert.ok(!JSON.stringify(e).includes(MAT), `${ten}: ${e.action} lộ chữ nội bộ (${e.detail})`);
      if (e.action === "order_leg_short_notice") { assert.ok(e.detail?.endsWith(String(cach))); continue; } // R-P21, kể cả tài khoản lai
      if (cach === "giu") assert.equal(e.detail, chiTietGieo(e.action as AuditAction), `${ten}: ${e.action} phải giữ chi tiết`);
      else if (cach === null) assert.equal(e.detail, null, `${ten}: ${e.action} phải bỏ chi tiết`);
      else assert.equal(e.detail, cach, `${ten}: ${e.action} chi tiết "${e.detail}"`);
    }
  }
});

test("D-1 (c) người nội bộ (Kế toán, Quản trị, Toàn quyền, người lập Bán hàng) vẫn thấy ĐỦ mọi hành động; tên và chi tiết nguyên văn", async () => {
  const w = dungWorld();
  const tatCa = Object.keys(AUDIT_ACTIONS) as AuditAction[];
  const donCuaBan = nhapDon(w, SALES);
  gieoMoiHanhDong(w, donCuaBan, ACC);
  for (const [as, quyen] of [[ACC, ["ACCOUNTING"]], [ADM, ["ADMIN"]], [SUP, ["SUPER_ADMIN"]], [SALES, ["SALES"]]] as [string, PermissionCode[]][]) {
    const h = await lichSu(w, as, donCuaBan);
    const xemNhapKt = can({ id: as, permissions: quyen }, "accounting.entry.view", { ownerId: SALES, assigned: false });
    const mong = tatCa.filter((a) => xemNhapKt || !(HANH_DONG_NHAP_KE_TOAN as readonly string[]).includes(a));
    assert.deepEqual(h.map((e) => e.action).sort(), mong.sort(), `${quyen.join("+")}: tập hành động`);
    for (const e of h) {
      if (e.action === "order_leg_short_notice") continue; // R-P21: dòng đặt gấp rút gọn theo vai (đã có từ trước, bài dat-gap canh)
      assert.equal(e.detail, chiTietGieo(e.action as AuditAction), `${quyen.join("+")}: ${e.action} mất chi tiết`);
      assert.equal(e.staffName, "Kế Toán", `${quyen.join("+")}: ${e.action} mất tên người làm`);
    }
  }
});

test("D-1 (d) khối cọc và lần thu của Đối tác bỏ lyDo / nguoiDuyet / nguoiGhi / ghiChu nội bộ; lần thu CHÍNH mình ghi giữ nguyên; Kế toán thấy đủ", async () => {
  const w = dungWorld();
  const moi = async () => {
    const r = await w.call("POST", "/api/orders", {
      as: PARTNER,
      body: { customerName: "Khách Đối Tác", customerPhone: "0933333333", services: [{ kind: "catalog", catalogCode: "ZA1", pax: { adult: 1, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 777000 }, departDate: NGAY, legs: [] }] },
    });
    assert.equal(r.status, 201, r.text);
    assert.equal((await w.call("POST", `/api/orders/${r.json.order.id}/status`, { as: PARTNER, body: { status: "confirmed" } })).status, 200);
    return r.json.order.id as string;
  };
  // Đơn 1: lần thu của Đối tác (ghi chú của mình) + lần thu của Kế toán (ghi chú nội bộ); huỷ; duyệt hoàn.
  const id = await moi();
  assert.equal((await w.call("POST", `/api/orders/${id}/payments`, { as: PARTNER, body: { soTien: 100000, hinhThuc: "CASH", nguoiThu: "cong_ty", ghiChu: "Ghi chú của đối tác" } })).status, 201);
  assert.equal((await w.call("POST", `/api/orders/${id}/payments`, { as: ACC, body: { soTien: 200000, hinhThuc: "CASH", nguoiThu: "cong_ty", ghiChu: `${MAT} kế toán` } })).status, 201);
  assert.equal((await w.call("POST", `/api/orders/${id}/status`, { as: SUP, body: { status: "cancelled", lyDo: "THOI_TIET" } })).status, 200);
  assert.equal((await w.call("POST", `/api/orders/${id}/coc/duyet`, { as: SUP, body: { loai: "hoan", soTien: 50000, lyDo: LY_DO } })).status, 201);
  // Đơn 2 (huỷ CŨ — như câu gieo của migration 0078): dòng "đã hoàn ngoài hệ thống" có lý do + người ghi.
  const cu = await moi();
  assert.equal((await w.call("POST", `/api/orders/${cu}/payments`, { as: ACC, body: { soTien: 300000, hinhThuc: "CASH", nguoiThu: "cong_ty" } })).status, 201);
  w.sqlite.prepare(`INSERT INTO ord_cancel_reason (id, order_id, reason_code, group_code, note, cancelled_date, reclassifies_id, legacy, created_at, created_by, updated_at, updated_by)
    VALUES ('lydo-cu', ?, 'LEGACY', 'CHUA_KET_LUAN', NULL, '2026-09-01', NULL, 1, ?, 'he-thong', ?, 'he-thong')`).run(cu, AT, AT);
  w.sqlite.prepare("UPDATE orders SET status = 'cancelled' WHERE id = ?").run(cu);
  assert.equal((await w.call("POST", `/api/orders/${cu}/coc/hoan-ngoai`, { as: SUP, body: { soTien: 100000, lyDo: `Đã chuyển khoản tay: ${LY_DO}` } })).status, 201);

  const pt = (await w.call("GET", `/api/orders/${id}/payments`, { as: PARTNER })).json;
  const kt = (await w.call("GET", `/api/orders/${id}/payments`, { as: ACC })).json;
  const ptCu = (await w.call("GET", `/api/orders/${cu}/payments`, { as: PARTNER })).json;
  const ktCu = (await w.call("GET", `/api/orders/${cu}/payments`, { as: ACC })).json;
  const khoa = (o: unknown, k: string) => Object.hasOwn(o as object, k);

  for (const d of pt.coc.khoanDuyet) for (const k of ["lyDo", "nguoiDuyet"]) assert.ok(!khoa(d, k), `khoanDuyet còn khoá ${k}`);
  for (const d of ptCu.coc.hoanNgoaiDong) for (const k of ["lyDo", "nguoiGhi"]) assert.ok(!khoa(d, k), `hoanNgoaiDong còn khoá ${k}`);
  assert.ok(!JSON.stringify([pt, ptCu]).includes(LY_DO), "DTO tiền của Đối tác lộ lý do");
  assert.ok(!JSON.stringify([pt, ptCu]).includes(MAT), "DTO tiền của Đối tác lộ ghi chú nội bộ");
  // Số tiền và trạng thái vẫn đủ cho màn hình Đối tác.
  assert.deepEqual([pt.coc.khoanDuyet[0].soTien, ptCu.coc.hoanNgoaiDong[0].soTien, ptCu.coc.hoanNgoaiDong[0].trangThai], [50000, 100000, "cho_xac_nhan"]);
  // Lần thu: người ghi / ghi chú CHỈ ở dòng chính Đối tác ghi.
  const cua = (j: { lanThu: Record<string, unknown>[] }, soTien: number) => j.lanThu.find((l) => l.soTien === soTien)!;
  assert.equal(cua(pt, 100000).ghiChu, "Ghi chú của đối tác");
  assert.equal(cua(pt, 100000).nguoiGhi, "Đối Tác");
  for (const k of ["nguoiGhi", "ghiChu"]) assert.ok(!khoa(cua(pt, 200000), k), `lần thu của Kế toán còn khoá ${k} với Đối tác`);

  // Đối chứng (răng): Kế toán vẫn thấy đủ.
  assert.equal(kt.coc.khoanDuyet[0].lyDo, LY_DO);
  assert.equal(kt.coc.khoanDuyet[0].nguoiDuyet, "Chủ");
  assert.equal(ktCu.coc.hoanNgoaiDong[0].nguoiGhi, "Chủ");
  assert.ok(String(ktCu.coc.hoanNgoaiDong[0].lyDo).includes(LY_DO));
  assert.equal(cua(kt, 200000).ghiChu, `${MAT} kế toán`);
  assert.equal(cua(kt, 200000).nguoiGhi, "Kế Toán");
});

test("D-1 (e) mọi hành động của audit-actions.ts đã được PHÂN LOẠI cho Đối tác (thêm hành động mới mà chưa phân loại thì bài đỏ)", async () => {
  const m = await import("./shared/lich-su-doi-tac.ts");
  const tatCa = Object.keys(AUDIT_ACTIONS);
  const chuaPhanLoai = tatCa.filter((a) => !m.daPhanLoaiChoDoiTac(a));
  assert.deepEqual(chuaPhanLoai, [], "hành động nhật ký chưa phân loại cho Đối tác (lich-su-doi-tac.ts: thêm vào CHO_PHEP hoặc AN)");
  assert.deepEqual(Object.keys(m.LICH_SU_DOI_TAC_CHO_PHEP).sort(), Object.keys(CHO_PHEP).sort(), "danh sách cho phép trong mã khác danh sách chủ duyệt trong bài");
  for (const a of Object.keys(m.LICH_SU_DOI_TAC_CHO_PHEP)) assert.ok(!(m.LICH_SU_DOI_TAC_AN as readonly string[]).includes(a), `${a} vừa cho phép vừa ẩn`);
});

test("D-1 (f) dòng sửa số khách KIỂU CŨ (chữ lý do tự gõ, không có dấu ' · lý do: ') không lộ cho Đối tác thuần và tài khoản lai — cắt kiểu đóng (fail-closed)", async () => {
  const w = dungWorld();
  const CHU_TU_DO = "MATLEGACYHDV";
  for (const [as, chu] of [[PARTNER, PARTNER], [HYB, HYB]] as const) {
    const don = nhapDon(w, chu);
    const ghi = w.sqlite.prepare("INSERT INTO audit_log (id, order_id, staff_id, action, target_type, target_id, detail, created_at) VALUES (?, ?, ?, ?, 'order', ?, ?, ?)");
    ghi.run(uuid(), don, ACC, "order_money_adjusted_by_field", don, CHU_TU_DO, "2026-10-02T00:00:00.000Z");
    ghi.run(uuid(), don, ACC, "order_money_adjusted", don, `${CHU_TU_DO} văn phòng`, "2026-10-02T00:00:01.000Z");
    const h = await lichSu(w, as, don);
    assert.equal(h.filter((e) => e.action.startsWith("order_money_adjusted")).length, 2, "dòng vẫn hiện (chỉ chữ chi tiết bị bỏ)");
    assert.ok(!JSON.stringify(h).includes(CHU_TU_DO), `${as}: chữ lý do tự gõ kiểu cũ lộ cho Đối tác`);
  }
});
