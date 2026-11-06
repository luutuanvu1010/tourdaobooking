// Các đường làm TĂNG hoặc TRƯỢT nợ của đơn Trả sau (ADR-0168 Đ2 mục 5–6, Đ3 mục 3; kế hoạch 2026-11-05 Task 4): sửa số khách (văn phòng và hướng dẫn viên) chung MỘT cổng,
// đổi bên đặt, gộp hồ sơ, huỷ đơn khi vé đã mở, và đảo / sửa khoản thu (không bị chặn, chỉ tăng phiên bản). Cuối tệp là bài QUÉT mã nguồn: mọi nơi gọi
// `soanHuyDon`, `changeBooker`, `soanSuaSoKhach` phải đi qua cổng. Khung thử thật (tests/audit/harness.mjs). Tên, SĐT là GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { seedStaff } from "../tests/audit/harness.mjs";
import { A, ACC, ADM, H, SUP, inDays, setup, svc } from "../tests/audit/xac-nhan-khung.mjs";

const AT = "2026-10-01T00:00:00.000Z";
const DT = "88888888-8888-4888-8888-888888888801"; // bên đặt có hạn mức
const BEN = `pty-${DT}`;
const DT2 = "88888888-8888-4888-8888-888888888802"; // một hồ sơ khác để đổi bên đặt
const BEN2 = `pty-${DT2}`;
const T_ZB1 = 600_000; // 2 người lớn × 300.000

type W = ReturnType<typeof setup>;
function dung(): W {
  const w = setup();
  for (const [id, phone, ten] of [[DT, "0900000021", "Đối Tác Hưởng"], [DT2, "0900000022", "Đối Tác Khác"]] as const) {
    seedStaff(w.sqlite, { id, phone, name: ten, perms: ["PARTNER"] });
    w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES (?, ?, 'TRAVEL_AGENCY', '2026-01-01', ?, ?)").run(`r-${id}`, `pty-${id}`, AT, AT);
  }
  return w;
}
const hanMuc = (w: W, soTien: number, ben = BEN) => w.call("POST", "/api/tra-sau/han-muc", { as: SUP, body: { partyId: ben, hanMuc: soTien, gioTra: 168, gioAnHan: 0, lyDo: "thử" } });
const phienBan = (w: W): number | null => w.q("SELECT version FROM bil_credit_guard WHERE party_id = ?", BEN)[0]?.version ?? null;
const no = async (w: W) => ((await w.call("GET", `/api/tra-sau/han-muc/${BEN}/don`, { as: SUP })).json.don as { no: number }[]).reduce((s, d) => s + d.no, 0);
/** Đơn Trả sau đã xác nhận (2 người lớn × 300.000 = 600.000) của BEN, do A lập. */
async function donTS(w: W, ben = BEN): Promise<{ id: string; updatedAt: string }> {
  const r = await w.call("POST", "/api/orders", { as: A, body: { customerName: "Khách Thử", customerPhone: "0912345678", bookerPartyId: ben, paymentTerm: "CREDIT", services: [svc("ZB1", inDays(3))] } });
  assert.equal(r.status, 201, r.text);
  const x = await w.call("POST", `/api/orders/${r.json.order.id}/status`, { as: A, body: { status: "confirmed" } });
  assert.equal(x.status, 200, x.text);
  return (await w.call("GET", `/api/orders/${r.json.order.id}`, { as: A })).json.order;
}
const thu = (w: W, id: string, soTien: number) => w.call("POST", `/api/orders/${id}/payments`, { as: ACC, body: { soTien, hinhThuc: "CASH", nguoiThu: "cong_ty" } });
const svcId = (w: W, orderId: string): string => w.q("SELECT id FROM order_service WHERE order_id = ?", orderId)[0].id;
const pax = (adult: number) => ({ adult, child: 0, senior: 0, infant: 0 });
const suaVP = (w: W, id: string, adult: number) => w.call("POST", `/api/orders/${id}/money-edit`, { as: A, body: { lyDo: "THEM_NGUOI", services: [{ id: svcId(w, id), pax: pax(adult) }] } });
const suaHDV = (w: W, id: string, adult: number) => w.call("POST", `/api/orders/${id}/handler-money-edit`, { as: H, body: { reason: "Khách đổi số người", services: [{ id: svcId(w, id), pax: pax(adult) }] } });
const soDongDieuChinh = (w: W, id: string): number => w.q("SELECT count(*) AS n FROM order_money_adjustment WHERE order_id = ?", id)[0].n;

// ---- Tiêu chí 9: sửa số khách (hai đường, MỘT cổng) ----
test("sửa số khách của văn phòng: tăng vượt hạn mức 409, tăng trong hạn mức được và tăng phiên bản, giảm hoặc y nguyên không gác", async () => {
  const w = dung();
  assert.equal((await hanMuc(w, 1_000_000)).status, 201);
  const d = await donTS(w);
  const v0 = phienBan(w);
  const vuot = await suaVP(w, d.id, 4); // 1.200.000
  assert.deepEqual([vuot.status, vuot.json.error.code], [409, "vuot_han_muc"], vuot.text);
  assert.match(vuot.json.error.message, /1\.200\.000/, "câu báo có số tiền");
  assert.equal(soDongDieuChinh(w, d.id), 0, "không để lại dòng điều chỉnh nào");
  assert.equal(phienBan(w), v0, "lô bị từ chối không tăng phiên bản");
  const duoc = await suaVP(w, d.id, 3); // 900.000 ≤ 1.000.000
  assert.equal(duoc.status, 200, duoc.text);
  assert.equal(phienBan(w), v0! + 1, "tăng tiền trong hạn mức thì tăng phiên bản");
  assert.equal(await no(w), 900_000);
  const giam = await suaVP(w, d.id, 1); // 300.000
  assert.equal(giam.status, 200, giam.text);
  assert.equal(phienBan(w), v0! + 1, "giảm tiền không cần gác phiên bản");
  assert.equal(await no(w), 300_000);
  const yNguyen = await suaVP(w, d.id, 1);
  assert.equal(yNguyen.status, 200, yNguyen.text);
  assert.equal(yNguyen.json.daGhi, false);
  assert.equal(phienBan(w), v0! + 1);
});

test("sửa số khách của hướng dẫn viên đi CHUNG cổng: vượt hạn mức 409, giảm được", async () => {
  const w = dung();
  assert.equal((await hanMuc(w, 1_000_000)).status, 201);
  const d = await donTS(w);
  assert.equal((await w.call("PUT", `/api/orders/${d.id}/handler`, { as: A, body: { staffId: H } })).status, 200);
  const v0 = phienBan(w);
  const vuot = await suaHDV(w, d.id, 4);
  assert.deepEqual([vuot.status, vuot.json.error.code], [409, "vuot_han_muc"], vuot.text);
  assert.equal(soDongDieuChinh(w, d.id), 0);
  assert.equal(phienBan(w), v0);
  const giam = await suaHDV(w, d.id, 1);
  assert.equal(giam.status, 200, giam.text);
  assert.equal(await no(w), 300_000);
});

test("hai lệnh cùng lúc: sửa tăng tiền chen với lệnh khác làm tăng nợ thì lệnh thua cả lô huỷ, đơn không đổi", async () => {
  const w = dung();
  assert.equal((await hanMuc(w, 1_000_000)).status, 201);
  const d = await donTS(w);
  w.chenTruocLo((stmts: { sql: string }[]) => stmts.some((s) => /order_money_adjustment/.test(s.sql)), () => {
    w.sqlite.prepare("UPDATE bil_credit_guard SET version = version + 1 WHERE party_id = ?").run(BEN);
  });
  const r = await suaVP(w, d.id, 3);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "credit_version_stale");
  assert.equal(soDongDieuChinh(w, d.id), 0, "không dòng điều chỉnh nào");
  assert.equal(await no(w), T_ZB1, "tiền đơn y nguyên");
});

test("đơn Trả trước: sửa tăng số khách không chạm dòng phiên bản", async () => {
  const w = dung();
  const r = await w.call("POST", "/api/orders", { as: A, body: { customerName: "Khách Thử", customerPhone: "0912345678", bookerPartyId: BEN, services: [svc("ZB1", inDays(3))] } });
  assert.equal(r.status, 201, r.text);
  const id = r.json.order.id;
  assert.equal((await w.call("POST", `/api/orders/${id}/status`, { as: A, body: { status: "confirmed" } })).status, 200);
  assert.equal((await suaVP(w, id, 4)).status, 200);
  assert.equal(phienBan(w), null);
});

// ---- Tiêu chí 10: đổi bên đặt, gộp hồ sơ ----
test("đổi bên đặt: đơn Trả sau đã xác nhận còn nợ 409; hết nợ thì đổi được; đơn nháp đổi thoải mái", async () => {
  const w = dung();
  assert.equal((await hanMuc(w, 1_000_000)).status, 201);
  const d = await donTS(w);
  const doi = (id: string, updatedAt: string) => w.call("PUT", `/api/orders/${id}/booker`, { as: A, body: { customerName: "Khách Thử", customerPhone: "0912345678", bookerPartyId: BEN2, expectedUpdatedAt: updatedAt } });
  const r = await doi(d.id, d.updatedAt);
  assert.deepEqual([r.status, r.json.error.code], [409, "tra_sau_con_no_doi_ben_dat"], r.text);
  assert.equal(w.q("SELECT booker_party_id AS b FROM orders WHERE id = ?", d.id)[0].b, BEN, "bên đặt không đổi");
  assert.equal((await thu(w, d.id, T_ZB1)).status, 201);
  const moi = (await w.call("GET", `/api/orders/${d.id}`, { as: A })).json.order;
  const ok = await doi(d.id, moi.updatedAt);
  assert.equal(ok.status, 200, ok.text);
  assert.equal(w.q("SELECT booker_party_id AS b FROM orders WHERE id = ?", d.id)[0].b, BEN2);
  // đơn nháp Trả sau: chưa có nợ, đổi được
  const n = await w.call("POST", "/api/orders", { as: A, body: { customerName: "Khách Thử", customerPhone: "0912345678", bookerPartyId: BEN, paymentTerm: "CREDIT", services: [svc("ZB1", inDays(3))] } });
  assert.equal(n.status, 201, n.text);
  assert.equal((await doi(n.json.order.id, n.json.order.updatedAt)).status, 200);
});

test("đổi bên đặt: có lệnh làm tăng nợ chen giữa lúc kiểm nợ và lúc ghi thì lô đổi thua (phiên bản của bên đặt CŨ), bên đặt không đổi", async () => {
  const w = dung();
  assert.equal((await hanMuc(w, 1_000_000)).status, 201);
  const d = await donTS(w);
  assert.equal((await thu(w, d.id, T_ZB1)).status, 201); // nợ 0 ⇒ phép đổi qua cổng
  const moi = (await w.call("GET", `/api/orders/${d.id}`, { as: A })).json.order;
  // Ngay trước lô đổi, một lệnh khác (vd đảo khoản thu) vừa làm tăng phiên bản của bên đặt cũ.
  w.chenTruocLo((stmts: { sql: string }[]) => stmts.some((s) => /booker_party_id/.test(s.sql) && /UPDATE orders/.test(s.sql)), () => {
    w.sqlite.prepare("UPDATE bil_credit_guard SET version = version + 1 WHERE party_id = ?").run(BEN);
  });
  const r = await w.call("PUT", `/api/orders/${d.id}/booker`, { as: A, body: { customerName: "Khách Thử", customerPhone: "0912345678", bookerPartyId: BEN2, expectedUpdatedAt: moi.updatedAt } });
  assert.deepEqual([r.status, r.json.error.code], [409, "credit_version_stale"], r.text);
  assert.equal(w.q("SELECT booker_party_id AS b FROM orders WHERE id = ?", d.id)[0].b, BEN, "bên đặt không đổi");
  assert.equal(w.q("SELECT count(*) AS n FROM audit_log WHERE order_id = ? AND action = 'booker_changed'", d.id)[0].n, 0, "không nhật ký đổi nào");
});

test("gộp hồ sơ: hồ sơ phụ còn đơn Trả sau còn nợ thì xem trước báo chặn và lệnh gộp 409; hết nợ thì không chặn vì lý do này", async () => {
  const w = dung();
  const TEN = "Đại Lý Không Tài Khoản";
  const B = await w.call("POST", "/api/staff", { as: SUP, body: { fullName: "Hồ Sơ Chính", phone: "0900000066", roles: ["SALES_STAFF"], taoHoSoMoi: true } });
  assert.equal(B.status, 201, B.text);
  const bId = B.json.staff.partyId as string;
  const P = await w.call("POST", "/api/parties", { as: ADM, body: { kind: "PERSON", fullName: TEN, contacts: [{ kind: "PHONE", value: "0912000222" }] } });
  assert.equal(P.status, 201, P.text);
  const aId = P.json.party.id as string;
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES ('r-gop', ?, 'TRAVEL_AGENCY', '2026-01-01', ?, ?)").run(aId, AT, AT);
  assert.equal((await hanMuc(w, 1_000_000, aId)).status, 201);
  const d = await donTS(w, aId);
  // Hồ sơ phụ còn giữ vai đối tác thì đã bị chặn vì lý do khác (merge_source_account_role); kết thúc vai đó, đơn Trả sau vẫn còn nợ ⇒ phải còn một lý do chặn riêng.
  w.sqlite.prepare("UPDATE pty_party_role SET valid_to_date = '2026-06-01' WHERE id = 'r-gop'").run();
  const co = (r: { json: { chan: { code: string }[] } }) => r.json.chan.some((c) => c.code === "merge_credit_debt");
  const xem = await w.call("POST", `/api/parties/${aId}/merge/preview`, { as: ADM, body: { intoPartyId: bId } });
  assert.equal(xem.status, 200, xem.text);
  assert.ok(co(xem), JSON.stringify(xem.json.chan));
  const gop = await w.call("POST", `/api/parties/${aId}/merge`, { as: ADM, body: { intoPartyId: bId, xacNhan: TEN } });
  assert.equal(gop.status, 409, gop.text);
  assert.equal(gop.json.error.code, "merge_credit_debt");
  assert.equal(w.q("SELECT booker_party_id AS b FROM orders WHERE id = ?", d.id)[0].b, aId, "đơn không bị dời");
  assert.equal((await thu(w, d.id, T_ZB1)).status, 201);
  const sau = await w.call("POST", `/api/parties/${aId}/merge/preview`, { as: ADM, body: { intoPartyId: bId } });
  assert.equal(sau.status, 200, sau.text);
  assert.ok(!co(sau), "hết nợ thì không còn chặn vì nợ");
});

// ---- Tiêu chí 11: huỷ đơn ----
const moVe = (w: W, orderId: string) => {
  w.sqlite.prepare("INSERT INTO vdt_batch (id, catalog_code, pax_group, printed_name, status, created_at, updated_at) VALUES ('lo-ts', 'ZB1', 'ADULT', 'Vé thử', 'ACTIVE', ?, ?)").run(AT, AT);
  w.sqlite.prepare(
    `INSERT INTO vdt_ticket (id, batch_id, ticket_code, valid_from, valid_to, storage_key, content_kind, byte_size, content_hash, stored_at, status, created_at, updated_at)
     VALUES ('ve-ts', 'lo-ts', 'BI.MAT.TS', '2026-01-01', '2099-12-31', 'k', 'image/png', 10, 'h', ?, 'AVAILABLE', ?, ?)`,
  ).run(AT, AT, AT);
  w.sqlite.prepare("UPDATE vdt_ticket SET status = 'ALLOCATED' WHERE id = 've-ts'").run();
  w.sqlite.prepare(
    `INSERT INTO vdt_allocation (id, ticket_id, order_id, order_service_id, pax_group, slot_no, allocated_at, revealed_at, created_at, updated_at) VALUES ('pb-ts', 've-ts', ?, ?, 'ADULT', 1, ?, ?, ?, ?)`,
  ).run(orderId, svcId(w, orderId), AT, AT, AT, AT);
};
const huy = (w: W, id: string) => w.call("POST", `/api/orders/${id}/status`, { as: A, body: { status: "cancelled", lyDo: "KHACH_DOI_Y" } });

test("huỷ đơn Trả sau còn nợ mà vé đã mở: /status 409; chưa mở vé thì huỷ được và nợ về 0; hết nợ thì huỷ được dù vé đã mở", async () => {
  const w = dung();
  assert.equal((await hanMuc(w, 2_000_000)).status, 201);
  const mo = await donTS(w);
  moVe(w, mo.id);
  const r = await huy(w, mo.id);
  assert.deepEqual([r.status, r.json.error.code], [409, "tra_sau_con_no_da_mo_ve"], r.text);
  assert.equal(w.q("SELECT status FROM orders WHERE id = ?", mo.id)[0].status, "confirmed");
  const chua = await donTS(w);
  assert.equal(await no(w), 2 * T_ZB1);
  const h = await huy(w, chua.id);
  assert.equal(h.status, 200, h.text);
  assert.equal(await no(w), T_ZB1, "đơn huỷ chưa mở vé hết nợ");
  assert.equal((await thu(w, mo.id, T_ZB1)).status, 201);
  assert.equal((await huy(w, mo.id)).status, 200, "đã thu đủ thì huỷ được");
});

test("huỷ qua đường hướng dẫn viên (handler-cancel): còn nợ + vé đã mở 409; chưa mở vé thì huỷ được", async () => {
  const w = dung();
  assert.equal((await hanMuc(w, 2_000_000)).status, 201);
  const mo = await donTS(w);
  const chua = await donTS(w);
  for (const id of [mo.id, chua.id]) assert.equal((await w.call("PUT", `/api/orders/${id}/handler`, { as: A, body: { staffId: H } })).status, 200);
  moVe(w, mo.id);
  const r = await w.call("POST", `/api/orders/${mo.id}/handler-cancel`, { as: H, body: { reason: "customer_requested" } });
  assert.deepEqual([r.status, r.json.error.code], [409, "tra_sau_con_no_da_mo_ve"], r.text);
  assert.equal(w.q("SELECT status FROM orders WHERE id = ?", mo.id)[0].status, "confirmed");
  assert.equal((await w.call("POST", `/api/orders/${chua.id}/handler-cancel`, { as: H, body: { reason: "customer_requested" } })).status, 200);
});

// ---- Đảo và sửa khoản thu: KHÔNG bị chặn, nợ tăng đúng số, phiên bản tăng (chỉ khi đơn là Trả sau) ----
test("đảo khoản thu của đơn Trả sau: không bị chặn, nợ tăng đúng số, phiên bản tăng; đơn Trả trước không chạm dòng phiên bản", async () => {
  const w = dung();
  assert.equal((await hanMuc(w, 1_000_000)).status, 201);
  const d = await donTS(w);
  assert.equal((await thu(w, d.id, T_ZB1)).status, 201);
  assert.equal(await no(w), 0);
  const v0 = phienBan(w)!;
  const rc = w.q("SELECT id FROM bil_payment_receipt WHERE order_id = ? AND reverses_id IS NULL", d.id)[0].id;
  const dao = await w.call("POST", "/api/ledger/adjustments", { as: ACC, body: { loai: "dao_lan_thu", receiptId: rc, lyDo: "ghi nhầm số tiền khách đưa" } });
  assert.equal(dao.status, 201, dao.text);
  assert.equal(await no(w), T_ZB1, "nợ tăng đúng số đã đảo");
  assert.equal(phienBan(w), v0 + 1, "đảo khoản thu tăng phiên bản");
  // đơn Trả trước: đảo không đụng dòng phiên bản
  const r = await w.call("POST", "/api/orders", { as: A, body: { customerName: "Khách Thử", customerPhone: "0912345678", bookerPartyId: BEN, services: [svc("ZB1", inDays(3))] } });
  assert.equal((await w.call("POST", `/api/orders/${r.json.order.id}/status`, { as: A, body: { status: "confirmed" } })).status, 200);
  assert.equal((await thu(w, r.json.order.id, T_ZB1)).status, 201);
  const rc2 = w.q("SELECT id FROM bil_payment_receipt WHERE order_id = ? AND reverses_id IS NULL", r.json.order.id)[0].id;
  assert.equal((await w.call("POST", "/api/ledger/adjustments", { as: ACC, body: { loai: "dao_lan_thu", receiptId: rc2, lyDo: "ghi nhầm số tiền khách đưa" } })).status, 201);
  assert.equal(phienBan(w), v0 + 1, "đơn Trả trước không làm đổi phiên bản");
});

test("sửa (thay) khoản thu của đơn Trả sau: nợ tăng đúng số và phiên bản tăng", async () => {
  const w = dung();
  assert.equal((await hanMuc(w, 1_000_000)).status, 201);
  const d = await donTS(w);
  assert.equal((await thu(w, d.id, T_ZB1)).status, 201);
  const v0 = phienBan(w)!;
  const rc = w.q("SELECT id FROM bil_payment_receipt WHERE order_id = ? AND reverses_id IS NULL", d.id)[0].id;
  const thay = await w.call("POST", "/api/ledger/receipt-replacements", {
    as: ACC, body: { orderId: d.id, cu: [rc], moi: [{ soTien: 400_000, hinhThuc: "CASH", nguoiThu: "cong_ty" }], lyDo: "khách đưa thiếu, sửa lại cho đúng" },
  });
  assert.equal(thay.status, 201, thay.text);
  assert.equal(await no(w), 200_000);
  assert.equal(phienBan(w), v0 + 1);
});

// ---- Bài QUÉT mã nguồn: đường mới không lọt (tiêu chí 9) ----
const goc = new URL("../", import.meta.url).pathname;
function tep(dir: string, out: string[] = []): string[] {
  for (const t of readdirSync(join(goc, dir))) {
    const p = join(dir, t);
    if (statSync(join(goc, p)).isDirectory()) tep(p, out);
    else if (t.endsWith(".ts") && !t.endsWith(".test.ts")) out.push(p);
  }
  return out;
}
const MA_NGUON = tep("src").map((p) => ({ p, s: readFileSync(join(goc, p), "utf8") }));
/** Mọi lời gọi `ten(` trong mã nguồn (trừ dòng khai hàm và chú thích), kèm tệp. */
function noiGoi(ten: string): { p: string; i: number; s: string }[] {
  const re = new RegExp(`(?<![\\w.])${ten}\\(`, "g");
  const out: { p: string; i: number; s: string }[] = [];
  for (const { p, s } of MA_NGUON) {
    for (const m of s.matchAll(re)) {
      const dau = s.lastIndexOf("\n", m.index!) + 1;
      const dong = s.slice(dau, s.indexOf("\n", m.index!));
      if (/^\s*(\/\/|\*|\/\*)/.test(dong) || /\b(export\s+)?(async\s+)?function\s/.test(dong)) continue;
      out.push({ p, i: m.index!, s });
    }
  }
  return out;
}
/** Thân hàm bao quanh vị trí `i` (từ lần khai `function`/`route(` gần nhất ngay trước tới hết lời gọi): đủ để tìm cổng đứng TRƯỚC lời gọi. */
const truocLoiGoi = (n: { s: string; i: number }, doDai = 6000): string => n.s.slice(Math.max(0, n.i - doDai), n.i);

test("QUÉT: mọi nơi gọi soanHuyDon đi qua congHuyTraSau (trừ cancelOrder của repository — hàm không còn nơi gọi)", () => {
  const cho = noiGoi("soanHuyDon").filter((n) => n.p !== "src/modules/orders/repository.ts");
  assert.ok(cho.length >= 3, `chống bài rỗng: thấy ${cho.length} nơi gọi`);
  for (const n of cho) assert.match(truocLoiGoi(n, 2500), /congHuyTraSau\(/, `${n.p}: gọi soanHuyDon mà không có congHuyTraSau đứng trước`);
  assert.equal(noiGoi("cancelOrder").length, 0, "cancelOrder (không qua cổng) không được có nơi gọi mới");
});

test("QUÉT: changeBooker chỉ được gọi sau congDoiBenDatTraSau", () => {
  const cho = noiGoi("changeBooker").filter((n) => !n.p.endsWith("repository.ts"));
  assert.ok(cho.length >= 1, "chống bài rỗng");
  for (const n of cho) assert.match(truocLoiGoi(n, 3500), /congDoiBenDatTraSau\(/, `${n.p}: changeBooker không có cổng`);
});

test("QUÉT: soanSuaSoKhach (đường chung của hai route sửa số khách) gọi congSuaTangTraSau, và cả hai nơi gọi truyền cổng", () => {
  const ORDERS = MA_NGUON.find((x) => x.p === "src/modules/orders/index.ts")!.s;
  const tu = ORDERS.indexOf("async function soanSuaSoKhach(");
  assert.ok(tu > 0);
  const than = ORDERS.slice(tu, ORDERS.indexOf("\n}\n", tu));
  assert.match(than, /congSuaTangTraSau\(/, "thân soanSuaSoKhach phải gọi congSuaTangTraSau");
  const cho = noiGoi("soanSuaSoKhach");
  assert.equal(cho.length, 2, "hai nơi gọi: editMoneyAsHandler và route money-edit");
  for (const n of cho) assert.match(n.s.slice(n.i, n.i + 400), /traSau/i, "nơi gọi truyền cổng Trả sau");
});

test("QUÉT: các đường đảo / sửa / hoàn khoản thu của billing đều nối cauTangChoDon vào lô", () => {
  const SV = MA_NGUON.find((x) => x.p === "src/modules/billing/service.ts")!.s;
  const TL = MA_NGUON.find((x) => x.p === "src/modules/billing/thay-lan-thu.ts")!.s;
  const dem = (s: string) => (s.match(/cauTangChoDon\(/g) ?? []).length;
  assert.ok(dem(SV) >= 3, `service.ts: hoàn, đảo lần thu, đảo dòng — thấy ${dem(SV)}`);
  assert.ok(dem(TL) >= 1, `thay-lan-thu.ts — thấy ${dem(TL)}`);
});
