// Sổ vàng golden/dat-coc-truoc.json (ADR-0159). LỚP 1: ca tự cân, ca chờ xác nhận không có tên người. LỚP 2: chạy từng ca trên đường thật, đọc lại từ sổ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { seedStaff } from "../tests/audit/harness.mjs";
import { ACC, ADM, PARTNER, datCo, inDays, setup, svc } from "../tests/audit/xac-nhan-khung.mjs";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const AT = "2026-10-01T00:00:00.000Z";
const HUONG = "88888888-8888-4888-8888-888888888801";
// ADR-0185: tài khoản giữ quyền Đối tác mà không phải người hưởng không Gửi đơn được nữa. Ca «người lập không phải bên đặt được hưởng» tự xác nhận nay dựng bằng
// Đối tác kiểu cũ (nháp không bên đặt) ĐÃ THÔI quyền Đối tác rồi tự xác nhận (đường b3 của dat-coc-route.test.ts) — sổ vàng giữ nguyên số. Ca Hết vé không có dòng sổ nào,
// không phụ thuộc người hưởng: Đối tác có vai trò mở yêu cầu như cũ.
const DT_CU = "88888888-8888-4888-8888-888888888803";
const cases = (JSON.parse(readFileSync(join(ROOT, "golden/dat-coc-truoc.json"), "utf8")) as { cac_ca: any[] }).cac_ca;

test("sổ vàng đặt cọc LỚP 1: đủ bốn ca, chờ xác nhận không tên người, giữ hộ bằng khách đã trả", () => {
  assert.deepEqual(cases.map((c) => c.ma), ["SV-DC-01", "SV-DC-02", "SV-DC-03", "SV-DC-04"]);
  for (const c of cases) {
    if (c.xac_nhan.trang_thai === "cho_xac_nhan") assert.equal(c.xac_nhan.nguoi, null, c.ma);
    else assert.ok(c.xac_nhan.nguoi && c.xac_nhan.ngay, c.ma);
    assert.equal(c.dap_an.doi_tac_giu_ho, c.dap_an.khach_da_tra, c.ma);
  }
});

for (const c of cases) {
  test(`sổ vàng đặt cọc LỚP 2: ${c.ma} — ${c.mo_ta}`, async () => {
    const w = setup();
    seedStaff(w.sqlite, { id: HUONG, phone: "0900000021", name: "Đối Tác Hưởng", perms: ["PARTNER"] });
    seedStaff(w.sqlite, { id: DT_CU, phone: "0900000023", name: "Đối Tác Kiểu Cũ", perms: ["PARTNER"], kieuCu: true });
    const d = c.dau_vao;
    const thoiQuyen = !d.nguoi_lap_huong && d.duong === "gui_don";
    const nguoi = d.nguoi_lap_huong ? HUONG : thoiQuyen ? DT_CU : PARTNER;
    const canXet = d.duong !== "gui_don";
    if (canXet) datCo(w, "SERVICE", "ZB1", true);
    const lap = await w.call("POST", "/api/orders", { as: nguoi, body: { customerName: "Khách Thử", customerPhone: "0912345678", services: [svc("ZB1", inDays(d.sau === "da_giao" ? 0 : 3))], declaredDeposit: d.khai } });
    assert.equal(lap.status, 201, lap.text);
    const id = lap.json.order.id as string;
    if (thoiQuyen) w.sqlite.prepare("UPDATE stf_permission SET permission_type_code = 'SALES' WHERE staff_id = ? AND permission_type_code = 'PARTNER'").run(nguoi);
    const gui = thoiQuyen
      ? await w.call("POST", `/api/orders/${id}/status`, { as: nguoi, body: { status: "confirmed" } })
      : await w.call("POST", `/api/orders/${id}/gui-don`, { as: nguoi, body: {} });
    assert.equal(gui.status, canXet ? 201 : 200, gui.text);
    if (canXet) {
      const xem = (await w.call("GET", `/api/orders/${id}`, { as: ADM })).json;
      const ket = d.duong === "con_ve" ? "CON_VE" : "HET_VE";
      const qd = await w.call("POST", `/api/orders/${id}/quyet-dinh`, { as: ADM, body: { ketQua: ket, yeuCauId: xem.xacNhan.yeuCau.id, updatedAt: xem.order.updatedAt } });
      assert.equal(qd.status, 200, qd.text);
    }
    if (d.hoa_hong_ty_le_bp) {
      const don = (await w.call("GET", `/api/orders/${id}`, { as: ACC })).json.order;
      const m = await w.call("POST", `/api/orders/${id}/thuong-mai/${don.services[0].id}`, { as: ACC, body: { lyDo: "Khung thử ghi mức tay", hoaHong: { kieu: "RATE", tyLeBp: d.hoa_hong_ty_le_bp } } });
      assert.equal(m.status, 200, m.text);
    }
    if (d.sau === "da_giao") {
      const g = await w.call("POST", `/api/orders/${id}/delivered`, { as: ADM, body: {} });
      assert.equal(g.status, 200, g.text);
    }
    if (d.sau === "huy") {
      const h = await w.call("POST", `/api/orders/${id}/status`, { as: nguoi, body: { status: "cancelled", lyDo: "KHACH_DOI_Y" } });
      assert.equal(h.status, 200, h.text);
    }
    const thu = w.q("SELECT * FROM bil_payment_receipt WHERE order_id = ?", id);
    assert.equal(thu.length > 0 ? thu[0].collector_role_code : null, c.dap_an.vai_nguoi_thu, c.ma);
    assert.equal(thu.reduce((s: number, r: any) => s + Number(r.amount), 0), c.dap_an.khach_da_tra, `${c.ma}: khách đã trả`);
    const ben = `pty-${nguoi}`;
    const dong = w.q("SELECT * FROM bil_debt_line WHERE order_id = ?", id);
    assert.equal(dong.filter((l: any) => l.kind_code === "HELD" && l.debtor_party_id === ben).reduce((s: number, l: any) => s + Number(l.amount), 0), c.dap_an.doi_tac_giu_ho, `${c.ma}: giữ hộ`);
    assert.equal(dong.reduce((s: number, l: any) => s + (l.debtor_party_id === ben ? Number(l.amount) : l.creditor_party_id === ben ? -Number(l.amount) : 0), 0), c.dap_an.no_tour_dao, `${c.ma}: nợ công ty`);
    const tien = (await w.call("GET", `/api/orders/${id}/payments`, { as: ACC })).json;
    assert.equal(tien.conLai ?? 0, c.dap_an.khach_con_phai_tra, `${c.ma}: khách còn phải trả ${JSON.stringify(tien).slice(0, 200)}`);
  });
}
