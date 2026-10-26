// ADR-0136 Đ1, Đ5 — Task 3.3 (lát 4): cài đặt cờ «cần xác nhận» theo dịch vụ / nhóm và công tắc «nội bộ tự xác nhận». Chỉ Toàn quyền (ô settings.ops) ghi; mỗi lần đổi là MỘT dòng mới
// chỉ-thêm kèm nhật ký không gắn đơn; gửi lại đúng trạng thái đang hiệu lực = 200 không ghi gì. Chạy CẢ ứng dụng trên SQLite thật.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { A, ACC, ADM, H, INTERN, PARTNER, SUP, inDays, lap, leg, setup, svc } from "../../../tests/audit/xac-nhan-khung.mjs";

const URL = "/api/cai-dat/xac-nhan-don";
const dat = (w: any, as: string, body: unknown) => w.call("POST", URL, { as, body });
const dongCo = (w: any) => w.q("SELECT count(*) AS n FROM ord_service_confirm_flag")[0].n as number;
const nhatKy = (w: any, action: string) => w.q("SELECT detail FROM audit_log WHERE action = ?", action) as { detail: string }[];

test("GET: Toàn quyền đọc được; mặc định chưa có cờ nào và công tắc tự xác nhận BẬT (migration gieo 1)", async () => {
  const w = setup();
  const r = await w.call("GET", URL, { as: SUP });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json, { dongCo: [], tuXacNhanNoiBo: true });
});

test("POST dịch vụ: đặt cờ → GET thấy, nhật ký có, và đơn mới lập với dịch vụ ấy phải qua bước xác nhận; đặt lại false thì hết", async () => {
  const w = setup();
  const r = await dat(w, SUP, { pham: "SERVICE", ma: "ZA1", canXacNhan: true });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json.dongCo, [{ pham: "SERVICE", ma: "ZA1", canXacNhan: true }]);
  assert.equal(nhatKy(w, "confirm_flag_changed").length, 1);
  assert.ok(!nhatKy(w, "confirm_flag_changed")[0]!.detail.includes("0900"));
  assert.equal(w.q("SELECT target_id FROM audit_log WHERE action = 'confirm_flag_changed'")[0].target_id ?? null, null, "không gắn đơn");
  const ngay = inDays(3);
  const o = await lap(w, A, [svc("ZA1", ngay, [leg(ngay, "07:00")])]);
  assert.equal((await w.call("POST", `/api/orders/${o.id}/status`, { as: A, body: { status: "confirmed" } })).json.error.code, "confirm_request_required");
  const r2 = await dat(w, SUP, { pham: "SERVICE", ma: "ZA1", canXacNhan: false });
  assert.equal(r2.status, 200, r2.text);
  assert.deepEqual(r2.json.dongCo, [{ pham: "SERVICE", ma: "ZA1", canXacNhan: false }]);
  assert.equal(dongCo(w), 2, "chỉ-thêm: dòng cũ còn nguyên");
});

test("POST gửi đúng trạng thái đang hiệu lực = 200, KHÔNG ghi dòng, KHÔNG nhật ký", async () => {
  const w = setup();
  assert.equal((await dat(w, SUP, { pham: "SERVICE", ma: "ZA1", canXacNhan: true })).status, 200);
  const n = dongCo(w);
  const r = await dat(w, SUP, { pham: "SERVICE", ma: "ZA1", canXacNhan: true });
  assert.equal(r.status, 200);
  assert.equal(dongCo(w), n);
  assert.equal(nhatKy(w, "confirm_flag_changed").length, 1);
  // chưa có cờ mà gửi false cũng không ghi (mặc định đã là không cần)
  assert.equal((await dat(w, SUP, { pham: "SERVICE", ma: "ZB1", canXacNhan: false })).status, 200);
  assert.equal(dongCo(w), n);
});

test("POST nhóm: nhóm đang có dịch vụ đặt được; nhóm lạ → 400", async () => {
  const w = setup();
  const t = new Date(Date.now() - 5000).toISOString();
  w.sqlite.exec(`INSERT OR IGNORE INTO ctl_group (code, name, sort_order, active, created_at, updated_at) VALUES ('TTB', 'Tour tham quan', 1, 1, '${t}', '${t}')`);
  w.sqlite.exec(`INSERT INTO ctl_service_group (id, service_code, group_code, seq, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES ('g1', 'ZA1', 'TTB', 1, '${t}', '${t}', NULL, '${t}', NULL)`);
  const r = await dat(w, SUP, { pham: "GROUP", ma: "TTB", canXacNhan: true });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json.dongCo, [{ pham: "GROUP", ma: "TTB", canXacNhan: true }]);
  assert.equal((await dat(w, SUP, { pham: "GROUP", ma: "KHONGCO", canXacNhan: true })).status, 400);
});

test("POST mã dịch vụ lạ / thân sai → 400 và không ghi gì", async () => {
  const w = setup();
  for (const body of [
    { pham: "SERVICE", ma: "KHONGCO", canXacNhan: true }, { pham: "SERVICE", ma: "", canXacNhan: true }, { pham: "SERVICE", ma: "ZA1", canXacNhan: "co" },
    { pham: "KHAC", ma: "ZA1", canXacNhan: true }, { tuXacNhanNoiBo: "co" }, {}, null,
  ]) assert.equal((await dat(w, SUP, body)).status, 400, JSON.stringify(body));
  assert.equal(dongCo(w), 0);
});

test("công tắc tự xác nhận: tắt → GET false + nhật ký; gửi lại đúng trạng thái không ghi; bật lại có dòng mới", async () => {
  const w = setup();
  const r = await dat(w, SUP, { tuXacNhanNoiBo: false });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.tuXacNhanNoiBo, false);
  assert.equal((await w.call("GET", URL, { as: SUP })).json.tuXacNhanNoiBo, false);
  assert.equal(nhatKy(w, "confirm_policy_changed").length, 1);
  assert.equal((await dat(w, SUP, { tuXacNhanNoiBo: false })).status, 200);
  assert.equal(w.q("SELECT count(*) AS n FROM ord_confirm_policy")[0].n, 2, "dòng gieo + một dòng tắt");
  assert.equal((await dat(w, SUP, { tuXacNhanNoiBo: true })).json.tuXacNhanNoiBo, true);
  assert.equal(w.q("SELECT count(*) AS n FROM ord_confirm_policy")[0].n, 3);
});

test("cổng quyền (ô settings.ops): Quản trị, Bán hàng, Kế toán, HDV, Thực tập, Đối tác → 403 cả GET lẫn POST, không ghi gì", async () => {
  const w = setup();
  for (const ai of [ADM, A, ACC, H, INTERN, PARTNER]) {
    assert.equal((await w.call("GET", URL, { as: ai })).status, 403, `GET ${ai}`);
    assert.equal((await dat(w, ai, { pham: "SERVICE", ma: "ZA1", canXacNhan: true })).status, 403, `POST ${ai}`);
    assert.equal((await dat(w, ai, { tuXacNhanNoiBo: false })).status, 403, `POST công tắc ${ai}`);
  }
  assert.equal(dongCo(w), 0);
  assert.equal(w.q("SELECT count(*) AS n FROM ord_confirm_policy")[0].n, 1);
});

test("hai lần đổi liền nhau cùng mốc: dòng sau đi sau dòng trước (không va UNIQUE), cả hai có hiệu lực theo thứ tự", async () => {
  const w = setup();
  const t = new Date(Date.now() + 60_000).toISOString();
  // dòng cờ mới nhất đã ở TƯƠNG LAI: dòng kế phải đi sau nó đúng 1 ms, không lùi
  w.sqlite.prepare("INSERT INTO ord_service_confirm_flag (id, scope, code, required, valid_from_at, created_at, updated_at) VALUES (?, 'SERVICE', 'ZB1', 0, ?, ?, ?)").run("f-tl", t, t, t);
  assert.equal((await dat(w, SUP, { pham: "SERVICE", ma: "ZA1", canXacNhan: true })).status, 200);
  const moi = w.q("SELECT valid_from_at AS v FROM ord_service_confirm_flag WHERE code = 'ZA1'")[0].v as string;
  assert.equal(Date.parse(moi), Date.parse(t) + 1);
});
