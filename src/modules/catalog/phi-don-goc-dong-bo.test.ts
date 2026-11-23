// ADR-0218 Đ1.3 (kế hoạch 2026-11-18 Task 2): đồng bộ hai cột «Phí đưa đón» / «Phí đưa đón xe riêng» vào bảng riêng, trên SQLite thật.
// Khuôn giu-lai-dong-hong.test.ts. Google Sheet là bản giả trong bộ nhớ; không mạng.
import { test } from "node:test";
import assert from "node:assert/strict";
import { tacNhan } from "../../shared/permissions.ts";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { app, world } from "../../../tests/audit/harness.mjs";

const SHEET = "1XPx1g0JVTdevdX35MeCpt6Cc6Dgxdmfer6okEWleD3s";
const HEADER = "Mã tour,Tên tour,Khoá giá,Đường dẫn,Đơn vị,Giá người lớn,Giá trẻ em,Ghi chú trẻ em,Giá người cao tuổi,Ghi chú người cao tuổi,Giá em bé,Ghi chú em bé,Ghi chú nội bộ";
const BEN = tacNhan("DONG_BO_DANH_MUC");
const MA = ["T1", "T2", "T3", "T4", "T5"];
const dong = (ma: string, gia = "100000", phi: string[] = []) => [`${ma},Tour ${ma},k,d,perPax,${gia},,,,,,,`, ...phi].join(",");
const khongCot = (gia = "100000") => [HEADER, ...MA.map((m) => dong(m, gia))].join("\n");
const coCot = (phi: Record<string, [string, string]>, gia = "100000", tenCot = "Phí đưa đón,Phí đưa đón xe riêng") =>
  [`${HEADER},${tenCot}`, ...MA.map((m) => dong(m, m === "T3" ? gia : "100000", phi[m] ?? ["", ""]))].join("\n");

async function dongBo(w: any, noiDung: string) {
  w.env.SERVICES_SHEET_ID = SHEET;
  const goc = globalThis.fetch;
  globalThis.fetch = (async () => new Response(noiDung, { status: 200, headers: { "content-type": "text/csv; charset=utf-8" } })) as typeof fetch;
  try {
    return await app.syncCatalog(w.env, BEN, { baoTin: async () => {} });
  } finally {
    globalThis.fetch = goc;
  }
}
const giaGoc = (w: any, ma: string) => ({ ...w.q("SELECT per_pax_price AS moi, private_price AS xe FROM v_ctl_service_transfer_price WHERE catalog_code = ?", ma)[0] });
const soDong = (w: any) => w.q("SELECT count(*) AS n FROM ctl_service_transfer_price")[0].n;
const sync = (w: any) => w.q("SELECT last_error, last_error_code, problems_json FROM catalog_sync WHERE id = 'default'")[0];

test("(a) Sheet chưa có cột: đồng bộ thành công, không lỗi, không vấn đề «Phí đưa đón», bảng giá gốc rỗng", async () => {
  const w = world();
  const kq = await dongBo(w, khongCot());
  assert.equal(kq.ok, true);
  const s = sync(w);
  assert.equal(s.last_error, null);
  assert.equal(s.last_error_code, null);
  assert.doesNotMatch(s.problems_json ?? "", /Phí đưa đón/);
  assert.equal(soDong(w), 0);
});

test("(b) thêm cột → có giá; ô trống là NULL chứ không phải 0; ô 0 là 0", async () => {
  const w = world();
  await dongBo(w, khongCot());
  const kq = await dongBo(w, coCot({ T1: ["50000", "900000"], T2: ["0", "0"] }));
  assert.equal(kq.ok, true);
  assert.deepEqual(giaGoc(w, "T1"), { moi: 50000, xe: 900000 });
  assert.deepEqual(giaGoc(w, "T2"), { moi: 0, xe: 0 });
  assert.equal(w.q("SELECT count(*) AS n FROM ctl_service_transfer_price WHERE catalog_code = 'T4'")[0].n, 0, "ô trống cả hai, chưa từng có giá: không ghi dòng nào");
});

test("(c) đổi tên cột → giá cũ còn, báo «không còn trên Sheet», giá vé vẫn cập nhật, không đặt lỗi đồng bộ", async () => {
  const w = world();
  await dongBo(w, coCot({ T1: ["50000", "900000"] }));
  const kq = await dongBo(w, coCot({ T1: ["70000", "1"] }, "120000", "Phí đón khách,Phí xe"));
  assert.equal(kq.ok, true);
  assert.deepEqual(giaGoc(w, "T1"), { moi: 50000, xe: 900000 });
  const s = sync(w);
  assert.equal(s.last_error, null);
  assert.match(s.problems_json, /không còn trên Sheet/);
  assert.equal(w.q("SELECT price_adult FROM catalog_item WHERE code = 'T3'")[0].price_adult, 120000);
});

test("(d) ô 600.000 → giữ giá cũ của dịch vụ đó, giá vé dịch vụ đó vẫn cập nhật", async () => {
  const w = world();
  await dongBo(w, coCot({ T3: ["50000", ""] }));
  const kq = await dongBo(w, coCot({ T3: ["600000", ""] }, "130000"));
  assert.equal(kq.ok, true);
  assert.deepEqual(giaGoc(w, "T3"), { moi: 50000, xe: null });
  assert.equal(w.q("SELECT price_adult FROM catalog_item WHERE code = 'T3'")[0].price_adult, 130000);
  assert.match(sync(w).problems_json, /không hợp lệ, giữ giá cũ/);
});

test("(e) đồng bộ hai lần không đổi → không thêm dòng", async () => {
  const w = world();
  await dongBo(w, coCot({ T1: ["50000", "900000"] }));
  const n = soDong(w);
  assert.equal(n, 1);
  await dongBo(w, coCot({ T1: ["50000", "900000"] }));
  assert.equal(soDong(w), n);
});

test("không gửi tin «dòng hỏng» chỉ vì ô phí hỏng", async () => {
  const w = world();
  const tin: unknown[] = [];
  w.env.SERVICES_SHEET_ID = SHEET;
  const goc = globalThis.fetch;
  globalThis.fetch = (async () => new Response(coCot({ T1: ["600000", ""] }), { status: 200, headers: { "content-type": "text/csv; charset=utf-8" } })) as typeof fetch;
  try {
    await dongBo(w, coCot({ T1: ["50000", ""] }));
    globalThis.fetch = (async () => new Response(coCot({ T1: ["600000", ""] }), { status: 200, headers: { "content-type": "text/csv; charset=utf-8" } })) as typeof fetch;
    await app.syncCatalog(w.env, BEN, { baoTin: async (t: unknown) => void tin.push(t) });
  } finally {
    globalThis.fetch = goc;
  }
  assert.equal(tin.length, 0);
});
