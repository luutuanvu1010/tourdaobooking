// Ô «Vé do ai phát» (ADR-0175 Đ1.2, Đ1.5) qua ứng dụng THẬT: chỉ trên từng dịch vụ, chưa đặt là vé hãng ngoài; dùng chung ô quyền của ô «Có vé» (ADR-0174 Đ4).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { ACC, ADM, PARTNER, SALES, SUP, batDongHo, setup } from "../../../tests/audit/dieu-phoi-khung.mjs";

const URL_NV = "/api/catalog/nguon-ve";
const doi = (w: any, ma: unknown, nguon: unknown, as = ADM) => w.call("POST", URL_NV, { as, body: { ma, nguon } });
const nk = (w: any) => w.q("SELECT count(*) AS n FROM audit_log WHERE action = 'ticket_source_changed'")[0].n as number;
const bang = (w: any) => w.q("SELECT count(*) AS n FROM ctl_service_ticket_source")[0].n as number;

test("GET: mọi dịch vụ của danh mục kèm giá trị hiện hành; chưa đặt là HANG_NGOAI", async () => {
  const w = setup();
  const r = await w.call("GET", URL_NV, { as: ADM });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json, { dichVu: [{ ma: "ZA1", nguon: "HANG_NGOAI" }] });
  assert.equal((await doi(w, "ZA1", "TOUR_DAO")).status, 200);
  assert.deepEqual((await w.call("GET", URL_NV, { as: SUP })).json, { dichVu: [{ ma: "ZA1", nguon: "TOUR_DAO" }] });
});

test("quyền: Quản trị, Toàn quyền đổi được, có nhật ký chỉ mã và nguồn; Bán hàng, Kế toán, Đối tác 403 cả GET lẫn POST", async () => {
  const w = setup();
  for (const as of [SALES, ACC, PARTNER]) {
    assert.equal((await doi(w, "ZA1", "TOUR_DAO", as)).status, 403);
    assert.equal((await w.call("GET", URL_NV, { as })).status, 403);
  }
  assert.deepEqual([bang(w), nk(w)], [0, 0]);
  const r = await doi(w, "ZA1", "TOUR_DAO", ADM);
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json, { dichVu: [{ ma: "ZA1", nguon: "TOUR_DAO" }] });
  assert.deepEqual([bang(w), nk(w)], [1, 1]);
  const dong = w.q("SELECT target_type, target_id, detail FROM audit_log WHERE action = 'ticket_source_changed'")[0];
  assert.equal(dong.target_id, "ZA1");
  assert.match(dong.detail, /ZA1/);
  assert.match(dong.detail, /Vé Tour Đảo/);
  assert.equal((await doi(w, "ZA1", "TOUR_DAO", SUP)).status, 200);
  assert.deepEqual([bang(w), nk(w)], [1, 1], "gửi đúng giá trị đang có: không ghi");
  assert.equal((await doi(w, "ZA1", "HANG_NGOAI", SUP)).status, 200);
  assert.deepEqual([bang(w), nk(w)], [2, 2]);
});

test("chưa đặt mà gửi HANG_NGOAI là giá trị đang có: 200, không ghi", async () => {
  const w = setup();
  assert.equal((await doi(w, "ZA1", "HANG_NGOAI")).status, 200);
  assert.deepEqual([bang(w), nk(w)], [0, 0]);
});

test("thân sai: nguồn lạ, thiếu mã, mã không có trong danh mục, ô theo nhóm → 400, không ghi", async () => {
  const w = setup();
  for (const [ma, nguon] of [["ZA1", "KHAC"], ["ZA1", undefined], ["", "TOUR_DAO"], [undefined, "TOUR_DAO"], ["KHONGCO", "TOUR_DAO"], ["ZA1", true]]) {
    assert.equal((await doi(w, ma, nguon)).status, 400, `${String(ma)} / ${String(nguon)}`);
  }
  assert.equal((await w.call("POST", URL_NV, { as: ADM, body: { pham: "GROUP", ma: "ZA1", nguon: "TOUR_DAO" } })).status, 200, "không có ô theo nhóm: trường pham bị bỏ qua, vẫn là ô của dịch vụ ZA1");
  assert.equal(w.q("SELECT count(*) AS n FROM ctl_service_ticket_source WHERE code = 'ZA1'")[0].n, 1);
});

test("hai lần đổi cùng mili-giây: đúng một lần ghi, lần kia 409 stale", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    // Lần thứ hai chen vào NGAY TRƯỚC lô ghi của lần đầu (cả hai đã đọc «vé hãng ngoài», đồng hồ đứng nên cùng mốc): lần đầu va UNIQUE.
    let lanHai: any;
    w.chenTruocLo((stmts: { sql: string }[]) => stmts.some((x) => /ctl_service_ticket_source/.test(x.sql)), async () => { lanHai = await doi(w, "ZA1", "TOUR_DAO", SUP); });
    const lanDau = await doi(w, "ZA1", "TOUR_DAO", ADM);
    assert.equal(lanHai.status, 200, lanHai.text);
    assert.equal(lanDau.status, 409, lanDau.text);
    assert.equal(lanDau.json.error.code, "stale");
    assert.deepEqual([bang(w), nk(w)], [1, 1], "lô thua không để lại dòng hay nhật ký");
  } finally { tat(); }
});

test("đổi liên tiếp trong cùng mili-giây (đồng hồ đứng): mốc sau luôn lớn hơn mốc trước, cả hai đều ghi", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    assert.equal((await doi(w, "ZA1", "TOUR_DAO")).status, 200);
    assert.equal((await doi(w, "ZA1", "HANG_NGOAI")).status, 200);
    assert.deepEqual((await w.call("GET", URL_NV, { as: ADM })).json, { dichVu: [{ ma: "ZA1", nguon: "HANG_NGOAI" }] });
    assert.equal(bang(w), 2);
  } finally { tat(); }
});
