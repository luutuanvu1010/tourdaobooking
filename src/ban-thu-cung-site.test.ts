// Ghim ranh giới "cùng site" (ADR-0162 Đ2): bản thử (dev.tourdao.vn) và bản chính (booking.tourdao.vn) cùng site, nên mọi cổng chỉ so ĐÚNG origin,
// cookie không đặt Domain=, và không mở CORS. Bài xanh ngay vì mã đang đúng; đã sửa cố ý để thấy đỏ (P16).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { checkWriteRequest } from "./shared/router.ts";
import { kiemOrigin } from "./modules/bangtin/rules.ts";
import { sessionCookie } from "./modules/auth/session.ts";
import { challengeCookie } from "./modules/auth/challenge.ts";
import { pendingCookie } from "./modules/auth/mfa-rules.ts";

const URL_CHINH = new URL("https://booking.tourdao.vn/api/x");
const reqTuDev = (extra: Record<string, string> = {}) =>
  new Request(URL_CHINH, { method: "POST", headers: { origin: "https://dev.tourdao.vn", "content-type": "application/json", ...extra }, body: "{}" });

test("checkWriteRequest: POST từ origin dev.tourdao.vn tới booking.tourdao.vn bị 403", () => {
  assert.equal(checkWriteRequest(reqTuDev(), URL_CHINH)?.status, 403);
  assert.equal(checkWriteRequest(reqTuDev({ "sec-fetch-site": "same-site" }), URL_CHINH)?.status, 403);
});

test("checkWriteRequest: đúng origin thì qua", () => {
  const r = new Request(URL_CHINH, { method: "POST", headers: { origin: "https://booking.tourdao.vn", "content-type": "application/json" }, body: "{}" });
  assert.equal(checkWriteRequest(r, URL_CHINH), null);
});

test("kiemOrigin: origin dev.tourdao.vn tới booking.tourdao.vn là false", () => {
  assert.equal(kiemOrigin(new Request(URL_CHINH, { headers: { origin: "https://dev.tourdao.vn" } }), URL_CHINH), false);
  assert.equal(kiemOrigin(new Request(URL_CHINH, { headers: { origin: "https://booking.tourdao.vn" } }), URL_CHINH), true);
});

test("bốn cookie xác thực không đặt Domain=", () => {
  for (const secure of [true, false]) {
    for (const c of [sessionCookie("t", secure), challengeCookie("t", secure), pendingCookie("t", secure)]) {
      assert.ok(!/domain\s*=/i.test(c), c);
    }
  }
  // trustedCookie ở mfa-dang-nhap.ts import không đuôi `.ts` nên Node không nạp được để gọi; đọc nguyên văn hàm dựng cookie thay vào đó.
  const nguon = readFileSync("src/modules/auth/mfa-dang-nhap.ts", "utf8");
  const ham = /export function trustedCookie[\s\S]*?\n}/.exec(nguon)?.[0] ?? "";
  assert.ok(ham.includes("TRUSTED_COOKIE") && ham.includes("Path=/api/auth"), "không tìm thấy hàm dựng cookie máy tin");
  assert.ok(!/domain\s*=/i.test(ham), ham);
});

test("src/ (trừ test) không có Access-Control-Allow", () => {
  const khop: string[] = [];
  const duyet = (dir: string): void => {
    for (const ten of readdirSync(dir)) {
      const p = join(dir, ten);
      if (statSync(p).isDirectory()) duyet(p);
      else if (p.endsWith(".ts") && !p.endsWith(".test.ts") && /Access-Control-Allow/i.test(readFileSync(p, "utf8"))) khop.push(p);
    }
  };
  duyet("src");
  assert.deepEqual(khop, []);
});
