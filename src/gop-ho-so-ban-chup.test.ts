// Gộp hồ sơ khi hồ sơ phụ là NGƯỜI HƯỞNG trên bản chụp của đơn đã xác nhận chưa giao (ADR-0117 điều 7 / tiêu chí N-11 — «điểm nghi ngờ, phải có bài chạy thật»; sổ đại lý
// đợt 2, kế hoạch Task 11 Step 3). Cả ứng dụng trên SQLite đủ migration (tests/audit/harness.mjs). Bài GHI LẠI sổ thực ra gì sau «Đã giao»; nếu tiền sai thì bài không
// được sửa luật tiền — để `todo` có lý do, ghi Nợ, báo điều phối. Tên người / hồ sơ ở đây là GIẢ.
// Kịch bản: hai hồ sơ cá nhân A (hồ sơ chính) và B (hồ sơ phụ), cùng một loại đối tác do Kế toán tạo (nhóm OTHER, mức 15%), không tài khoản. Đơn của B (bên đặt B) 1 vé
// Hòn Tằm 1.000.000 được Xác nhận ⇒ bản chụp mang người hưởng B, hoa hồng 150.000. Gộp B vào A. Rồi công ty thu đủ 1.000.000 và «Đã giao».
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const SUPER = "33333333-3333-4333-8333-333333333333";
const KT = "44444444-4444-4444-8444-444444444444";
const HDV = "22222222-2222-4222-8222-222222222222";
const AT = "2026-10-01T00:00:00.000Z";
const ID = "97979797-9797-4979-8979-6a6a6a6a6a01";
const SV = `${ID}-s0`;

test("gộp hồ sơ người hưởng B vào A sau Xác nhận, rồi «Đã giao»: sổ ghi gì (ADR-0117 N-11)", async (t) => {
  const w = world();
  for (const [id, phone, name, perms] of [[SALES, "0900000001", "An Bán", ["SALES"]], [SUPER, "0900000003", "Chủ", ["SUPER_ADMIN"]], [KT, "0900000005", "Lan Kế Toán", ["ACCOUNTING"]], [HDV, "0900000002", "Nam HDV", ["FIELD"]]] as const) {
    seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  }
  // Loại đối tác do Kế toán tạo (ADR-0117 — dữ liệu, nhóm OTHER): «Cộng tác viên» có sẵn là vai TÀI KHOẢN (nhóm EXTERNAL) nên hồ sơ không tài khoản không mang được.
  const loai = await w.call("POST", "/api/pricing/loai-doi-tac", { as: SUPER, body: { ten: "Người giới thiệu" } });
  assert.equal(loai.status, 201, loai.text);
  const MA_LOAI = String(loai.json.loai.code);
  const taoHoSo = async (ten: string, so: string): Promise<string> => {
    const r = await w.call("POST", "/api/parties", { as: SUPER, body: { kind: "PERSON", fullName: ten, contacts: [{ kind: "PHONE", value: so }] } });
    assert.equal(r.status, 201, r.text);
    const id = String(r.json.party.id);
    const v = await w.call("POST", `/api/parties/${id}/roles`, { as: SUPER, body: { roleTypeCode: MA_LOAI } });
    assert.equal(v.status, 201, v.text);
    return id;
  };
  const A = await taoHoSo("Trần Hồ Sơ Chính", "0912000201");
  const B = await taoHoSo("Lê Hồ Sơ Phụ", "0912000202");
  const muc = await w.call("POST", "/api/pricing/hoa-hong", { as: KT, body: { tuNgay: "2026-01-01", doiTuong: { loai: "VAI", code: MA_LOAI }, phamVi: "ALL", kieu: "RATE", tyLeBp: 1500 } });
  assert.equal(muc.status, 201, muc.text);
  const homNay = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, discount, total, remaining_amount, booker_party_id, created_at, updated_at)
    VALUES (?, 'TD-GOP1', ?, 'draft', 'Khách Giả', '0900000099', 1000000, 0, 1000000, 1000000, ?, ?, ?)`).run(ID, SALES, B, AT, AT);
  w.sqlite.prepare("INSERT INTO order_service (pickup_choice, id, order_id, sort_order, catalog_code, name, unit, pax_adult, depart_date) VALUES ('KHONG_DON', ?, ?, 0, 'HONTAM', 'Vé Hòn Tằm', 'perPax', 1, ?)").run(SV, ID, homNay);
  w.sqlite.prepare("INSERT INTO order_item (id, order_id, service_id, catalog_code, pax_code, description, quantity, unit_price, catalog_price, line_total) VALUES (?, ?, ?, 'HONTAM', 'adult', 'Người lớn', 1, 1000000, 1000000, 1000000)").run(`${SV}-i`, ID, SV);
  const xn = await w.call("POST", `/api/orders/${ID}/status`, { as: SALES, body: { status: "confirmed" } }); // ADR-0135: đơn nháp chỉ người lập (SALES) xác nhận được
  assert.equal(xn.status, 200, xn.text);
  const chup = () => w.q("SELECT beneficiary_party_id b FROM ord_service_terms t WHERE order_service_id = ? AND NOT EXISTS (SELECT 1 FROM ord_service_terms x WHERE x.supersedes_id = t.id)", SV);
  assert.deepEqual(chup().map((r: Record<string, unknown>) => r.b), [B], "bản chụp lúc Xác nhận: người hưởng B");

  const gop = await w.call("POST", `/api/parties/${B}/merge`, { as: SUPER, body: { intoPartyId: A, xacNhan: "Lê Hồ Sơ Phụ" } });
  t.diagnostic(`gộp B vào A: ${gop.status} ${gop.status === 200 ? "" : gop.text}`);
  assert.equal(gop.status, 200, `gộp phải đi được (B không tài khoản, không việc đang mở): ${gop.text}`);
  const booker = String(w.q("SELECT booker_party_id b FROM orders WHERE id = ?", ID)[0].b);
  const nguoiHuongSau = chup().map((r: Record<string, unknown>) => r.b);
  t.diagnostic(`sau gộp: bên đặt của đơn = ${booker === A ? "A" : booker === B ? "B" : booker}; người hưởng trên bản chụp = ${nguoiHuongSau.map((x) => (x === A ? "A" : x === B ? "B" : String(x))).join(", ")}`);

  const thu = await w.call("POST", `/api/orders/${ID}/payments`, { as: SUPER, body: { soTien: 1_000_000, hinhThuc: "CASH", nguoiThu: "cong_ty" } });
  assert.equal(thu.status, 201, thu.text);
  w.sqlite.prepare(`INSERT INTO dsp_assignment (id, order_id, task_kind_code, party_id, status_code, valid_from_at, created_at, created_by, updated_at, updated_by)
    VALUES ('97979797-9797-4979-8979-6a6a6a6a6a02', ?, 'HANDLE', ?, 'PENDING', ?, ?, NULL, ?, NULL)`).run(ID, `pty-${HDV}`, AT, AT, AT);
  const g = await w.call("POST", `/api/orders/${ID}/delivered`, { as: SUPER, body: {} });
  t.diagnostic(`«Đã giao»: ${g.status} ${g.status === 200 ? "" : g.text}`);
  const ct = String(w.q("SELECT party_id FROM v_pty_owner_company LIMIT 1")[0].party_id);
  const ten = (x: unknown) => (x === ct ? "cong_ty" : x === A ? "A" : x === B ? "B" : String(x));
  const dong = w.q("SELECT kind_code k, debtor_party_id no, creditor_party_id co, amount so FROM bil_debt_line WHERE order_id = ? AND kind_code IN ('HOA_HONG', 'GIAM_GIA_BEN_DAT', 'GIA_VON')", ID)
    .map((r: Record<string, unknown>) => `${String(r.k)} ${ten(r.no)}→${ten(r.co)} ${Number(r.so)}`);
  t.diagnostic(`sổ ghi: ${dong.join("; ") || "(không dòng thương mại)"}`);

  // GHI LẠI hành vi thật (2026-10-19, Task 11): gộp đổi BÊN ĐẶT của đơn sang A nhưng KHÔNG đổi bản chụp (ADR-0079 đ1 «bản chụp quyết» — bản chụp đóng băng); «Đã giao» đi
  // được và ghi đúng MỘT dòng hoa hồng 150.000 (số tiền đúng), nhưng bên nhận là hồ sơ ĐÃ GỘP B, không phải hồ sơ chính A. Số tiền không sai; NGƯỜI nhận là câu hỏi cho chủ
  // dự án (bài `todo` dưới) — bài này ghim hiện trạng để thay đổi nào cũng phải đi qua quyết định đó.
  assert.equal(g.status, 200, `«Đã giao» sau gộp: ${g.text}`);
  assert.equal(booker, A, "gộp đổi bên đặt của đơn sang hồ sơ chính");
  assert.deepEqual(nguoiHuongSau, [B], "bản chụp không đổi khi gộp (đóng băng)");
  assert.deepEqual(dong, ["HOA_HONG cong_ty→B 150000"], "hiện trạng: một dòng hoa hồng 150.000, bên nhận là hồ sơ đã gộp B");
});

test("gộp hồ sơ người hưởng: dòng hoa hồng sau gộp nên ghi cho hồ sơ đã gộp (B, theo bản chụp) hay hồ sơ chính (A)? — CHỜ CHỦ DỰ ÁN QUYẾT", { todo: "ADR-0117 N-11: số tiền đúng (150.000), người nhận là hồ sơ đã gộp B — Kế toán trả hoa hồng / đối chiếu số dư theo A sẽ không thấy dòng này nếu màn số dư không gộp hồ sơ; chủ quyết rồi mới đổi mã (Nợ Task 11)" }, () => {});
