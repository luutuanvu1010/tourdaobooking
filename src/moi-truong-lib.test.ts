// Bài so cấu hình bản Development với bản chính thức (ADR-0162 Đ1). Đột biến làm trong bộ nhớ trên nội dung tệp thật, không ghi đè tệp nào.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

type Lib = {
  CAU_HINH_DEV: string;
  docCauHinh: (text: string) => any | null;
  kiemCauHinhDev: (prodText: string, devText: string) => string[];
  conChoTrong: (devText: string) => string[];
};
const lib = (await import(new URL("../scripts/moi-truong-lib.mjs", import.meta.url).href)) as Lib;

const prodText = readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8");
const devText = readFileSync(new URL("../wrangler.dev.jsonc", import.meta.url), "utf8");
const prod = () => lib.docCauHinh(prodText);
const dev = () => lib.docCauHinh(devText);
const chay = (p: any, d: any) => lib.kiemCauHinhDev(JSON.stringify(p), JSON.stringify(d));

test("tên tệp cấu hình Development", () => {
  assert.equal(lib.CAU_HINH_DEV, "wrangler.dev.jsonc");
});

test("hai tệp thật đạt", () => {
  assert.deepEqual(lib.kiemCauHinhDev(prodText, devText), []);
});

test("conChoTrong trên tệp thật liệt kê đúng database_id và VAPID_PUBLIC_KEY", () => {
  assert.deepEqual(lib.conChoTrong(devText), ["database_id", "VAPID_PUBLIC_KEY"]);
});

test("docCauHinh bỏ chú thích cả dòng, JSON hỏng trả null", () => {
  assert.equal(lib.docCauHinh("{ // hỏng\n}"), null);
  assert.deepEqual(lib.docCauHinh('{\n  // chú thích\n  "a": 1\n}'), { a: 1 });
});

const bang: [string, (p: any, d: any) => void][] = [
  ["database_id trùng bản chính thức", (p, d) => { d.d1_databases[0].database_id = p.d1_databases[0].database_id; }],
  ["database_name trùng", (p, d) => { d.d1_databases[0].database_name = p.d1_databases[0].database_name; }],
  ["một bucket_name trùng", (p, d) => { d.r2_buckets[1].bucket_name = p.r2_buckets[1].bucket_name; }],
  ["name Worker trùng", (p, d) => { d.name = p.name; }],
  ["routes là booking.tourdao.vn", (_p, d) => { d.routes[0].pattern = "booking.tourdao.vn"; }],
  ["VAPID_PUBLIC_KEY trùng", (p, d) => { d.vars.VAPID_PUBLIC_KEY = p.vars.VAPID_PUBLIC_KEY; }],
  ["PASSKEY_RP_ID trùng", (p, d) => { d.vars.PASSKEY_RP_ID = p.vars.PASSKEY_RP_ID; }],
  ["PASSKEY_ORIGIN trùng", (p, d) => { d.vars.PASSKEY_ORIGIN = p.vars.PASSKEY_ORIGIN; }],
  ["VAPID_SUB trỏ bản chính thức", (_p, d) => { d.vars.VAPID_SUB = "https://booking.tourdao.vn"; }],
  ["bỏ MOI_TRUONG", (_p, d) => { delete d.vars.MOI_TRUONG; }],
  ["MOI_TRUONG khác development", (_p, d) => { d.vars.MOI_TRUONG = "production"; }],
  ["bản chính thức có MOI_TRUONG", (p, _d) => { p.vars.MOI_TRUONG = "development"; }],
  ["bản Development thêm một kho", (_p, d) => { d.r2_buckets.push({ binding: "KHAC", bucket_name: "tourdao-sales-dev-khac" }); }],
  ["bản Development bớt một kho", (_p, d) => { d.r2_buckets.pop(); }],
  ["bản chính thức thêm một kho", (p, _d) => { p.r2_buckets.push({ binding: "KHAC", bucket_name: "tourdao-sales-khac" }); }],
  ["bản Development thêm một D1", (_p, d) => { d.d1_databases.push({ binding: "DB2", database_name: "tourdao-sales-dev-db2", database_id: "11111111-1111-1111-1111-111111111111" }); }],
  ["bản Development bớt D1", (_p, d) => { d.d1_databases = []; }],
  ["bản Development thêm Durable Object", (_p, d) => { d.durable_objects.bindings.push({ name: "KHAC", class_name: "Khac" }); }],
  ["bản chính thức bớt Durable Object", (p, _d) => { p.durable_objects.bindings = []; }],
  ["bản Development thêm cron", (_p, d) => { d.triggers.crons.push("0 * * * *"); }],
  ["bản chính thức bớt cron", (p, _d) => { p.triggers.crons = []; }],
  ["bản Development bớt send_email", (_p, d) => { delete d.send_email; }],
  ["bản chính thức thêm send_email", (p, _d) => { p.send_email.push({ name: "EMAIL2" }); }],
  ["đổi run_worker_first", (_p, d) => { d.assets.run_worker_first = ["/api/*"]; }],
  ["khoá lạ trong vars", (_p, d) => { d.vars.KHOA_LA = "x"; }],
  ["bản chính thức có khoá vars mà Development thiếu", (p, _d) => { p.vars.KHOA_LA = "x"; }],
  ["SERVICES_SHEET_ID lệch", (_p, d) => { d.vars.SERVICES_SHEET_ID = "khac"; }],
  ["Development có khối build", (_p, d) => { d.build = { command: "npm run build:web" }; }],
  ["assets.directory trùng", (p, d) => { d.assets.directory = p.assets.directory; }],
];
for (const [ten, sua] of bang) {
  test(`đột biến: ${ten} thì đỏ`, () => {
    const p = prod();
    const d = dev();
    sua(p, d);
    const loi = chay(p, d);
    assert.ok(loi.length > 0, `phải báo lỗi: ${ten}`);
    assert.ok(loi.every((x) => typeof x === "string" && x.length > 0));
  });
}

test("mã database_id của bản chính thức nằm trong chú thích của tệp thử vẫn bị bắt", () => {
  const ma = prod().d1_databases[0].database_id;
  const loi = lib.kiemCauHinhDev(prodText, devText.replace('"name"', `// ${ma}\n  "name"`));
  assert.ok(loi.length > 0);
});

test("JSON hỏng ở một trong hai bên thì đỏ", () => {
  assert.ok(lib.kiemCauHinhDev(prodText, "{ hỏng").length > 0);
  assert.ok(lib.kiemCauHinhDev("{ hỏng", devText).length > 0);
});

test("conChoTrong: điền đủ thì rỗng", () => {
  const d = dev();
  d.d1_databases[0].database_id = "bcd4c0ac-0000-4000-8000-000000000001";
  d.vars.VAPID_PUBLIC_KEY = "BHVkhoathat";
  assert.deepEqual(lib.conChoTrong(JSON.stringify(d)), []);
});
