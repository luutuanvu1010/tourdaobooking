// ADR-0133 Task 4: chụp ba số «mỗi khách theo loại» lúc Xác nhận (điều 3) và tính hoa hồng theo bản chụp khi văn phòng sửa số khách (ADR-0063). Route thật qua khung thử.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
const ID = { SALES: "11111111-1111-4111-8111-111111111111", ACC: "44444444-4444-4444-8444-444444444444" } as const;
const AT = "2026-10-01T00:00:00.000Z";
type W = ReturnType<typeof world>;
type Pax = { adult: number; child: number; senior: number; infant: number };
const vnDay = (n: number) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);

function setup(): W {
  const w = world();
  seedStaff(w.sqlite, { id: ID.SALES, phone: "0900000201", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ID.ACC, phone: "0900000203", name: "Cúc", perms: ["ACCOUNTING"] });
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, price_child, price_senior, price_infant, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 500000, 300000, 400000, 50000, 1, '2026-01-01', '2026-01-01')");
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('pty-dla', 'ORGANIZATION', 'Đại lý A', 1, ?, ?)").run(AT, AT);
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES ('r-dla', 'pty-dla', 'TRAVEL_AGENCY', '2026-01-01', ?, ?)").run(AT, AT);
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('pty-ncc', 'ORGANIZATION', 'i-resort', 1, ?, ?)").run(AT, AT);
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES ('r-ncc', 'pty-ncc', 'SUPPLIER', '2026-01-01', ?, ?)").run(AT, AT);
  return w;
}
const muc = (w: W, body: Record<string, unknown>) =>
  w.call("POST", "/api/pricing/hoa-hong", { as: ID.ACC, body: { doiTuong: { loai: "VAI", code: "TRAVEL_AGENCY" }, phamVi: "ALL", kieu: "PER_PAX", moiKhach: 50_000, tuNgay: "2026-01-01", ...body } });
async function donXacNhan(w: W, pax: Pax): Promise<{ id: string; svc: string }> {
  const r = await w.call("POST", "/api/orders", { as: ID.SALES, body: { customerName: "Khách Thử", customerPhone: "0912345678", discount: 0,
    services: [{ kind: "catalog", catalogCode: "ZA1", pax, catalogPriceSeen: { adult: 500000, child: 300000, senior: 400000, infant: 50000 }, departDate: vnDay(3) }] } });
  assert.equal(r.status, 201, r.text);
  const id = r.json.order.id as string;
  w.sqlite.prepare("UPDATE orders SET booker_party_id = 'pty-dla' WHERE id = ?").run(id);
  // ADR-0134: mỗi dịch vụ phải chọn Đón / Không đón mới xác nhận được; bài này không xét đưa đón.
  w.sqlite.prepare("UPDATE order_service SET pickup_choice = 'KHONG_DON' WHERE order_id = ?").run(id);
  assert.equal((await w.call("POST", `/api/orders/${id}/status`, { as: ID.SALES, body: { status: "confirmed" } })).status, 200);
  return { id, svc: r.json.order.services[0].id as string };
}
const thuongMai = async (w: W, id: string) => {
  const r = await w.call("GET", `/api/orders/${id}/thuong-mai`, { as: ID.ACC });
  assert.equal(r.status, 200, r.text);
  return r.json.vanPhong.dong[0] as { hoaHong: number | null; muc: string | null };
};

test("xác nhận đơn đại lý: bản chụp có đủ ba số; hoa hồng = Σ số người × số tiền từng loại, em bé không tính (170.000)", async () => {
  const w = setup();
  assert.equal((await muc(w, { theoLoai: { treEm: 30_000, nguoiCaoTuoi: 40_000 } })).status, 201);
  const { id } = await donXacNhan(w, { adult: 2, child: 1, senior: 1, infant: 1 });
  const phu = w.q("SELECT p.adult_amount, p.child_amount, p.senior_amount FROM ord_service_terms_pax p JOIN ord_service_terms t ON t.id = p.terms_id WHERE t.order_id = ?", id);
  assert.equal(phu.length, 1);
  assert.deepEqual([phu[0].adult_amount, phu[0].child_amount, phu[0].senior_amount], [50_000, 30_000, 40_000]);
  const d = await thuongMai(w, id);
  assert.equal(d.hoaHong, 170_000);
  assert.match(String(d.muc), /trẻ em/);
});

test("văn phòng sửa số khách sau xác nhận ⇒ hoa hồng tính lại theo ba số ĐÃ CHỤP; đóng mức hay đổi mức về sau không làm đổi đơn cũ", async () => {
  const w = setup();
  const m = await muc(w, { theoLoai: { treEm: 30_000, nguoiCaoTuoi: 40_000 } });
  const { id, svc } = await donXacNhan(w, { adult: 2, child: 1, senior: 1, infant: 1 });
  const bot: Pax = { adult: 1, child: 1, senior: 0, infant: 0 };
  const r = await w.call("POST", `/api/orders/${id}/money-edit`, { as: ID.ACC, body: { lyDo: "BOT_NGUOI", services: [{ id: svc, pax: bot }] } });
  assert.equal(r.status, 200, r.text);
  assert.equal((await thuongMai(w, id)).hoaHong, 80_000, "1 người lớn × 50.000 + 1 trẻ em × 30.000");
  // Đóng dòng mức (đổi mức = đóng dòng cũ, thêm dòng mới): đơn đã chụp không đổi.
  const dong = await w.call("POST", `/api/pricing/hoa-hong/${m.json.dong.id}/dong`, { as: ID.ACC, body: { denNgay: vnDay(0) } });
  assert.equal(dong.status, 200, dong.text);
  assert.equal((await thuongMai(w, id)).hoaHong, 80_000);
});

test("mức đ/khách KHÔNG khai theo loại: không có dòng phụ, hoa hồng như cũ (một số × người lớn + trẻ em + người cao tuổi)", async () => {
  const w = setup();
  assert.equal((await muc(w, {})).status, 201);
  const { id } = await donXacNhan(w, { adult: 2, child: 1, senior: 1, infant: 1 });
  assert.equal(w.q("SELECT 1 FROM ord_service_terms_pax").length, 0);
  assert.equal((await thuongMai(w, id)).hoaHong, 200_000);
});

test("đơn nháp (tính thử) cũng theo ba số của mức hiện hành", async () => {
  const w = setup();
  assert.equal((await muc(w, { theoLoai: { treEm: 30_000, nguoiCaoTuoi: 40_000 } })).status, 201);
  const r = await w.call("POST", "/api/orders", { as: ID.SALES, body: { customerName: "Khách Thử", customerPhone: "0912345678", discount: 0,
    services: [{ kind: "catalog", catalogCode: "ZA1", pax: { adult: 2, child: 1, senior: 1, infant: 0 }, catalogPriceSeen: { adult: 500000, child: 300000, senior: 400000, infant: 50000 }, departDate: vnDay(3) }] } });
  assert.equal(r.status, 201, r.text);
  const id = r.json.order.id as string;
  w.sqlite.prepare("UPDATE orders SET booker_party_id = 'pty-dla' WHERE id = ?").run(id);
  // ADR-0134: mỗi dịch vụ phải chọn Đón / Không đón mới xác nhận được; bài này không xét đưa đón.
  w.sqlite.prepare("UPDATE order_service SET pickup_choice = 'KHONG_DON' WHERE order_id = ?").run(id);
  assert.equal((await thuongMai(w, id)).hoaHong, 170_000);
});

const ghiTay = (w: W, id: string, svc: string, body: unknown) => w.call("POST", `/api/orders/${id}/thuong-mai/${svc}`, { as: ID.ACC, body });

test("ghi tay CHỈ đổi người bán ⇒ giữ ba số: bản ghi tay mới có dòng phụ, hoa hồng vẫn 170.000 (lỗi người kiểm 19/10)", async () => {
  const w = setup();
  assert.equal((await muc(w, { theoLoai: { treEm: 30_000, nguoiCaoTuoi: 40_000 } })).status, 201);
  const { id, svc } = await donXacNhan(w, { adult: 2, child: 1, senior: 1, infant: 1 });
  const r = await ghiTay(w, id, svc, { lyDo: "mua lại từ i-resort theo hợp đồng", nguoiBan: { partyId: "pty-ncc", tyLeMuaBp: 8000 } });
  assert.equal(r.status, 200, r.text);
  assert.equal(w.q("SELECT 1 FROM ord_service_terms WHERE order_id = ? AND source = 'MANUAL'", id).length, 1);
  const phu = w.q("SELECT p.adult_amount, p.child_amount, p.senior_amount FROM ord_service_terms_pax p JOIN ord_service_terms t ON t.id = p.terms_id WHERE t.order_id = ? AND t.source = 'MANUAL'", id);
  assert.equal(phu.length, 1, "bản ghi tay mang đủ ba số");
  assert.deepEqual([phu[0].adult_amount, phu[0].child_amount, phu[0].senior_amount], [50_000, 30_000, 40_000]);
  const d = await thuongMai(w, id);
  assert.equal(d.hoaHong, 170_000);
  assert.match(String(d.muc), /trẻ em/);
});

test("ghi tay ĐỔI MỨC (đ/khách một số) ⇒ bỏ ba số: bản ghi tay không có dòng phụ, hoa hồng theo cách cũ", async () => {
  const w = setup();
  assert.equal((await muc(w, { theoLoai: { treEm: 30_000, nguoiCaoTuoi: 40_000 } })).status, 201);
  const { id, svc } = await donXacNhan(w, { adult: 2, child: 1, senior: 1, infant: 1 });
  const r = await ghiTay(w, id, svc, { lyDo: "thoả thuận riêng với đại lý", hoaHong: { kieu: "PER_PAX", moiKhach: 60_000 } });
  assert.equal(r.status, 200, r.text);
  assert.equal(w.q("SELECT 1 FROM ord_service_terms_pax p JOIN ord_service_terms t ON t.id = p.terms_id WHERE t.order_id = ? AND t.source = 'MANUAL'", id).length, 0);
  assert.equal((await thuongMai(w, id)).hoaHong, 240_000, "60.000 × (2 người lớn + 1 trẻ em + 1 người cao tuổi)");
});

// ---- Dịch vụ «một cấp» tính theo nhóm/lượt (Phao chuối, dù bay): chiết khấu theo LƯỢT (chủ, 19/10) ----
async function donPhaoChuoi(w: W, soNguoi: number): Promise<string> {
  const r = await w.call("POST", "/api/orders", { as: ID.SALES, body: { customerName: "Khách Thử", customerPhone: "0912345678", discount: 0,
    services: [{ kind: "catalog", catalogCode: "PHAO", pax: { adult: soNguoi, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 300000 }, departDate: vnDay(3) }] } });
  assert.equal(r.status, 201, r.text);
  const id = r.json.order.id as string;
  w.sqlite.prepare("UPDATE orders SET booker_party_id = 'pty-dla' WHERE id = ?").run(id);
  // ADR-0134: mỗi dịch vụ phải chọn Đón / Không đón mới xác nhận được; bài này không xét đưa đón.
  w.sqlite.prepare("UPDATE order_service SET pickup_choice = 'KHONG_DON' WHERE order_id = ?").run(id);
  assert.equal((await w.call("POST", `/api/orders/${id}/status`, { as: ID.SALES, body: { status: "confirmed" } })).status, 200);
  return id;
}
const muaPhao = (w: W, body: Record<string, unknown>) => {
  w.sqlite.exec("INSERT OR IGNORE INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('PHAO', 'Phao chuối', 'per5Pax', 300000, 1, '2026-01-01', '2026-01-01')");
  return muc(w, { phamVi: "SERVICE", catalogCode: "PHAO", ...body });
};

test("dịch vụ theo nhóm (Phao chuối, 5 người/lượt), mức «một cấp» 20.000/lượt: 1 người đi cũng một lượt = 20.000; 6 người = 2 lượt = 40.000", async () => {
  const w = setup();
  assert.equal((await muaPhao(w, { moiKhach: 20_000 })).status, 201);
  const mot = await donPhaoChuoi(w, 1);
  assert.equal((await thuongMai(w, mot)).hoaHong, 20_000);
  const sau = await donPhaoChuoi(w, 6);
  assert.equal((await thuongMai(w, sau)).hoaHong, 40_000);
});

test("dịch vụ theo nhóm với mức có ba số theo loại: mỗi lượt lấy số tiền người lớn (không dùng số trẻ em, người cao tuổi)", async () => {
  const w = setup();
  assert.equal((await muaPhao(w, { moiKhach: 20_000, theoLoai: { treEm: 10_000, nguoiCaoTuoi: 15_000 } })).status, 201);
  const mot = await donPhaoChuoi(w, 1);
  assert.equal((await thuongMai(w, mot)).hoaHong, 20_000);
});
