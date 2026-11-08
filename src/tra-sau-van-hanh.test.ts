// Luật vận hành Trả sau (ADR-0173 Đ1 mục 3, Đ2, tiêu chí 2–4). Khung thử thật (tests/audit/xac-nhan-khung.mjs). Tên người, SĐT là GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { app, seedStaff } from "../tests/audit/harness.mjs";
import { A, ACC, ADM, PARTNER, SUP, inDays, setup, svc } from "../tests/audit/xac-nhan-khung.mjs";
import { cachBayGio, datMocTraSau, datQuaHan } from "../tests/audit/tra-sau-moc.mjs";

const AT = "2026-10-01T00:00:00.000Z";
const DT = "88888888-8888-4888-8888-888888888801";
const BEN = `pty-${DT}`;
const T_ZB1 = 600_000;
type W = ReturnType<typeof setup>;

function dung(): W {
  const w = setup();
  seedStaff(w.sqlite, { id: DT, phone: "0900000021", name: "Đối Tác Hưởng", perms: ["PARTNER"] });
  return w;
}
const hanMuc = (w: W, so: number, gioTra = 36, gioAnHan = 12) => w.call("POST", "/api/tra-sau/han-muc", { as: SUP, body: { partyId: BEN, hanMuc: so, gioTra, gioAnHan, lyDo: "thử" } });
async function donXacNhan(w: W, term: "CREDIT" | "PREPAID" = "CREDIT"): Promise<string> {
  const r = await w.call("POST", "/api/orders", { as: A, body: { customerName: "Khách Thử", customerPhone: "0912345678", bookerPartyId: BEN, paymentTerm: term, services: [svc("ZB1", inDays(3))] } });
  assert.equal(r.status, 201, r.text);
  const xn = await w.call("POST", `/api/orders/${r.json.order.id}/status`, { as: A, body: { status: "confirmed" } });
  assert.equal(xn.status, 200, xn.text);
  return r.json.order.id;
}
const moc = (w: W, id: string) => w.q("SELECT credit_due_at AS h, credit_grace_until AS g, status FROM orders WHERE id = ?", id)[0] as { h: string; g: string; status: string };
const anHan = (w: W, as: string, id: string, body: unknown) => w.call("POST", `/api/tra-sau/don/${id}/an-han`, { as, body });
const congGio = (iso: string, gio: number) => new Date(Date.parse(iso) + gio * 3_600_000).toISOString();

test("ADR-0173 tiêu chí 2: Quản trị, Toàn quyền lùi được hạn trả; thiếu lý do 400; rút ngắn 409; Kế toán, Bán hàng, Đối tác 403; số giờ ân hạn của đơn giữ nguyên; nhật ký có mốc cũ, mốc mới, người lùi", async () => {
  const w = dung();
  assert.equal((await hanMuc(w, 10_000_000)).status, 201);
  const id = await donXacNhan(w);
  const cu = moc(w, id);
  for (const as of [ACC, A, DT, PARTNER]) {
    const r = await anHan(w, as, id, { hanMoi: congGio(cu.h, 24), lyDo: "khách xin thêm" });
    assert.equal(r.status, 403, `${as}: ${r.text}`);
  }
  assert.equal((await anHan(w, ADM, id, { hanMoi: congGio(cu.h, 24) })).status, 400, "thiếu lý do");
  assert.equal((await anHan(w, ADM, id, { hanMoi: congGio(cu.h, 24), lyDo: "   " })).status, 400, "lý do rỗng");
  const ngan = await anHan(w, ADM, id, { hanMoi: congGio(cu.h, -1), lyDo: "nhầm" });
  assert.deepEqual([ngan.status, ngan.json.error.code], [409, "han_moi_khong_sau_han_cu"]);
  assert.deepEqual(moc(w, id), cu, "chưa ai lùi được: mốc không đổi");
  const r = await anHan(w, ADM, id, { hanMoi: congGio(cu.h, 24), lyDo: "Đại lý xin thêm một ngày" });
  assert.equal(r.status, 200, r.text);
  const moi = moc(w, id);
  assert.deepEqual([moi.h, moi.g], [congGio(cu.h, 24), congGio(cu.g, 24)], "hết ân hạn tính lại theo hạn mới, giữ 12 giờ ân hạn");
  assert.equal((await anHan(w, SUP, id, { hanMoi: congGio(moi.h, 2), lyDo: "Toàn quyền cho thêm" })).status, 200, "Toàn quyền lùi được");
  const nk = w.q("SELECT staff_id, detail, order_id FROM audit_log WHERE action = 'credit_due_extended' ORDER BY rowid");
  assert.deepEqual(nk.map((x) => x.staff_id), [ADM, SUP], "người lùi");
  assert.ok(String(nk[0]!.detail).includes(cu.h) && String(nk[0]!.detail).includes(moi.h), "mốc cũ và mốc mới");
  assert.match(String(nk[0]!.detail), /Đại lý xin thêm một ngày/);
  assert.equal(nk[0]!.order_id, id);
  // Đơn trả trước, đơn hết nợ: không lùi được.
  const tt = await donXacNhan(w, "PREPAID");
  assert.equal((await anHan(w, ADM, tt, { hanMoi: cachBayGio(100), lyDo: "x" })).status, 409);
  const thu = await w.call("POST", `/api/orders/${id}/payments`, { as: ACC, body: { soTien: T_ZB1, hinhThuc: "CASH", nguoiThu: "cong_ty" } });
  assert.equal(thu.status, 201, thu.text);
  const het = await anHan(w, ADM, id, { hanMoi: congGio(moc(w, id).h, 24), lyDo: "x" });
  assert.deepEqual([het.status, het.json.error.code], [409, "da_het_no"]);
});

test("ADR-0173 Đ1 mục 3: hai người cùng bấm «Ân hạn» — người sau gặp hạn vừa đổi ⇒ 409 han_vua_doi, không ghi đè, không có dòng nhật ký thừa", async () => {
  const w = dung();
  assert.equal((await hanMuc(w, 10_000_000)).status, 201);
  const id = await donXacNhan(w);
  const cu = moc(w, id);
  // Người kia lùi hạn thêm 48 giờ NGAY TRƯỚC lô của người này (khuôn chen trước lô): người này đã đọc hạn cũ, định lùi 24 giờ.
  const goc = w.env.DB.batch;
  w.env.DB.batch = async (stmts: unknown[]) => {
    w.env.DB.batch = goc;
    w.sqlite.prepare("UPDATE orders SET credit_due_at = ?, credit_grace_until = ? WHERE id = ?").run(congGio(cu.h, 48), congGio(cu.g, 48), id);
    return goc(stmts);
  };
  const r = await anHan(w, ADM, id, { hanMoi: congGio(cu.h, 24), lyDo: "khách xin thêm" });
  w.env.DB.batch = goc;
  assert.deepEqual([r.status, r.json?.error?.code], [409, "han_vua_doi"], r.text);
  assert.deepEqual([moc(w, id).h, moc(w, id).g], [congGio(cu.h, 48), congGio(cu.g, 48)], "hạn của người kia giữ nguyên, không bị ghi đè");
  assert.equal(w.q("SELECT COUNT(*) AS n FROM audit_log WHERE action = 'credit_due_extended' AND order_id = ?", id)[0].n, 0, "lệnh thua không ghi nhật ký");
});

test("ADR-0173 tiêu chí 2: đơn đang quá hạn được lùi hạn thì mở lại đơn Trả sau mới; màn đơn có cờ «Ân hạn» cho Quản trị, không cho Kế toán", async () => {
  const w = dung();
  assert.equal((await hanMuc(w, 10_000_000)).status, 201);
  const id = await donXacNhan(w);
  datQuaHan(w.sqlite, id);
  const xem = async (as: string) => (await w.call("GET", `/api/orders/${id}`, { as })).json.traSau;
  assert.deepEqual(await xem(ADM), { no: T_ZB1, trangThai: "qua_han", coQuyenAnHan: true });
  assert.equal((await xem(ACC)).coQuyenAnHan, false);
  const chan = await w.call("GET", `/api/tra-sau/con-duoc-dung?benDat=${BEN}`, { as: A });
  assert.equal(chan.json.coDonQuaHan, true);
  const r = await anHan(w, ADM, id, { hanMoi: cachBayGio(24), lyDo: "Đã hẹn ngày trả" });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.trangThai, "trong_han");
  assert.equal((await w.call("GET", `/api/tra-sau/con-duoc-dung?benDat=${BEN}`, { as: A })).json.coDonQuaHan, false, "hết chặn");
  await donXacNhan(w); // đơn Trả sau mới xác nhận được
});

test("ADR-0173 tiêu chí 3, Đ2 mục 2: trả một phần không đổi hạn trả; số còn được dùng tăng đúng phần đã về công ty", async () => {
  const w = dung();
  assert.equal((await hanMuc(w, 1_000_000)).status, 201);
  const id = await donXacNhan(w);
  const cu = moc(w, id);
  const conDung = async () => (await w.call("GET", `/api/tra-sau/con-duoc-dung?benDat=${BEN}`, { as: A })).json.conDuocDung as number;
  assert.equal(await conDung(), 400_000);
  assert.equal((await w.call("POST", `/api/orders/${id}/payments`, { as: ACC, body: { soTien: 250_000, hinhThuc: "CASH", nguoiThu: "cong_ty" } })).status, 201);
  assert.equal(await conDung(), 650_000);
  assert.deepEqual(moc(w, id), cu, "hạn trả giữ nguyên");
});

test("ADR-0173 tiêu chí 4, Đ2 mục 3–4: hết ân hạn — đơn trả trước của bên đặt vẫn xác nhận được; đơn quá hạn không tự huỷ", async () => {
  const w = dung();
  assert.equal((await hanMuc(w, 10_000_000)).status, 201);
  const id = await donXacNhan(w);
  datQuaHan(w.sqlite, id);
  await donXacNhan(w, "PREPAID");
  assert.equal(moc(w, id).status, "confirmed");
  // Trong ân hạn thì đơn Trả sau mới vẫn qua (chưa chặn).
  datMocTraSau(w.sqlite, id, cachBayGio(-1), cachBayGio(11));
  await donXacNhan(w);
});

// ---- ADR-0173 Đ3 mục 2, tiêu chí 6: tin nhắc ----------------------------------------------------------------------------------------------------------
const nhacHanTraSau = (db: unknown, bayGio: string): Promise<number> => app.nhacHanTraSau(db, bayGio);
const tinNhac = async (w: W, as: string): Promise<string[]> =>
  ((await w.call("GET", "/api/thong-bao?ngan=cua-toi", { as })).json.tin as { cau: string }[]).map((t) => t.cau).filter((c) => /trả sau/.test(c));

test("ADR-0173 tiêu chí 6: nhắc đúng mốc (trước hạn 6 giờ, sau hạn trả), đúng người (đại lý; Kế toán chỉ lúc quá hạn), không gửi lặp; đơn đã trả đủ không nhắc; lùi hạn thì nhắc theo mốc mới", async () => {
  const w = dung();
  assert.equal((await hanMuc(w, 10_000_000)).status, 201);
  const id = await donXacNhan(w);
  const daTra = await donXacNhan(w);
  assert.equal((await w.call("POST", `/api/orders/${daTra}/payments`, { as: ACC, body: { soTien: T_ZB1, hinhThuc: "CASH", nguoiThu: "cong_ty" } })).status, 201);
  const han = moc(w, id).h;
  assert.equal(await nhacHanTraSau(w.env.DB, congGio(han, -7)), 0, "chưa tới mốc 6 giờ");
  assert.equal(await nhacHanTraSau(w.env.DB, congGio(han, -5)), 1, "trước hạn 6 giờ: một tin (đơn đã trả đủ không nhắc)");
  assert.equal(await nhacHanTraSau(w.env.DB, congGio(han, -4)), 0, "không gửi lặp");
  const maDon = w.q("SELECT order_code AS m FROM orders WHERE id = ?", id)[0].m as string;
  assert.deepEqual(await tinNhac(w, DT), [`Đơn trả sau ${maDon} còn nợ, sắp tới hạn trả (còn dưới 6 giờ). Hãy thanh toán cho công ty trước hạn.`]);
  assert.deepEqual(await tinNhac(w, ACC), [], "Kế toán không nhận tin trước hạn");
  assert.equal(w.q("SELECT count(*) AS n FROM audit_log WHERE target_type = 'ledger' AND action = 'credit_due_soon_reminded'")[0].n, 0, "lớp ghi: tin trước hạn không có dòng cho Kế toán (không dựa vào lớp lọc của hộp thư)");
  assert.deepEqual(await tinNhac(w, A), [], "người lập không nhận");
  assert.equal(await nhacHanTraSau(w.env.DB, congGio(han, 1)), 1, "sau hạn trả: tin quá hạn");
  assert.equal(await nhacHanTraSau(w.env.DB, congGio(han, 30)), 0, "không gửi lặp tin quá hạn");
  assert.equal((await tinNhac(w, DT)).length, 2);
  assert.deepEqual(await tinNhac(w, ACC), [`Đơn trả sau ${maDon} đã quá hạn trả mà còn nợ.`]);
  assert.deepEqual(await tinNhac(w, PARTNER), [], "đối tác khác không nhận");
  assert.equal(w.q("SELECT count(*) AS n FROM bil_credit_reminder")[0].n, 2);
  // Lùi hạn: mốc mới ⇒ nhắc lại theo hạn mới.
  const moi = congGio(han, 48);
  assert.equal((await anHan(w, ADM, id, { hanMoi: moi, lyDo: "Đại lý hẹn trả" })).status, 200);
  assert.equal(await nhacHanTraSau(w.env.DB, congGio(moi, -3)), 1);
  // Thu đủ: không nhắc nữa.
  assert.equal((await w.call("POST", `/api/orders/${id}/payments`, { as: ACC, body: { soTien: T_ZB1, hinhThuc: "CASH", nguoiThu: "cong_ty" } })).status, 201);
  assert.equal(await nhacHanTraSau(w.env.DB, congGio(moi, 2)), 0, "đơn đã trả đủ không nhắc");
});

test("ADR-0173 tiêu chí 6 (đua): hai lượt Cron chồng nhau — lượt kia ghi sổ nhắc ngay trước lô của lượt này ⇒ lượt này không ghi thêm tin nào", async () => {
  const w = dung();
  assert.equal((await hanMuc(w, 10_000_000)).status, 201);
  const id = await donXacNhan(w);
  const han = moc(w, id).h;
  const bayGio = congGio(han, 1);
  // Lượt này đã đọc «chưa gửi»; lượt kia chen vào ghi sổ và tin của nó trước lô của lượt này (khuôn chen trước lô).
  const goc = w.env.DB.batch;
  w.env.DB.batch = async (stmts: unknown[]) => {
    w.env.DB.batch = goc;
    w.sqlite.prepare("INSERT INTO bil_credit_reminder (order_id, kind, due_at, party_id, created_at, updated_at) VALUES (?, 'QUA_HAN', ?, ?, ?, ?)").run(id, han, BEN, bayGio, bayGio);
    return goc(stmts);
  };
  const so = await nhacHanTraSau(w.env.DB, bayGio);
  w.env.DB.batch = goc;
  assert.equal(so, 0, "lượt thua không đếm tin nào");
  assert.equal(w.q("SELECT count(*) AS n FROM audit_log WHERE action = 'credit_overdue_reminded'")[0].n, 0, "lượt thua không ghi tin (dòng nhật ký) nào");
});

// ---- ADR-0173 Đ3 mục 5, tiêu chí 8: không ngừng được hồ sơ đại lý còn đơn Trả sau chưa trả --------------------------------------------------------------
test("ADR-0173 tiêu chí 8: ngưng tài khoản đại lý còn nợ 409 nêu mã đơn; gỡ vai đại lý cuối cùng của hồ sơ chưa có tài khoản còn nợ 409; hết nợ thì ngừng được", async () => {
  const w = dung();
  assert.equal((await hanMuc(w, 10_000_000)).status, 201);
  const id = await donXacNhan(w);
  const maDon = w.q("SELECT order_code AS m FROM orders WHERE id = ?", id)[0].m as string;
  const ngung = await w.call("PATCH", `/api/staff/${DT}`, { as: ADM, body: { active: false } });
  assert.deepEqual([ngung.status, ngung.json.error.code], [409, "con_no_tra_sau"], ngung.text);
  assert.ok(ngung.json.error.message.includes(maDon), "câu nêu mã đơn");
  assert.equal(w.q("SELECT active FROM staff WHERE id = ?", DT)[0].active, 1, "tài khoản chưa bị ngưng");
  // Hồ sơ đại lý chưa có tài khoản: gỡ vai được hưởng cuối cùng.
  const KTK = "pty-12121212-1212-4121-8121-121212121212";
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'ORGANIZATION', 'Đại Lý Không Tài Khoản', 1, ?, ?)").run(KTK, AT, AT);
  w.sqlite.prepare("INSERT INTO pty_organization (party_id, created_at, updated_at) VALUES (?, ?, ?)").run(KTK, AT, AT);
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES ('11111111-2222-4333-8444-555555555555', ?, 'TRAVEL_AGENCY', '2026-01-01', ?, ?)").run(KTK, AT, AT);
  assert.equal((await w.call("POST", "/api/tra-sau/han-muc", { as: SUP, body: { partyId: KTK, hanMuc: 10_000_000, gioTra: 36, gioAnHan: 0 } })).status, 201);
  const r = await w.call("POST", "/api/orders", { as: A, body: { customerName: "Khách Thử", customerPhone: "0912345678", bookerPartyId: KTK, paymentTerm: "CREDIT", services: [svc("ZB1", inDays(3))] } });
  assert.equal(r.status, 201, r.text);
  assert.equal((await w.call("POST", `/api/orders/${r.json.order.id}/status`, { as: A, body: { status: "confirmed" } })).status, 200);
  const go = await w.call("POST", `/api/parties/${KTK}/roles/11111111-2222-4333-8444-555555555555/end`, { as: ADM, body: {} });
  assert.deepEqual([go.status, go.json?.error?.code], [409, "con_no_tra_sau"], go.text);
  // Thu đủ: ngừng được.
  assert.equal((await w.call("POST", `/api/orders/${r.json.order.id}/payments`, { as: ACC, body: { soTien: T_ZB1, hinhThuc: "CASH", nguoiThu: "cong_ty" } })).status, 201);
  const go2 = await w.call("POST", `/api/parties/${KTK}/roles/11111111-2222-4333-8444-555555555555/end`, { as: ADM, body: {} });
  assert.notEqual(go2.json?.error?.code, "con_no_tra_sau", go2.text);
  assert.equal((await w.call("POST", `/api/orders/${id}/payments`, { as: ACC, body: { soTien: T_ZB1, hinhThuc: "CASH", nguoiThu: "cong_ty" } })).status, 201);
  const ngung2 = await w.call("PATCH", `/api/staff/${DT}`, { as: ADM, body: { active: false } });
  assert.equal(ngung2.status, 200, ngung2.text);
});
