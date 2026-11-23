// Ô «Vé do ai phát» (ADR-0175 Đ1.2, Đ1.5; theo nhóm ADR-0230 Đ3) qua ứng dụng THẬT: dòng riêng của dịch vụ thắng, không thì dòng của nhóm hiện tại, chưa đặt là vé hãng ngoài;
// dùng chung ô quyền của ô «Có vé» (ADR-0174 Đ4).
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
  assert.deepEqual(r.json, { dichVu: [{ ma: "ZA1", nguon: "HANG_NGOAI", theo: "CHUA_KHAI" }], nhom: [] });
  assert.equal((await doi(w, "ZA1", "TOUR_DAO")).status, 200);
  assert.deepEqual((await w.call("GET", URL_NV, { as: SUP })).json, { dichVu: [{ ma: "ZA1", nguon: "TOUR_DAO", theo: "SERVICE" }], nhom: [] });
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
  assert.deepEqual(r.json, { dichVu: [{ ma: "ZA1", nguon: "TOUR_DAO", theo: "SERVICE" }], nhom: [] });
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

// Đổi 23/11/2026 (Việc 11, ADR-0230 Đ3): chọn cho dịch vụ là đặt dòng riêng, kể cả khi trùng giá trị mặc định — xem bài cuối tệp.
test("chưa đặt mà gửi HANG_NGOAI: ghi dòng riêng một lần; gửi lại đúng dòng riêng đang có: 200, không ghi", async () => {
  const w = setup();
  assert.equal((await doi(w, "ZA1", "HANG_NGOAI")).status, 200);
  assert.deepEqual([bang(w), nk(w)], [1, 1]);
  assert.equal((await doi(w, "ZA1", "HANG_NGOAI")).status, 200);
  assert.deepEqual([bang(w), nk(w)], [1, 1]);
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
    assert.deepEqual((await w.call("GET", URL_NV, { as: ADM })).json, { dichVu: [{ ma: "ZA1", nguon: "HANG_NGOAI", theo: "SERVICE" }], nhom: [] });
    assert.equal(bang(w), 2);
  } finally { tat(); }
});

// ---- ADR-0230 Đ3: «Vé do ai phát» theo NHÓM ----
const AT = "2026-01-01T00:00:00.000Z";
const doiNhom = (w: any, nhom: unknown, nguon: unknown, as = ADM) => w.call("POST", URL_NV, { as, body: { nhom, nguon } });
const nkNhom = (w: any) => w.q("SELECT count(*) AS n FROM audit_log WHERE action = 'ticket_source_group_changed'")[0].n as number;
const bangNhom = (w: any) => w.q("SELECT count(*) AS n FROM ctl_group_ticket_source")[0].n as number;
/** Thêm dịch vụ ZB2, hai nhóm NTD (hoạt động) và NTAT (đã tắt); ZA1, ZB2 cùng thuộc NTD. */
function dungNhom(w: any): void {
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZB2', 'Lặn biển', 'perPax', 500000, 1, '2026-01-01', '2026-01-01')");
  for (const [code, active] of [["NTD", 1], ["NTAT", 0]] as const) w.sqlite.prepare("INSERT INTO ctl_group (code, name, sort_order, active, created_at, updated_at) VALUES (?, ?, 99, ?, ?, ?)").run(code, `Nhóm ${code}`, active, AT, AT);
  for (const ma of ["ZA1", "ZB2"]) w.sqlite.prepare("INSERT INTO ctl_service_group (id, service_code, group_code, seq, valid_from_at, created_at, updated_at) VALUES (?, ?, 'NTD', 1, ?, ?, ?)").run(`g-${ma}`, ma, AT, AT, AT);
}
const nguonCua = async (w: any, ma: string) => ((await w.call("GET", URL_NV, { as: ADM })).json.dichVu as { ma: string; nguon: string; theo: string }[]).find((d) => d.ma === ma);

test("nhóm = Vé Tour Đảo: dịch vụ trong nhóm không có dòng riêng thành Tour Đảo «theo nhóm»; dịch vụ có dòng riêng giữ giá trị riêng; nhật ký chỉ mã nhóm và nguồn", async () => {
  const w = setup();
  dungNhom(w);
  assert.equal((await doi(w, "ZB2", "TOUR_DAO")).status, 200);
  assert.equal((await doi(w, "ZB2", "HANG_NGOAI")).status, 200);
  assert.equal(bang(w), 2, "ZB2 có dòng riêng là vé hãng ngoài");
  const r = await doiNhom(w, "NTD", "TOUR_DAO");
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json.nhom, [{ ma: "NTD", nguon: "TOUR_DAO" }]);
  assert.deepEqual(await nguonCua(w, "ZA1"), { ma: "ZA1", nguon: "TOUR_DAO", theo: "GROUP" });
  assert.deepEqual(await nguonCua(w, "ZB2"), { ma: "ZB2", nguon: "HANG_NGOAI", theo: "SERVICE" });
  assert.deepEqual([bangNhom(w), nkNhom(w)], [1, 1]);
  const dong = w.q("SELECT target_type, target_id, detail FROM audit_log WHERE action = 'ticket_source_group_changed'")[0];
  assert.equal(dong.target_id, "NTD");
  assert.match(dong.detail, /NTD/);
  assert.match(dong.detail, /Vé Tour Đảo/);
  assert.equal((await doiNhom(w, "NTD", "TOUR_DAO", SUP)).status, 200);
  assert.deepEqual([bangNhom(w), nkNhom(w)], [1, 1], "gửi đúng giá trị đang có của nhóm: không ghi");
  // dịch vụ đang theo nhóm: nhóm đổi thì dịch vụ không có dòng riêng đổi theo
  assert.equal((await doiNhom(w, "NTD", "HANG_NGOAI")).status, 200);
  assert.deepEqual(await nguonCua(w, "ZA1"), { ma: "ZA1", nguon: "HANG_NGOAI", theo: "GROUP" });
  assert.deepEqual([bangNhom(w), nkNhom(w)], [2, 2]);
});

test("nhóm: chưa đặt mà gửi HANG_NGOAI là giá trị đang có (200, không ghi); người không có ô 403; nhóm lạ, nhóm đã tắt, thân sai 400", async () => {
  const w = setup();
  dungNhom(w);
  assert.equal((await doiNhom(w, "NTD", "HANG_NGOAI")).status, 200);
  for (const as of [SALES, ACC, PARTNER]) assert.equal((await doiNhom(w, "NTD", "TOUR_DAO", as)).status, 403);
  for (const [nhom, nguon] of [["KHONGCO", "TOUR_DAO"], ["NTAT", "TOUR_DAO"], ["", "TOUR_DAO"], ["NTD", "KHAC"], ["NTD", undefined], [1, "TOUR_DAO"]]) {
    assert.equal((await doiNhom(w, nhom, nguon)).status, 400, `${String(nhom)} / ${String(nguon)}`);
  }
  assert.equal((await w.call("POST", URL_NV, { as: ADM, body: { ma: "ZA1", nhom: "NTD", nguon: "TOUR_DAO" } })).status, 400, "gửi cả mã dịch vụ lẫn mã nhóm");
  assert.deepEqual([bangNhom(w), nkNhom(w), bang(w)], [0, 0, 0]);
});

test("nhóm: hai lần đổi cùng mili-giây — đúng một lần ghi, lần kia 409 stale", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    dungNhom(w);
    let lanHai: any;
    w.chenTruocLo((stmts: { sql: string }[]) => stmts.some((x) => /ctl_group_ticket_source/.test(x.sql)), async () => { lanHai = await doiNhom(w, "NTD", "TOUR_DAO", SUP); });
    const lanDau = await doiNhom(w, "NTD", "TOUR_DAO", ADM);
    assert.equal(lanHai.status, 200, lanHai.text);
    assert.equal(lanDau.status, 409, lanDau.text);
    assert.equal(lanDau.json.error.code, "stale");
    assert.deepEqual([bangNhom(w), nkNhom(w)], [1, 1]);
  } finally { tat(); }
});

// Lượt chấm giao diện 23/11 (Việc 11): dịch vụ được đặt «Vé hãng ngoài» khi giá trị gộp đang là mặc định hãng ngoài thì PHẢI có dòng riêng — nếu không, đặt nhóm
// «Vé Tour Đảo» sau đó làm dịch vụ lặng lẽ thành vé Tour Đảo (đủ điều kiện mở vé trước tiền theo ADR-0230 Đ1). Người đã chọn cho dịch vụ thì dòng riêng thắng nhóm (Đ3).
test("đặt dịch vụ «Vé hãng ngoài» TRƯỚC khi nhóm thành «Vé Tour Đảo»: dịch vụ giữ hãng ngoài (dòng riêng), không theo nhóm", async () => {
  const w = setup();
  dungNhom(w);
  assert.equal((await doi(w, "ZB2", "HANG_NGOAI")).status, 200);
  assert.equal(w.q("SELECT count(*) AS n FROM ctl_service_ticket_source WHERE code = 'ZB2'")[0].n, 1, "chọn cho dịch vụ ⇒ có dòng riêng");
  assert.equal((await doi(w, "ZB2", "HANG_NGOAI")).status, 200);
  assert.equal(w.q("SELECT count(*) AS n FROM ctl_service_ticket_source WHERE code = 'ZB2'")[0].n, 1, "gửi lại đúng dòng riêng đang có: không ghi thêm");
  assert.equal((await doiNhom(w, "NTD", "TOUR_DAO")).status, 200);
  assert.deepEqual(await nguonCua(w, "ZB2"), { ma: "ZB2", nguon: "HANG_NGOAI", theo: "SERVICE" });
  assert.deepEqual(await nguonCua(w, "ZA1"), { ma: "ZA1", nguon: "TOUR_DAO", theo: "GROUP" });
});
