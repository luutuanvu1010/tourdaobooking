// Sổ vàng golden/phan-dinh-trach-nhiem.json (ADR-0116 phụ lục mục 4). LỚP 1 tự cân bằng số học viết tay, bắt ca mẫu viết sai. LỚP 2 chạy từng ca qua route thật. Mọi ca đang "cho_xac_nhan": AI soạn, chờ Kế toán hoặc chủ xác nhận (Hiến pháp N8).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../tests/audit/harness.mjs";
import { gieoBanChup } from "../tests/audit/gieo-ban-chup.mjs";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
type Phieu = { truong_hop: string; ben_chiu: "hdv" | "ke_toan" | "cong_ty"; so_tien: number; co_tien_ra: boolean; cung_nguoi?: boolean; doi_sang?: "hdv"; mong_doi: number; loi?: string };
type Ca = { ma: string; xac_nhan: { trang_thai: string; nguoi: string | null; ngay: string | null }; dau_vao: { phai_thu: number; da_thu: number; sua_khoan_thu_con?: number }; phieu: Phieu[]; dap_an: { giam_tru: number; tra_khach: number; no_ben_chiu: number; da_thu_rong: number } };
const cases = (JSON.parse(readFileSync(join(ROOT, "golden/phan-dinh-trach-nhiem.json"), "utf8")) as { cac_ca: Ca[] }).cac_ca;

test("sổ vàng phân định LỚP 1: đủ 6 ca, chờ xác nhận không có tên người, I1 cân: đã thu ròng = phải thu − giảm trừ", () => {
  assert.deepEqual(cases.map((c) => c.ma), ["SV-PD-01", "SV-PD-02", "SV-PD-03", "SV-PD-04", "SV-PD-05", "SV-PD-06"]);
  for (const c of cases) {
    if (c.xac_nhan.trang_thai === "cho_xac_nhan") assert.equal(c.xac_nhan.nguoi, null, c.ma);
    else assert.ok(c.xac_nhan.nguoi && c.xac_nhan.ngay, `${c.ma}: đã xác nhận phải có tên, ngày`);
    const qua = c.phieu.filter((p) => p.mong_doi === 201);
    const giam = qua.reduce((s, p) => s + p.so_tien, 0);
    const tra = qua.filter((p) => p.co_tien_ra).reduce((s, p) => s + p.so_tien, 0);
    assert.equal(c.dap_an.giam_tru, giam, c.ma);
    assert.equal(c.dap_an.tra_khach, tra, c.ma);
    assert.equal(c.dap_an.da_thu_rong, c.dau_vao.phai_thu - giam, `${c.ma}: I1`);
    assert.ok(giam <= c.dau_vao.phai_thu, c.ma);
  }
});

const SALES = "11111111-1111-4111-8111-111111111111";
const HDV = "22222222-2222-4222-8222-222222222222";
const QT = "33333333-3333-4333-8333-333333333333";
const KT = "44444444-4444-4444-8444-444444444444";
const SA = "55555555-5555-4555-8555-555555555555";
const AT = "2026-09-01T00:00:00.000Z";
const hom = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
let seq = 0;
const uuid = () => `99999999-9999-4999-8999-${String(++seq).padStart(12, "0")}`;

for (const c of cases) {
  test(`sổ vàng phân định LỚP 2: ${c.ma}`, async () => {
    const w = world();
    for (const [i, p, n, q] of [[SALES, "0900000001", "An", "SALES"], [HDV, "0900000002", "Nam", "FIELD"], [QT, "0900000003", "Quản", "ADMIN"], [KT, "0900000005", "Lan", "ACCOUNTING"], [SA, "0900000006", "Toàn", "SUPER_ADMIN"]] as const) seedStaff(w.sqlite, { id: i, phone: p, name: n, perms: [q] });
    const id = uuid();
    const tong = c.dau_vao.phai_thu;
    w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, created_at, updated_at) VALUES (?, ?, ?, 'draft', 'Khách Giả', '0900000099', ?, ?, ?, ?, ?)`).run(id, `TD-${seq}`, SALES, tong, tong, tong, AT, AT);
    w.sqlite.prepare(`INSERT INTO order_service (id, order_id, name, unit, pax_adult, depart_date) VALUES (?, ?, 'Vé', 'perPax', 1, ?)`).run(`${id}-s`, id, hom());
    w.sqlite.prepare(`INSERT INTO order_item (id, order_id, service_id, description, quantity, unit_price, line_total) VALUES (?, ?, ?, 'Người lớn', 1, ?, ?)`).run(`${id}-i`, id, `${id}-s`, tong, tong);
    w.sqlite.prepare(`UPDATE orders SET status = 'confirmed', confirmed_at = ?, updated_at = ? WHERE id = ?`).run(AT, AT, id);
    gieoBanChup(w.sqlite, id);
    w.sqlite.prepare(`INSERT INTO dsp_assignment (id, order_id, task_kind_code, party_id, status_code, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES (?, ?, 'HANDLE', ?, 'PENDING', ?, ?, NULL, ?, NULL)`).run(uuid(), id, `pty-${HDV}`, AT, AT, AT);
    assert.equal((await w.call("POST", `/api/orders/${id}/payments`, { as: KT, body: { soTien: c.dau_vao.da_thu, hinhThuc: "CASH", nguoiThu: "cong_ty" } })).status, 201);
    assert.equal((await w.call("POST", `/api/orders/${id}/delivered`, { as: HDV, body: {} })).status, 200);
    const ben = (x: Phieu["ben_chiu"]) => (x === "hdv" ? `pty-${HDV}` : x === "ke_toan" ? `pty-${SALES}` : undefined);
    for (const p of c.phieu) {
      const q = await w.call("POST", "/api/ledger/phan-dinh", { as: KT, body: { orderId: id, soTien: p.so_tien, lyDo: "Ca sổ vàng phân định" } });
      assert.equal(q.status, 201, q.text);
      const nguoiQuyet = p.cung_nguoi ? SA : QT;
      const r = await w.call("POST", `/api/ledger/phan-dinh/${q.json.id}/quyet`, { as: nguoiQuyet, body: { truongHop: p.truong_hop, soTien: p.so_tien, coTienRa: p.co_tien_ra, lyDo: "Ca sổ vàng phân định", ...(ben(p.ben_chiu) ? { benChiuPartyId: ben(p.ben_chiu) } : {}) } });
      if (r.status !== 201) { // phiếu vượt trần bị chặn sớm ngay lúc phân định (lúc ghi vẫn còn trigger)
        assert.deepEqual([r.status, r.json.error.code], [p.mong_doi, p.loi], r.text);
        continue;
      }
      const nguoiGhi = p.cung_nguoi ? SA : KT;
      const cu = String(w.q("SELECT id FROM bil_payment_receipt WHERE order_id = ? AND kind_code = 'CUSTOMER_PAYMENT' ORDER BY rowid LIMIT 1", id)[0].id);
      const body = p.co_tien_ra ? { hinhThuc: "CASH", nguoiTra: "cong_ty" } : { thay: { cu: [cu], moi: [{ soTien: c.dau_vao.sua_khoan_thu_con, hinhThuc: "CASH", nguoiThu: "cong_ty" }], lyDo: "Khách thật sự chỉ trả ngần này" } };
      const g = await w.call("POST", `/api/ledger/phan-dinh/${r.json.id}/ghi`, { as: nguoiGhi, body });
      assert.equal(g.status, p.mong_doi, g.text);
      if (p.loi) assert.equal(g.json.error.code, p.loi);
      if (p.doi_sang) {
        const goc = String(w.q("SELECT id FROM bil_attribution WHERE order_id = ? AND step_code = 'POSTED'", id)[0].id);
        const d = await w.call("POST", `/api/ledger/phan-dinh/${goc}/doi-ben-chiu`, { as: QT, body: { truongHop: "T6", benChiuPartyId: ben(p.doi_sang), lyDo: "Đã rõ người chịu trách nhiệm" } });
        assert.equal(d.status, 201, d.text);
        assert.equal((await w.call("POST", `/api/ledger/phan-dinh/${d.json.id}/ghi`, { as: KT, body: {} })).status, 201);
      }
    }
    const so = (sql: string, ...a: unknown[]) => Number(w.q(sql, ...a)[0].n);
    assert.equal(so("SELECT giam_tru AS n FROM v_bil_phai_thu_hien_hanh WHERE order_id = ?", id), c.dap_an.giam_tru, "giảm trừ");
    assert.equal(so("SELECT COALESCE(SUM(amount), 0) AS n FROM bil_payment_receipt WHERE order_id = ? AND kind_code = 'CUSTOMER_REFUND' AND reverses_id IS NULL", id), c.dap_an.tra_khach, "trả khách");
    const ct = String(w.q("SELECT party_id FROM v_pty_owner_company")[0].party_id);
    assert.equal(so("SELECT COALESCE(SUM(CASE WHEN creditor_party_id = ?2 THEN amount ELSE -amount END), 0) AS n FROM bil_debt_line WHERE order_id = ?1 AND kind_code = 'ATTRIBUTION'", id, ct), c.dap_an.no_ben_chiu, "nợ bên chịu");
    assert.equal(so("SELECT COALESCE(SUM(CASE WHEN r.kind_code = 'CUSTOMER_REFUND' THEN -r.amount ELSE r.amount END), 0) AS n FROM bil_payment_receipt r WHERE r.order_id = ? AND r.reverses_id IS NULL AND NOT EXISTS (SELECT 1 FROM bil_payment_receipt x WHERE x.reverses_id = r.id)", id), c.dap_an.da_thu_rong, "đã thu ròng");
  });
}
