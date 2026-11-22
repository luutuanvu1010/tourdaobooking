// ADR-0223 (bản dùng thử): bài so BA cấu hình (chính thức, Development, dùng thử), bộ dựng dist-demo, lệnh `len-demo` với bộ chạy giả (không chạm Cloudflare).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { CAU_HINH_DEMO, conChoTrongDemo, dungTaiSanDemo, kiemCauHinhDemo, lenDemo } from "../scripts/demo-lib.mjs";
import { CAU_DAT_CHO_NAP, CHU_DAI } from "./shared/ban-dung-thu.ts";

const doc = (t: string) => readFileSync(new URL(`../${t}`, import.meta.url), "utf8");
const PROD = doc("wrangler.jsonc");
const DEV = doc("wrangler.dev.jsonc");
const DEMO = doc(CAU_HINH_DEMO);
const MA_D1_THAT = (i: number) => `aaaaaaaa-bbbb-4ccc-8ddd-00000000000${i}`;
const demoDaDien = () => { let i = 0; return DEMO.replaceAll("00000000-0000-0000-0000-000000000000", () => MA_D1_THAT(++i)); };

test("ba cấu hình hiện tại đạt bài so; còn đúng hai chỗ trống mã D1 cho chủ điền", () => {
  assert.deepEqual(kiemCauHinhDemo(PROD, DEV, DEMO), []);
  assert.deepEqual(conChoTrongDemo(DEMO), ["database_id của DB", "database_id của KHOA_DUNG_THU"]);
  assert.deepEqual(conChoTrongDemo(demoDaDien()), []);
});

test("bài so đỏ khi: trùng D1 chính thức, trùng kho Development, thiếu biến bật, thiếu D1 khoá, bản chính thức có biến bật, sai miền", () => {
  const prodId = /"database_id": "([0-9a-f-]{36})"/.exec(PROD)![1];
  const ca: [string, string, string, string][] = [
    ["trùng mã D1 chính thức", PROD, DEV, DEMO.replace('"database_id": "00000000-0000-0000-0000-000000000000",\n      "migrations_dir"', `"database_id": "${prodId}",\n      "migrations_dir"`)],
    ["trùng kho Development", PROD, DEV, DEMO.replace("tourdao-sales-demo-ho-so", "tourdao-sales-dev-ho-so")],
    ["thiếu biến bật", PROD, DEV, DEMO.replace('"BAN_DUNG_THU": "bat"', '"BAN_DUNG_THU": "tat"')],
    ["thiếu D1 khoá", PROD, DEV, DEMO.replace('"binding": "KHOA_DUNG_THU"', '"binding": "KHOA_KHAC"')],
    ["bản chính thức có biến bật", PROD.replace('"SERVICES_SHEET_ID"', '"BAN_DUNG_THU": "bat",\n    "SERVICES_SHEET_ID"'), DEV, DEMO],
    ["sai miền", PROD, DEV, DEMO.replace('"pattern": "demo.tourdao.vn"', '"pattern": "thu.tourdao.vn"')],
    ["tên D1 không đuôi -demo-db", PROD, DEV, DEMO.replace("tourdao-sales-demo-db", "tourdao-sales-demo-du-lieu")],
  ];
  for (const [ten, p, d, m] of ca) assert.ok(kiemCauHinhDemo(p, d, m).length > 0, ten);
});

test("dựng dist-demo: dải «BẢN DÙNG THỬ», tên cài, robots chặn, mã commit, bản mẫu; không còn miền chính thức", () => {
  const goc = mkdtempSync(join(tmpdir(), "demo-goc-"));
  writeFileSync(join(goc, "app.css"), "body{}\n");
  writeFileSync(join(goc, "login.html"), '<meta name="apple-mobile-web-app-title" content="Island Booking">');
  writeFileSync(join(goc, "manifest.webmanifest"), JSON.stringify({ name: "Island Booking", short_name: "Island Booking" }));
  writeFileSync(join(goc, "_headers"), "/*\n  Content-Security-Policy: connect-src https://booking.tourdao.vn\n");
  const cha = mkdtempSync(join(tmpdir(), "demo-dich-"));
  const dich = join(cha, "dist-demo");
  const commit = "b".repeat(40);
  dungTaiSanDemo({ goc, dich, commit, banMau: { phienBan: 1, commit, soMigration: 1, cau: ["x"] } });
  assert.ok(readFileSync(join(dich, "app.css"), "utf8").includes(CHU_DAI));
  assert.match(readFileSync(join(dich, "login.html"), "utf8"), /Tour Đảo Demo/);
  assert.match(readFileSync(join(dich, "robots.txt"), "utf8"), /Disallow: \//);
  assert.match(readFileSync(join(dich, "_headers"), "utf8"), /demo\.tourdao\.vn/);
  assert.equal(JSON.parse(readFileSync(join(dich, "ban-thu.json"), "utf8")).commit, commit);
  assert.ok(existsSync(join(dich, "__ban-mau.json")));
  assert.throws(() => dungTaiSanDemo({ goc, dich, commit, banMau: { phienBan: 1, commit: "c".repeat(40), soMigration: 1, cau: ["x"] } }), /cùng commit/);
  mkdirSync(join(cha, "khac"));
  assert.throws(() => dungTaiSanDemo({ goc, dich: join(cha, "khac"), commit }), /dist-demo/);
});

type Goi = { cmd: string; args: string[] };
function boChayGia(o: { secrets?: string[] } = {}) {
  const goi: Goi[] = [];
  const run = async (cmd: string, args: string[]) => {
    goi.push({ cmd, args });
    const s = args.join(" ");
    if (cmd === "git" && args[0] === "status") return { code: 0, stdout: "" };
    if (cmd === "git" && args[0] === "rev-parse") return { code: 0, stdout: "d".repeat(40) + "\n" };
    if (s.includes("whoami")) return { code: 0, stdout: "You are logged in" };
    if (s.includes("secret list")) return { code: 0, stdout: JSON.stringify((o.secrets ?? ["SESSION_SECRET", "LAN_GUI_SECRET", "MFA_ENCRYPTION_KEY", "DUNG_THU_PIN", "DUNG_THU_PIN_TOAN_QUYEN"]).map((name) => ({ name, type: "secret_text" }))) };
    if (s.includes("r2 bucket list")) return { code: 0, stdout: ["ho-so", "ho-tro", "ve-dien-tu", "bien-lai", "anh-dich-vu"].map((k) => `name:           tourdao-sales-demo-${k}\ncreation_date:  x`).join("\n\n") };
    return { code: 0, stdout: "" };
  };
  return { goi, run };
}
const docTepGia = (demo: string) => (t: string) => (t === CAU_HINH_DEMO ? demo : doc(t));

test("len-demo: từ chối khi không có terminal thật, khi còn chỗ trống, khi thiếu bí mật PIN — không gọi wrangler ghi", async () => {
  const log = () => {};
  const a = boChayGia();
  assert.notEqual(await lenDemo({ run: a.run, log, isTTY: false, docTep: docTepGia(demoDaDien()) }), 0);
  assert.equal(a.goi.length, 0);
  const b = boChayGia();
  assert.notEqual(await lenDemo({ run: b.run, log, isTTY: true, docTep: docTepGia(DEMO) }), 0);
  assert.ok(!b.goi.some((g) => g.args.includes("wrangler")));
  const c = boChayGia({ secrets: ["SESSION_SECRET", "LAN_GUI_SECRET", "MFA_ENCRYPTION_KEY"] });
  assert.notEqual(await lenDemo({ run: c.run, log, isTTY: true, docTep: docTepGia(demoDaDien()) }), 0);
  assert.ok(!c.goi.some((g) => g.args.includes("deploy")));
});

test("len-demo đường đúng: mọi wrangler mang --config wrangler.demo.jsonc; ghi DUY NHẤT dấu chờ nạp lên D1 dùng thử; không áp migration remote", async () => {
  const { goi, run } = boChayGia();
  const kq = await lenDemo({ run, log: () => {}, isTTY: true, docTep: docTepGia(demoDaDien()), docCommit: async () => "d".repeat(40), sleep: async () => {} });
  assert.equal(kq, 0);
  const wr = goi.filter((g) => g.args[0] === "wrangler");
  assert.ok(wr.length >= 4);
  for (const g of wr) assert.deepEqual(g.args.slice(-2), ["--config", CAU_HINH_DEMO], g.args.join(" "));
  assert.ok(!wr.some((g) => g.args.includes("migrations")));
  const ghi = wr.filter((g) => g.args.includes("execute"));
  assert.equal(ghi.length, 1);
  assert.equal(ghi[0].args[ghi[0].args.indexOf("execute") + 1], "tourdao-sales-demo-db");
  assert.equal(ghi[0].args[ghi[0].args.indexOf("--command") + 1], CAU_DAT_CHO_NAP);
});
