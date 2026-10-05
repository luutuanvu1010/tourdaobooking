// Hàng rào dung lượng gói giao diện (nghiên cứu tốc độ 2026-10-02, đợt 1 việc 2): mỗi trang là một lần tải trọn vẹn (ứng dụng nhiều trang), nên mã thừa trong
// gói chính là thời gian chờ ở mọi lần bấm. Nhật ký thay đổi (`src/shared/changelog.ts`, ~63 KB và dày thêm sau MỖI bản phát hành) từng lọt vào gói của cả 33
// trang chỉ vì `web/help-seen.ts` cần số phiên bản. Bài này dựng LẠI gói từng trang trong bộ nhớ (cùng tuỳ chọn với `npm run build:web`) và đỏ nếu:
//   (1) gói của trang nào ngoài Trợ giúp kéo `changelog.ts` vào; (2) gói trang Đơn hàng vượt trần dung lượng.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildSync } from "esbuild";
import { APP_NAME } from "./shared/app-info.ts";
import { APP_NAME as TEN_O_WEB } from "../web/phien-ban.ts";

const goc = new URL("../", import.meta.url);
const kichBan = (JSON.parse(readFileSync(new URL("package.json", goc), "utf8")) as { scripts: Record<string, string> }).scripts["build:web"]!;
// Các trang = mọi `web/<tên>.ts` ở lệnh esbuild đầu của kịch bản `build:web` (lệnh sau là service worker).
const TRANG = [...new Set(kichBan.split("&&").find((c) => c.includes("esbuild web/login.ts"))!.match(/web\/[a-z0-9-]+\.ts/g)!)];
/** Trang được phép mang nhật ký thay đổi: chính trang đọc nhật ký. */
const CHO_PHEP_NHAT_KY = new Set(["web/help.ts"]);
/** Trần dung lượng gói Đơn hàng đã rút gọn (byte, chưa nén): hôm nay ~84 KB sau khi bỏ nhật ký; trước đó 147 KB. Đổi trần = có lý do ghi ở commit. */
const TRAN_ORDERS = 95_000;

function dung(trang: string) {
  const r = buildSync({
    entryPoints: [new URL(trang, goc).pathname],
    bundle: true, format: "esm", target: "es2022", minify: true, write: false, metafile: true, logLevel: "silent",
    define: { __BUILD_ID__: '"thu"', __APP_VERSION__: '"1.0"', __APP_RELEASE_DATE__: '"2026-01-01"' },
  });
  const [ra] = Object.values(r.metafile.outputs);
  return { dauVao: Object.keys(ra!.inputs), byte: r.outputFiles[0]!.contents.byteLength };
}

test("danh sách trang lấy được từ build:web (đủ nhiều, không rỗng)", () => {
  assert.ok(TRANG.length >= 30, `chỉ thấy ${TRANG.length} trang`);
  assert.ok(TRANG.includes("web/orders.ts") && TRANG.includes("web/help.ts"));
});

test("gói của trang nào ngoài Trợ giúp cũng KHÔNG chứa nhật ký thay đổi (src/shared/changelog.ts)", () => {
  const vao = TRANG.filter((t) => !CHO_PHEP_NHAT_KY.has(t)).filter((t) => dung(t).dauVao.some((f) => f.endsWith("src/shared/changelog.ts")));
  assert.deepEqual(vao, [], "các trang này kéo nhật ký thay đổi vào gói (nhập `app-info`/`changelog` thay vì `web/phien-ban`?)");
});

test("gói trang Đơn hàng không vượt trần dung lượng", () => {
  const { byte } = dung("web/orders.ts");
  assert.ok(byte <= TRAN_ORDERS, `web/orders.ts = ${byte} byte, trần ${TRAN_ORDERS}`);
});

test("tên ứng dụng ở web/phien-ban.ts trùng bản gốc ở src/shared/app-info.ts", () => {
  assert.equal(TEN_O_WEB, APP_NAME);
});

test("trang nào nhập thẳng app-info/changelog (ngoài Trợ giúp) đều bị bắt — giao diện chỉ nhập `web/phien-ban`", () => {
  const nhap = TRANG.filter((t) => !CHO_PHEP_NHAT_KY.has(t)).filter((t) => /from "\.\.\/src\/shared\/(app-info|changelog)"/.test(readFileSync(new URL(t, goc), "utf8")));
  assert.deepEqual(nhap, []);
});

// Người kiểm độc lập 2026-10-05 (V6): bỏ hai `--define` khỏi `build:web` không làm bài nào đỏ (bài dựng gói ở trên tự đưa `define` riêng) — trang Đăng nhập lặng lẽ hiện
// "0.0 / 1970-01-01" và chấm đỏ "Có gì mới" không bao giờ bật lại. Khoá: lệnh esbuild của trang phải chứa cả hai.
test("build:web truyền --define:__APP_VERSION__ và __APP_RELEASE_DATE__ (lấy từ scripts/in-phien-ban.mjs) cho gói các trang", () => {
  const lenhTrang = kichBan.split("&&").find((c) => c.includes("esbuild web/login.ts"))!;
  assert.match(lenhTrang, /--define:__APP_VERSION__=\\*"\$\(node scripts\/in-phien-ban\.mjs version\)\\*"/);
  assert.match(lenhTrang, /--define:__APP_RELEASE_DATE__=\\*"\$\(node scripts\/in-phien-ban\.mjs date\)\\*"/);
});
