// ADR-0236 Đ1, Đ2 (lệnh chủ 26/11: «1- bật lại đi … cho cả 2 tùy chọn này vào trong bảng điều khiển của Admin , Super Admin»): công tắc «Ô khách đặt cọc cho đối tác».
// `GET`/`POST /api/cai-dat/o-dat-coc-doi-tac`: GHI ô `settings.form_fields` (Quản trị + Toàn quyền), MỘT lô dòng chỉ-thêm + nhật ký; thua mốc ⇒ 409 `stale`; gửi đúng trạng thái đang có ⇒ 200,
// không ghi; thiếu `Origin` ⇒ 403. Gieo BẬT. MÁY CHỦ TUÂN THEO: công tắc Tắt ⇒ tài khoản Đối tác gửi lời khai > 0 bị 409 `o_dat_coc_dang_tat`; không gửi khoá / gửi 0 ⇒ giữ số đang lưu;
// nháp đã khai lúc Bật vẫn thành khoản thu tiền mặt khi xác nhận dù công tắc đã Tắt (ADR-0225 Đ1 mục 5). Chạy CẢ ứng dụng trên SQLite thật (tests/audit/harness.mjs). Tên, SĐT GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { A, ACC, ADM, H, INTERN, LAI, PARTNER, SUP, inDays, setup, svc } from "../../../tests/audit/xac-nhan-khung.mjs";
import { docHienODatCoc } from "./xac-nhan-repo.ts";

const URL = "/api/cai-dat/o-dat-coc-doi-tac";
type W = ReturnType<typeof setup>;
const dat = (w: W, as: string, hien: unknown, headers: Record<string, unknown> = {}) => w.call("POST", URL, { as, body: { hien }, headers });
const dem = (w: W, sql: string, ...a: unknown[]): number => Number(w.q(sql, ...a)[0].n);
const soDong = (w: W) => dem(w, "SELECT count(*) AS n FROM ord_partner_deposit_field_policy");
const soNhatKy = (w: W) => dem(w, "SELECT count(*) AS n FROM audit_log WHERE action = 'partner_deposit_field_policy_changed'");
const than = (coc: unknown, extra: Record<string, unknown> = {}, dv: unknown[] = [svc("ZB1", inDays(3))]) => ({ customerName: "Khách Thử", customerPhone: "0912345678", services: dv, ...(coc === undefined ? {} : { declaredDeposit: coc }), ...extra });
const lap = (w: W, as: string, coc: unknown) => w.call("POST", "/api/orders", { as, body: than(coc) });
const cot = (w: W, id: string) => Number(w.q("SELECT declared_deposit AS n FROM orders WHERE id = ?", id)[0].n);
const moc = (w: W, id: string) => w.q("SELECT updated_at AS u FROM orders WHERE id = ?", id)[0].u;
const sua = (w: W, id: string, coc: unknown) =>
  w.call("PUT", `/api/orders/${id}`, { as: PARTNER, body: than(coc, { expectedUpdatedAt: moc(w, id) }, [{ ...svc("ZB1", inDays(3)), id: w.q("SELECT id FROM order_service WHERE order_id = ?", id)[0].id }]) });

test("cổng: Bán hàng, Thực tập, Đối tác, tài khoản lai, Kế toán, HDV POST ⇒ 403, không ghi; Quản trị VÀ Toàn quyền đổi được ⇒ 200 + MỘT nhật ký không gắn đơn; gửi đúng trạng thái đang có ⇒ 200, không ghi", async () => {
  const w = setup();
  assert.deepEqual((await w.call("GET", URL, { as: SUP })).json, { hien: true, apChoToi: false, doiDuoc: true }, "mặc định Bật (migration gieo 1)");
  assert.deepEqual((await w.call("GET", URL, { as: ADM })).json, { hien: true, apChoToi: false, doiDuoc: true }, "Quản trị cũng đổi được (lệnh chủ 26/11)");
  for (const ai of [A, INTERN, PARTNER, LAI, ACC, H]) assert.equal((await dat(w, ai, false)).status, 403, `POST ${ai}`);
  assert.equal(soDong(w), 1, "từ chối thì không ghi");
  assert.equal(soNhatKy(w), 0);
  const r = await dat(w, ADM, false);
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json, { hien: false, apChoToi: false, doiDuoc: true });
  const nk = w.q("SELECT detail, order_id, target_type, staff_id FROM audit_log WHERE action = 'partner_deposit_field_policy_changed'");
  assert.equal(nk.length, 1);
  assert.equal(nk[0].detail, "Tắt ô khách đặt cọc cho đối tác");
  assert.equal(nk[0].order_id ?? null, null, "không gắn đơn");
  assert.equal(nk[0].target_type, "system");
  assert.equal(nk[0].staff_id, ADM);
  assert.equal(soDong(w), 2);
  assert.equal((await dat(w, SUP, false)).status, 200);
  assert.equal(soDong(w), 2, "đúng trạng thái đang có: không ghi dòng");
  assert.equal(soNhatKy(w), 1, "cũng không thêm nhật ký");
  const bat = await dat(w, SUP, true);
  assert.equal(bat.json.hien, true);
  assert.equal(w.q("SELECT detail FROM audit_log WHERE action = 'partner_deposit_field_policy_changed' ORDER BY rowid DESC LIMIT 1")[0].detail, "Bật ô khách đặt cọc cho đối tác");
  assert.equal(soDong(w), 3, "chỉ-thêm: dòng cũ còn nguyên");
  for (const xau of ["co", 1, null, undefined]) assert.equal((await dat(w, SUP, xau)).status, 400, `thân sai ${String(xau)}`);
});

test("GET: `apChoToi` = bật VÀ giữ quyền Đối tác (Đối tác, tài khoản lai); Bán hàng, Thực tập không bị áp; Kế toán, HDV ⇒ 403", async () => {
  const w = setup();
  for (const ai of [PARTNER, LAI]) assert.deepEqual((await w.call("GET", URL, { as: ai })).json, { hien: true, apChoToi: true, doiDuoc: false }, `Bật, GET ${ai}`);
  for (const ai of [A, INTERN]) assert.deepEqual((await w.call("GET", URL, { as: ai })).json, { hien: true, apChoToi: false, doiDuoc: false }, `Bật, GET ${ai}`);
  for (const ai of [ACC, H]) assert.equal((await w.call("GET", URL, { as: ai })).status, 403, `GET ${ai}`);
  assert.equal((await dat(w, SUP, false)).status, 200);
  for (const ai of [PARTNER, LAI]) assert.deepEqual((await w.call("GET", URL, { as: ai })).json, { hien: false, apChoToi: false, doiDuoc: false }, `Tắt, GET ${ai}`);
});

test("thiếu header Origin ⇒ 403, không ghi gì", async () => {
  const w = setup();
  const r = await dat(w, SUP, false, { origin: null });
  assert.equal(r.status, 403, r.text);
  assert.equal(soDong(w), 1);
  assert.equal(soNhatKy(w), 0);
});

test("hai lần đổi trùng mốc ⇒ 409 stale, KHÔNG ghi gì (không dòng của lô thua, không nhật ký)", async () => {
  const w = setup();
  w.chenTruocLo(
    (stmts: { sql: string }[]) => stmts.some((s) => /INSERT INTO ord_partner_deposit_field_policy/.test(s.sql)),
    (stmts: { sql: string; args: unknown[] }[]) => {
      const cau = stmts.find((s) => /INSERT INTO ord_partner_deposit_field_policy/.test(s.sql))!;
      const at = cau.args[2] as string;
      w.sqlite.prepare("INSERT INTO ord_partner_deposit_field_policy (id, hien, valid_from_at, created_at, updated_at) VALUES ('nguoi-khac', 0, ?1, ?1, ?1)").run(at);
    },
  );
  const r = await dat(w, SUP, false);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "stale");
  assert.equal(soDong(w), 2);
  assert.equal(soNhatKy(w), 0);
});

test("docHienODatCoc: dòng mới nhất có valid_from_at ≤ lúc xét; dòng hẹn tương lai chưa áp; KHÔNG có dòng nào ⇒ Bật (lệnh chủ 26/11)", async () => {
  const w = setup();
  assert.equal(await docHienODatCoc(w.env.DB, new Date().toISOString()), true);
  w.sqlite.prepare("INSERT INTO ord_partner_deposit_field_policy (id, hien, valid_from_at, created_at, updated_at) VALUES ('tl', 0, '2999-01-01T00:00:00.000Z', 'x', 'x')").run();
  assert.equal(await docHienODatCoc(w.env.DB, new Date().toISOString()), true, "dòng tương lai chưa áp");
  assert.equal(await docHienODatCoc(w.env.DB, "2999-06-01T00:00:00.000Z"), false);
});

test("máy chủ tuân theo: Tắt ⇒ Đối tác lập / lưu nháp với lời khai > 0 bị 409 `o_dat_coc_dang_tat`, không ghi; không gửi khoá hoặc gửi 0 vẫn lập được; Bật lại ⇒ khai được", async () => {
  const w = setup();
  const truoc = await lap(w, PARTNER, 200000);
  assert.equal(truoc.status, 201, `Bật: khai được — ${truoc.text}`);
  const id = truoc.json.order.id;
  assert.equal(cot(w, id), 200000);
  assert.equal((await dat(w, ADM, false)).status, 200);
  const soDon = dem(w, "SELECT count(*) AS n FROM orders");
  const bi = await lap(w, PARTNER, 150000);
  assert.equal(bi.status, 409, bi.text);
  assert.equal(bi.json.error.code, "o_dat_coc_dang_tat");
  assert.match(bi.json.error.message, /đặt cọc/);
  assert.equal(dem(w, "SELECT count(*) AS n FROM orders"), soDon, "bị chặn thì không lập đơn");
  for (const coc of [undefined, 0]) assert.equal((await lap(w, PARTNER, coc)).status, 201, `Tắt, lời khai ${String(coc)} ⇒ vẫn lập được`);
  const suaBi = await sua(w, id, 100000);
  assert.equal(suaBi.status, 409, suaBi.text);
  assert.equal(suaBi.json.error.code, "o_dat_coc_dang_tat");
  assert.equal(cot(w, id), 200000, "bị chặn thì số cũ giữ nguyên");
  const giu = await sua(w, id, undefined);
  assert.equal(giu.status, 200, giu.text);
  assert.equal(cot(w, id), 200000, "Tắt mà thân không có khoá: nháp khai lúc Bật giữ số (ADR-0225 Đ1 mục 5)");
  const g = await w.call("POST", `/api/orders/${id}/gui-don`, { as: PARTNER, body: {} });
  assert.equal(g.status, 200, g.text);
  const khoan = w.q("SELECT amount, method_code FROM bil_payment_receipt WHERE order_id = ?", id);
  assert.deepEqual(khoan.map((k: any) => [k.amount, k.method_code]), [[200000, "CASH"]], "xác nhận lúc Tắt vẫn sinh đúng một khoản thu tiền mặt (khớp ADR-0225 Đ2)");
  assert.equal((await dat(w, SUP, true)).status, 200);
  assert.equal((await lap(w, PARTNER, 120000)).status, 201, "Bật lại: khai được");
});

test("Tắt không đổi luật cũ của người không giữ quyền Đối tác: Bán hàng gửi lời khai > 0 vẫn 403 như ADR-0159", async () => {
  const w = setup();
  assert.equal((await dat(w, SUP, false)).status, 200);
  assert.equal((await lap(w, A, 100000)).status, 403);
});
