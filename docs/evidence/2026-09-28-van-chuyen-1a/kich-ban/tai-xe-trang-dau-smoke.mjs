// Kịch bản Chrome — trang đầu của tài khoản CHỈ có quyền Tài xế (ADR-0040 D3; Ruling R3, R10 của điều phối 2026-09-28), Phần A Vận chuyển 1a.
// Ruling R10: chưa có màn "/tai-xe" (Phần B chờ bản vẽ) → mở "/" phải chuyển sang trang Tài khoản có sẵn (hằng TRANG_DAU_TAI_XE của
// src/shared/start-page.ts), KHÔNG 404, KHÔNG gọi GET /api/orders/dashboard (cổng orders — tài xế sẽ nhận 403), không lỗi console.
// Kiểm ở 390 và 1040. Máy Chrome mới (hồ sơ trống) nên không có "gọi sớm theo bản nhớ khung" (web/home.ts:243) — cạnh đó ghi ở kế hoạch mục 1.3.5.
// Dùng lại cơ chế CDP của A2 (startEnv()/ok từ ../../2026-09-20-a2/kich-ban/a2-cdp.mjs). Tài khoản tài xế gieo bằng scripts/staff-lib.mjs (SĐT giả).
// Chạy từ GỐC repo, sau `npm run build:web`:
//   CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=<thư mục ảnh> node docs/evidence/2026-09-28-van-chuyen-1a/kich-ban/tai-xe-trang-dau-smoke.mjs
// Phần B đổi TRANG_DAU_TAI_XE sang "/tai-xe": kịch bản tự theo hằng (không viết cứng đường dẫn).
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ok, sleep, startEnv } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

const OUT = process.env.OUT ?? "docs/evidence/2026-09-28-van-chuyen-1a";
mkdirSync(join(OUT, "anh"), { recursive: true });
const { TRANG_DAU_TAI_XE } = await import(pathToFileURL(join(process.cwd(), "src", "shared", "start-page.ts")).href);
const DRIVER = { name: "Tài Xế Thử", phone: "0900000401", pin: "246401", permissions: ["DRIVER"] };

const env = await startEnv();
try {
  const { insertStaffSql } = await import(pathToFileURL(join(process.cwd(), "scripts", "staff-lib.mjs")).href);
  env.sql(await insertStaffSql(DRIVER));
  for (const [ten, viewport] of [["390", { width: 390, height: 844, mobile: true }], ["1040", { width: 1040, height: 800, mobile: false }]]) {
    const p = await env.as(DRIVER, "/", viewport);
    await p.waitFor(`location.pathname === ${JSON.stringify(TRANG_DAU_TAI_XE)}`, `tài xế mở "/" được đưa sang ${TRANG_DAU_TAI_XE}`);
    await p.waitFor("document.readyState === 'complete'", "trang đích tải xong");
    await sleep(1500); // chờ các lời gọi của khung (me, chuông, góp ý, bảng tin) về hết
    const api = p.requests.map((r) => new URL(r.url).pathname).filter((u) => u.startsWith("/api/"));
    assert.deepEqual(api.filter((u) => u.startsWith("/api/orders")), [], `không lời gọi màn đơn nào: ${JSON.stringify(api)}`);
    assert.equal(await p.ev("document.title.includes('404') || document.body.textContent.includes('Không tìm thấy trang')"), false, "trang đích có thật (không 404)");
    assert.deepEqual(p.consoleErrors, [], `lỗi console: ${JSON.stringify(p.consoleErrors)}`);
    await p.shot(join(OUT, "anh", `tai-xe-trang-dau-${ten}.png`));
    p.close();
    ok(`${ten}: tài xế mở "/" → ${TRANG_DAU_TAI_XE}; không gọi /api/orders*; không lỗi console (API đã gọi: ${[...new Set(api)].join(", ")})`);
  }
} finally {
  await env.stop();
}
console.log("TAI XE TRANG DAU SMOKE OK");
