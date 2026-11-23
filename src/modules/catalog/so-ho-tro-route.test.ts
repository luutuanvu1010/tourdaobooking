// Ô «Hotline trên vé» (ADR-0231) qua ứng dụng THẬT: ô theo dịch vụ, chỉ thêm; số không vào nhật ký; lô vé Tour Đảo chụp số lúc mở lô, không đổi sau đó.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { ACC, ADM, PARTNER, SALES, SUP, batDongHo, setup } from "../../../tests/audit/dieu-phoi-khung.mjs";

const URL_SO = "/api/catalog/so-ho-tro";
const doi = (w: any, ma: unknown, so: unknown, as = ADM) => w.call("POST", URL_SO, { as, body: { ma, so } });
const nk = (w: any) => w.q("SELECT count(*) AS n FROM audit_log WHERE action = 'ticket_support_phone_changed'")[0].n as number;
const bang = (w: any) => w.q("SELECT count(*) AS n FROM ctl_service_support_phone")[0].n as number;
const AT = "2026-01-01T00:00:00.000Z";

test("GET: chỉ dịch vụ đã đặt số; chưa đặt thì rỗng", async () => {
  const w = setup();
  assert.deepEqual((await w.call("GET", URL_SO, { as: ADM })).json, { dichVu: [] });
  const r = await doi(w, "ZA1", "1900 1234");
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json, { dichVu: [{ ma: "ZA1", so: "19001234" }] }, "lưu dạng chuẩn chỉ chữ số");
  assert.deepEqual((await w.call("GET", URL_SO, { as: SUP })).json, { dichVu: [{ ma: "ZA1", so: "19001234" }] });
});

test("quyền: Quản trị, Toàn quyền ghi; Kế toán (giữ ve.phat-hanh) chỉ đọc; Bán hàng, Đối tác 403", async () => {
  const w = setup();
  for (const as of [SALES, ACC, PARTNER]) assert.equal((await doi(w, "ZA1", "0905123456", as)).status, 403);
  for (const as of [SALES, PARTNER]) assert.equal((await w.call("GET", URL_SO, { as })).status, 403);
  assert.equal((await w.call("GET", URL_SO, { as: ACC })).status, 200, "Kế toán tạo vé Tour Đảo nên đọc được số để điền sẵn");
  assert.deepEqual([bang(w), nk(w)], [0, 0]);
});

test("nhật ký có mã dịch vụ, KHÔNG có số; gửi số đang có không ghi; xoá số = dòng NULL, GET không còn dịch vụ đó", async () => {
  const w = setup();
  assert.equal((await doi(w, "ZA1", "(0258) 3812 345")).status, 200);
  assert.equal((await doi(w, "ZA1", "0258.3812.345", SUP)).status, 200);
  assert.deepEqual([bang(w), nk(w)], [1, 1], "cùng số (khác cách gõ): không ghi");
  assert.equal((await doi(w, "ZA1", "")).status, 200);
  assert.equal((await doi(w, "ZA1", null)).status, 200);
  assert.deepEqual([bang(w), nk(w)], [2, 2], "xoá một lần, gửi xoá lần hai không ghi");
  assert.deepEqual((await w.call("GET", URL_SO, { as: ADM })).json, { dichVu: [] });
  const dong = w.q("SELECT target_id, detail FROM audit_log WHERE action = 'ticket_support_phone_changed' ORDER BY rowid");
  assert.deepEqual(dong.map((d: any) => d.target_id), ["ZA1", "ZA1"]);
  for (const d of dong) assert.doesNotMatch(d.detail, /\d{4}/, "nhật ký không chứa số");
  assert.equal(w.q("SELECT phone FROM ctl_service_support_phone ORDER BY valid_from_at DESC LIMIT 1")[0].phone, null);
});

test("thân sai: số sai dạng, kiểu lạ, thiếu mã, mã lạ → 400, câu lỗi không nhắc lại số, không ghi", async () => {
  const w = setup();
  for (const [ma, so] of [["ZA1", "12345"], ["ZA1", 19001234], ["ZA1", undefined], ["", "19001234"], [undefined, "19001234"], ["KHONGCO", "19001234"]]) {
    const r = await doi(w, ma, so);
    assert.equal(r.status, 400, `${String(ma)} / ${String(so)}`);
    assert.doesNotMatch(r.text, /12345|19001234/);
  }
  assert.deepEqual([bang(w), nk(w)], [0, 0]);
});

test("bảng chỉ thêm: trigger cấm sửa, cấm xoá", () => {
  const w = setup();
  w.sqlite.prepare("INSERT INTO ctl_service_support_phone (id, code, phone, valid_from_at, created_at, updated_at) VALUES ('a', 'ZA1', '19001234', ?, ?, ?)").run(AT, AT, AT);
  assert.throws(() => w.sqlite.prepare("UPDATE ctl_service_support_phone SET phone = '0905123456'").run(), /append_only/);
  assert.throws(() => w.sqlite.prepare("DELETE FROM ctl_service_support_phone").run(), /append_only/);
});

test("hai lần đổi cùng mili-giây: đúng một lần ghi, lần kia 409 stale", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    let lanHai: any;
    w.chenTruocLo((stmts: { sql: string }[]) => stmts.some((x) => /ctl_service_support_phone/.test(x.sql)), async () => { lanHai = await doi(w, "ZA1", "19001234", SUP); });
    const lanDau = await doi(w, "ZA1", "19001234", ADM);
    assert.equal(lanHai.status, 200, lanHai.text);
    assert.equal(lanDau.status, 409, lanDau.text);
    assert.deepEqual([bang(w), nk(w)], [1, 1]);
  } finally { tat(); }
});

test("lô vé Tour Đảo chụp hotline lúc mở lô; đổi số dịch vụ sau đó không đổi lô; trigger khoá cột; lô không gửi số là NULL", async () => {
  const w = setup();
  w.sqlite.prepare("INSERT INTO ctl_service_ticket_source (id, code, source, valid_from_at, created_at, updated_at) VALUES (?, 'ZA1', 'TOUR_DAO', ?, ?, ?)").run(crypto.randomUUID(), AT, AT, AT);
  const mo = (than: Record<string, unknown>) => w.call("POST", "/api/ve/lo", { as: ACC, body: { catalogCode: "ZA1", nhomKhach: "ADULT", tenSanPham: "Tour đảo", nguon: "TOUR_DAO", soVeDuKien: 1, ...than } });
  const a = await mo({ soHoTro: "1900 1234" });
  assert.equal(a.status, 201, a.text);
  assert.equal((await doi(w, "ZA1", "0905123456")).status, 200);
  assert.equal(w.q("SELECT support_phone FROM vdt_batch WHERE id = ?", a.json.loId)[0].support_phone, "19001234");
  assert.throws(() => w.sqlite.prepare("UPDATE vdt_batch SET support_phone = '0905123456' WHERE id = ?").run(a.json.loId), /vdt_one_way/);
  const b = await mo({});
  assert.equal(b.status, 201, b.text);
  assert.equal(w.q("SELECT support_phone FROM vdt_batch WHERE id = ?", b.json.loId)[0].support_phone, null);
  const sai = await mo({ soHoTro: "123" });
  assert.equal(sai.status, 400);
  const nhatKyLo = w.q("SELECT detail FROM audit_log WHERE action = 've_nhap_lo'");
  for (const d of nhatKyLo) assert.doesNotMatch(d.detail ?? "", /1900|1234/, "nhật ký mở lô không chứa số");
});
