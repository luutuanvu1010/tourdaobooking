// ADR-0230 Đ1 (thi công ADR-0178 Đ2): đơn đối tác toàn vé Tour Đảo có dấu «Trả sau theo dịch vụ» ⇒ Trả sau không cần hạn mức, loại SERVICE chụp lúc xác nhận,
// hạn trả = giờ xác nhận + số giờ nhỏ nhất; nợ tách khỏi hạn mức; vẫn chặn khi có đơn quá hạn; sửa tăng đơn SERVICE hết đủ điều kiện ⇒ 409.
// Route thật trên khung thử (tests/audit/harness.mjs — gốc lắp ráp thật nên danh mục tiêm từ src/index.ts được chạy). Sổ vàng (a)–(d). Tên người, SĐT là GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { seedStaff } from "../tests/audit/harness.mjs";
import { A, SUP, inDays, setup, svc } from "../tests/audit/xac-nhan-khung.mjs";
import { datQuaHan } from "../tests/audit/tra-sau-moc.mjs";

const DT = "88888888-8888-4888-8888-888888888801"; // Đối tác có hồ sơ mang vai được hưởng ⇒ bên đặt = chính hồ sơ này
const BEN = `pty-${DT}`;
const KH = "pty-12121212-1212-4121-8121-121212121212"; // hồ sơ chỉ mang vai Khách
const AT0 = "2026-01-01T00:00:00.000Z";
const GIO = 3_600_000;

type W = ReturnType<typeof setup>;
/**
 * ZA1 (500.000/người lớn): Có vé, vé Tour Đảo. ZC1 (300.000): Có vé, vé Tour Đảo, nhóm NTD. ZH1 (300.000): Có vé, vé hãng ngoài. ZB1 (300.000): không vé.
 * Cờ và nguồn vé gieo thẳng CSDL (route catalog có bài riêng); dấu Trả sau theo dịch vụ đặt QUA ROUTE (Toàn quyền).
 */
function dung(): W {
  const w = setup();
  const s = w.sqlite;
  seedStaff(s, { id: DT, phone: "0900000021", name: "Đối Tác Hưởng", perms: ["PARTNER"] });
  for (const code of ["ZC1", "ZH1"]) s.prepare("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES (?, ?, 'perPax', 300000, 1, '2026-01-01', '2026-01-01')").run(code, `Dịch vụ ${code}`);
  s.prepare("INSERT INTO ctl_group (code, name, sort_order, active, created_at, updated_at) VALUES ('NTD', 'Nhóm vé đảo', 1, 1, ?, ?)").run(AT0, AT0);
  s.prepare("INSERT INTO ctl_service_group (id, service_code, group_code, seq, valid_from_at, created_at, updated_at) VALUES ('g-zc1', 'ZC1', 'NTD', 1, ?, ?, ?)").run(AT0, AT0, AT0);
  for (const code of ["ZC1", "ZH1"]) s.prepare("INSERT INTO ctl_service_ticket_flag (id, scope, code, has_ticket, valid_from_at, created_at, updated_at) VALUES (?, 'SERVICE', ?, 1, ?, ?, ?)").run(`co-ve-${code}`, code, AT0, AT0, AT0);
  for (const code of ["ZA1", "ZC1"]) s.prepare("INSERT INTO ctl_service_ticket_source (id, code, source, valid_from_at, created_at, updated_at) VALUES (?, ?, 'TOUR_DAO', ?, ?, ?)").run(`nv-${code}`, code, AT0, AT0, AT0);
  // Hồ sơ khách lẻ (vai CUSTOMER, không phải đối tác được hưởng).
  s.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'PERSON', 'Khách Lẻ Thử', 1, ?, ?)").run(KH, AT0, AT0);
  s.prepare("INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES (?, 'Khách Lẻ Thử', ?, ?)").run(KH, AT0, AT0);
  s.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, created_at, updated_at) VALUES ('r-kh-1', ?, 'CUSTOMER', NULL, '2026-01-01', ?, ?)").run(KH, AT0, AT0);
  return w;
}
const datDau = async (w: W, kind: "SERVICE" | "GROUP", code: string, gioTra: number, gioAnHan: number) => {
  const r = await w.call("POST", "/api/tra-sau/dich-vu", { as: SUP, body: { targetKind: kind, targetCode: code, gioTra, gioAnHan } });
  assert.equal(r.status, 200, r.text);
};
const goDau = async (w: W, kind: "SERVICE" | "GROUP", code: string) => {
  const r = await w.call("POST", "/api/tra-sau/dich-vu/go", { as: SUP, body: { targetKind: kind, targetCode: code } });
  assert.equal(r.status, 200, r.text);
};
const hanMuc = (w: W, so: number) => w.call("POST", "/api/tra-sau/han-muc", { as: SUP, body: { partyId: BEN, hanMuc: so, gioTra: 168, gioAnHan: 0, lyDo: "thử" } });
/** Lập đơn nháp. Đối tác: bên đặt là hồ sơ của phiên; văn phòng: `ben` (mặc định BEN). */
const lap = (w: W, as: string, ma: string[], term?: "PREPAID" | "CREDIT", ben: string = BEN) =>
  w.call("POST", "/api/orders", {
    as, body: { customerName: "Khách Thử", customerPhone: "0912345678", services: ma.map((m) => svc(m, inDays(3))), ...(term ? { paymentTerm: term } : {}), ...(as === DT ? {} : { bookerPartyId: ben }) },
  });
const donRow = (w: W, id: string) =>
  w.q("SELECT payment_term, credit_basis, confirmed_at, credit_due_at, credit_grace_until, total FROM orders WHERE id = ?", id)[0] as {
    payment_term: string; credit_basis: string | null; confirmed_at: string; credit_due_at: string; credit_grace_until: string; total: number;
  };
const conDuocDung = (w: W, as: string, q: string) => w.call("GET", `/api/tra-sau/con-duoc-dung?${q}`, { as });
const ms = (iso: string) => Date.parse(iso);

test("sổ vàng (a): đối tác KHÔNG hạn mức, đơn hai vé Tour Đảo dấu 24 giờ (ân hạn 12) và 48 giờ (ân hạn 6) ⇒ Trả sau theo dịch vụ; hạn trả = xác nhận + 24 giờ, hết ân hạn = hạn trả + 6 giờ", async () => {
  const w = dung();
  await datDau(w, "SERVICE", "ZA1", 24, 12);
  await datDau(w, "GROUP", "NTD", 48, 6);
  const r = await lap(w, DT, ["ZA1", "ZC1"], "CREDIT");
  assert.equal(r.status, 201, r.text);
  const xn = await w.xacNhanDon(r.json.order.id, DT);
  assert.equal(xn.status, 200, xn.text);
  const d = donRow(w, r.json.order.id);
  assert.equal(d.payment_term, "CREDIT");
  assert.equal(d.credit_basis, "SERVICE");
  assert.equal(ms(d.credit_due_at) - ms(d.confirmed_at), 24 * GIO, "hạn trả = giờ xác nhận + 24 giờ (số giờ nhỏ nhất)");
  assert.equal(ms(d.credit_grace_until) - ms(d.credit_due_at), 6 * GIO, "ân hạn nhỏ nhất 6 giờ");
  assert.equal(d.total, 1_600_000, "2 × 500.000 + 2 × 300.000");
});

test("sổ vàng (b): hạn mức 10.000.000 ₫ đang nợ đủ 10.000.000 ₫ (theo hạn mức), đơn theo dịch vụ 3.000.000 ₫ ⇒ đạt; sau xác nhận «còn được dùng» vẫn 0, nợ theo dịch vụ 3.000.000 ₫", async () => {
  const w = dung();
  assert.equal((await hanMuc(w, 10_000_000)).status, 201);
  // Đơn theo hạn mức 10.000.000 ₫: ZB1 (không vé) giá 500.000 × 20 người lớn.
  w.sqlite.prepare("UPDATE catalog_item SET price_adult = 500000 WHERE code = 'ZB1'").run();
  const lim = await w.call("POST", "/api/orders", {
    as: A, body: { customerName: "Khách Thử", customerPhone: "0912345678", bookerPartyId: BEN, paymentTerm: "CREDIT", services: [{ ...svc("ZB1", inDays(3)), pax: { adult: 20, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 500000 } }] },
  });
  assert.equal(lim.status, 201, lim.text);
  assert.equal((await w.xacNhanDon(lim.json.order.id, A)).status, 200);
  assert.equal(donRow(w, lim.json.order.id).total, 10_000_000);
  assert.equal(donRow(w, lim.json.order.id).credit_basis, "LIMIT");
  // Đơn theo dịch vụ 3.000.000 ₫: ZA1 6 người lớn × 500.000.
  await datDau(w, "SERVICE", "ZA1", 24, 0);
  const sv = await w.call("POST", "/api/orders", {
    as: DT, body: { customerName: "Khách Thử", customerPhone: "0912345678", paymentTerm: "CREDIT", services: [{ ...svc("ZA1", inDays(3)), pax: { adult: 6, child: 0, senior: 0, infant: 0 } }] },
  });
  assert.equal(sv.status, 201, sv.text);
  const xn = await w.xacNhanDon(sv.json.order.id, DT);
  assert.equal(xn.status, 200, xn.text);
  assert.deepEqual([donRow(w, sv.json.order.id).total, donRow(w, sv.json.order.id).credit_basis], [3_000_000, "SERVICE"]);
  const c = await conDuocDung(w, A, `benDat=${BEN}`);
  assert.equal(c.json.conDuocDung, 0, "còn được dùng vẫn 0 — nợ theo dịch vụ không trừ vào hạn mức");
  const hs = await w.call("GET", `/api/tra-sau/han-muc/${BEN}`, { as: SUP });
  assert.deepEqual([hs.json.dangNo, hs.json.dangNoDichVu, hs.json.conDuocDung], [10_000_000, 3_000_000, 0]);
  const ds = (await w.call("GET", "/api/tra-sau/han-muc", { as: SUP })).json.danhSach.find((x: { partyId: string }) => x.partyId === BEN);
  assert.deepEqual([ds.dangNo, ds.dangNoDichVu, ds.conDuocDung], [10_000_000, 3_000_000, 0]);
  const toi = await w.call("GET", "/api/tra-sau/cua-toi", { as: DT });
  assert.deepEqual([toi.json.dangNo, toi.json.dangNoDichVu], [10_000_000, 3_000_000]);
  assert.deepEqual(toi.json.don.map((x: { coSo: string }) => x.coSo).sort(), ["LIMIT", "SERVICE"]);
});

test("sổ vàng (b\'): hạn mức 10.000.000 ₫, nợ theo hạn mức 4.000.000 ₫, nợ theo dịch vụ 3.000.000 ₫ ⇒ «còn được dùng» 6.000.000 ₫ (không phải 3.000.000); đơn theo hạn mức 6.000.000 ₫ đạt, 6.500.000 ₫ vượt", async () => {
  const w = dung();
  assert.equal((await hanMuc(w, 10_000_000)).status, 201);
  w.sqlite.prepare("UPDATE catalog_item SET price_adult = 500000 WHERE code = 'ZB1'").run();
  const donZB1 = (adult: number) => w.call("POST", "/api/orders", {
    as: A, body: { customerName: "Khách Thử", customerPhone: "0912345678", bookerPartyId: BEN, paymentTerm: "CREDIT", services: [{ ...svc("ZB1", inDays(3)), pax: { adult, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 500000 } }] },
  });
  const lim = await donZB1(8); // 4.000.000
  assert.equal(lim.status, 201, lim.text);
  assert.equal((await w.xacNhanDon(lim.json.order.id, A)).status, 200);
  await datDau(w, "SERVICE", "ZA1", 24, 0);
  const sv = await w.call("POST", "/api/orders", { as: DT, body: { customerName: "Khách Thử", customerPhone: "0912345678", paymentTerm: "CREDIT", services: [{ ...svc("ZA1", inDays(3)), pax: { adult: 6, child: 0, senior: 0, infant: 0 } }] } });
  assert.equal(sv.status, 201, sv.text);
  assert.equal((await w.xacNhanDon(sv.json.order.id, DT)).status, 200);
  assert.equal(donRow(w, sv.json.order.id).total, 3_000_000);
  assert.equal((await conDuocDung(w, A, `benDat=${BEN}`)).json.conDuocDung, 6_000_000);
  assert.equal((await donZB1(12)).status, 201, "6.000.000 ₫ theo hạn mức vừa đủ");
  const vuot = await donZB1(13);
  assert.deepEqual([vuot.status, vuot.json.error?.code], [409, "vuot_han_muc"], vuot.text);
});

test("sổ vàng (c): đơn theo dịch vụ hết ân hạn còn nợ ⇒ đơn Trả sau theo hạn mức mới và đơn theo dịch vụ mới đều co_don_qua_han", async () => {
  const w = dung();
  await datDau(w, "SERVICE", "ZA1", 24, 0);
  assert.equal((await hanMuc(w, 50_000_000)).status, 201);
  const cu = await lap(w, DT, ["ZA1"], "CREDIT");
  assert.equal((await w.xacNhanDon(cu.json.order.id, DT)).status, 200);
  assert.equal(donRow(w, cu.json.order.id).credit_basis, "SERVICE");
  datQuaHan(w.sqlite, cu.json.order.id);
  const moiSv = await lap(w, DT, ["ZA1"], "CREDIT");
  assert.deepEqual([moiSv.status, moiSv.json.error?.code], [409, "co_don_qua_han"], moiSv.text);
  const moiLim = await lap(w, A, ["ZB1"], "CREDIT");
  assert.deepEqual([moiLim.status, moiLim.json.error?.code], [409, "co_don_qua_han"], moiLim.text);
});

test("sổ vàng (c'): đối tác KHÔNG hạn mức có đơn quá hạn ⇒ đơn theo hạn mức nhận co_don_qua_han (quá hạn thắng «không có hạn mức»)", async () => {
  const w = dung();
  await datDau(w, "SERVICE", "ZA1", 24, 0);
  const cu = await lap(w, DT, ["ZA1"], "CREDIT");
  assert.equal((await w.xacNhanDon(cu.json.order.id, DT)).status, 200);
  datQuaHan(w.sqlite, cu.json.order.id);
  const r = await lap(w, A, ["ZB1"], "CREDIT");
  assert.deepEqual([r.status, r.json.error?.code], [409, "co_don_qua_han"], r.text);
});

test("sổ vàng (d): bên đặt là khách lẻ (không phải đối tác được hưởng), đơn toàn vé có dấu ⇒ không theo dịch vụ ⇒ khong_co_han_muc; con-duoc-dung trả traSauDichVu null", async () => {
  const w = dung();
  await datDau(w, "SERVICE", "ZA1", 24, 0);
  const r = await lap(w, A, ["ZA1"], "CREDIT", KH);
  assert.deepEqual([r.status, r.json.error?.code], [409, "khong_co_han_muc"], r.text);
  assert.equal((await conDuocDung(w, A, `benDat=${KH}&dv=ZA1`)).json.traSauDichVu, null);
  // Chống bài rỗng: cùng dịch vụ, bên đặt là đối tác được hưởng ⇒ có số giờ.
  assert.deepEqual((await conDuocDung(w, A, `benDat=${BEN}&dv=ZA1`)).json.traSauDichVu, { gioTra: 24 });
});

test("đơn có vé hãng ngoài, dòng nhập tay, hoặc chỉ dịch vụ không vé ⇒ không theo dịch vụ (đối tác không hạn mức gửi Trả sau ⇒ khong_co_han_muc)", async () => {
  const w = dung();
  await datDau(w, "SERVICE", "ZA1", 24, 0);
  await datDau(w, "SERVICE", "ZB1", 24, 0); // ZB1 không «Có vé»: dấu không tính
  for (const ma of [["ZA1", "ZH1"], ["ZB1"]]) {
    const r = await lap(w, DT, ma, "CREDIT");
    assert.deepEqual([r.status, r.json.error?.code], [409, "khong_co_han_muc"], `${ma}: ${r.text}`);
  }
  assert.equal((await conDuocDung(w, DT, "dv=ZA1&dv=ZH1")).json.traSauDichVu, null);
  assert.equal((await conDuocDung(w, DT, "dv=ZA1&nhapTay=1")).json.traSauDichVu, null, "dòng nhập tay");
  assert.equal((await conDuocDung(w, DT, "dv=ZB1")).json.traSauDichVu, null, "chỉ dịch vụ không vé");
  assert.deepEqual((await conDuocDung(w, DT, "dv=ZA1&dv=ZB1")).json.traSauDichVu, { gioTra: 24 }, "dịch vụ không vé đi kèm không làm hỏng");
});

test("ADR-0224 áp cho đơn đủ điều kiện theo dịch vụ: đối tác gửi «Thanh toán ngay» hoặc bỏ trống ⇒ 409 tra_sau_bat_buoc_doi_tac; văn phòng «Qua đối tác» chọn được cả hai", async () => {
  const w = dung();
  await datDau(w, "SERVICE", "ZA1", 24, 0);
  for (const term of ["PREPAID", undefined] as const) {
    const r = await lap(w, DT, ["ZA1"], term);
    assert.deepEqual([r.status, r.json.error?.code], [409, "tra_sau_bat_buoc_doi_tac"], r.text);
  }
  assert.equal((await lap(w, DT, ["ZB1"], "PREPAID")).status, 201, "đơn không đủ điều kiện, không hạn mức ⇒ Thanh toán ngay được");
  assert.equal((await lap(w, A, ["ZA1"], "PREPAID")).status, 201);
  const vp = await lap(w, A, ["ZA1"], "CREDIT");
  assert.equal(vp.status, 201, vp.text);
  assert.equal((await w.xacNhanDon(vp.json.order.id, A)).status, 200);
  assert.equal(donRow(w, vp.json.order.id).credit_basis, "SERVICE");
});

test("gỡ dấu sau xác nhận: hạn trả và loại của đơn cũ giữ nguyên; sửa TĂNG số khách ⇒ 409 tra_sau_dich_vu_khong_dau (không lùi về hạn mức); giảm vẫn được", async () => {
  const w = dung();
  await datDau(w, "SERVICE", "ZA1", 24, 0);
  const r = await lap(w, DT, ["ZA1"], "CREDIT");
  assert.equal((await w.xacNhanDon(r.json.order.id, DT)).status, 200);
  const id = r.json.order.id as string;
  const truoc = donRow(w, id);
  await goDau(w, "SERVICE", "ZA1");
  assert.deepEqual(donRow(w, id), truoc, "gỡ dấu không đổi đơn đã xác nhận");
  const svId = (w.q("SELECT id FROM order_service WHERE order_id = ?", id)[0] as { id: string }).id;
  const sua = (adult: number, lyDo = adult >= 3 ? "THEM_NGUOI" : "BOT_NGUOI") => w.call("POST", `/api/orders/${id}/money-edit`, { as: SUP, body: { lyDo, services: [{ id: svId, pax: { adult, child: 0, senior: 0, infant: 0 } }] } });
  const tang = await sua(3);
  assert.equal(tang.status, 409, tang.text);
  assert.equal(tang.json.error?.code, "tra_sau_dich_vu_khong_dau");
  assert.equal(tang.json.error?.message, "Đơn trả sau theo dịch vụ chỉ nhận dịch vụ vé Tour Đảo có dấu Trả sau theo dịch vụ. Bỏ dịch vụ này, hoặc huỷ đơn và lập lại với hình thức khác.");
  // Đặt lại dấu ⇒ tăng được (theo dịch vụ, không cần hạn mức).
  await datDau(w, "SERVICE", "ZA1", 48, 0);
  const lai = await sua(3);
  assert.equal(lai.status, 200, lai.text);
  assert.equal(donRow(w, id).credit_due_at, truoc.credit_due_at, "đặt dấu số giờ khác không đổi hạn trả đã chụp");
  assert.equal((await sua(2)).status, 200, "giảm số khách không qua cổng");
});
