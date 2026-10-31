// LƯỚI «MỌI CỬA» của cổng luật bán (ADR-0146 Đ3; kế hoạch 2026-10-30 T8, bảng 4.3; ghi ở docs/SO-HANG-RAO.md). Lưới VĂN BẢN rẻ — hành vi thật do
// src/modules/orders/luat-ban-cong-route.test.ts canh; lưới này bắt một CỬA ghi đơn bị gỡ cổng, hoặc một cửa mới / tệp mới gọi thẳng `kiemLuatBan` bỏ qua `congLuatBan`.
// Thứ tự theo Q-1 (a) của chủ: ở `/status` và Gửi xác nhận, `congLuatBan(` đứng TRƯỚC `tinhCanXacNhan(`. R-7 (Q-8 (a)): dòng đầu `kiemCongXacNhan` (trước cổng R2 giá).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("../", import.meta.url).pathname;
const boChuThich = (s: string): string => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1");
const doc = (rel: string): string => boChuThich(readFileSync(join(ROOT, rel), "utf8"));

function cacRoute(src: string): Map<string, string> {
  const dau = [...src.matchAll(/route\("(GET|POST|PUT|PATCH|DELETE)", "([^"]+)"/g)];
  return new Map(dau.map((m, i) => [`${m[1]} ${m[2]}`, src.slice(m.index!, dau[i + 1]?.index ?? src.length)]));
}

/** Mọi cửa ghi đơn phải gọi `congLuatBan(` (trực tiếp, hoặc qua `kiemCongXacNhan(` có cổng ở dòng đầu). `truoc` = lời gọi phải đứng SAU `congLuatBan(` trong thân. */
export const CUA_LUAT_BAN: readonly { tep: string; route: string; truoc?: string }[] = [
  { tep: "src/modules/orders/index.ts", route: "POST /api/orders", truoc: "tranGiamGiaNhap(" },
  { tep: "src/modules/orders/index.ts", route: "PUT /api/orders/:id", truoc: "tranGiamGiaNhap(" },
  { tep: "src/modules/orders/index.ts", route: "PUT /api/orders/:id/booker" },
  { tep: "src/modules/orders/index.ts", route: "POST /api/orders/:id/status", truoc: "tinhCanXacNhan(" },
  { tep: "src/modules/orders/xac-nhan-route.ts", route: "POST /api/orders/:id/gui-xac-nhan", truoc: "tinhCanXacNhan(" },
  { tep: "src/modules/orders/xac-nhan-route.ts", route: "POST /api/orders/:id/gui-don" }, // qua dòng đầu kiemCongXacNhan
  { tep: "src/modules/orders/xac-nhan-route.ts", route: "POST /api/orders/:id/quyet-dinh", truoc: "congNhomTatDuaDon(" },
];

test("mọi cửa ghi đơn gọi cổng luật bán, đúng thứ tự (Q-1 (a): trước «cần xác nhận»)", () => {
  const sai: string[] = [];
  const theoTep = new Map<string, Map<string, string>>();
  for (const c of CUA_LUAT_BAN) {
    if (!theoTep.has(c.tep)) theoTep.set(c.tep, cacRoute(doc(c.tep)));
    const than = theoTep.get(c.tep)!.get(c.route);
    if (!than) { sai.push(`${c.route}: không thấy route ở ${c.tep}`); continue; }
    const i = than.indexOf("congLuatBan(");
    const iCong = than.indexOf("kiemCongXacNhan(");
    if (i < 0 && !(c.route.endsWith("/gui-don") && iCong >= 0)) { sai.push(`${c.route}: không gọi congLuatBan(`); continue; }
    if (c.truoc && i >= 0) {
      const j = than.indexOf(c.truoc);
      if (j < 0) sai.push(`${c.route}: không thấy ${c.truoc}`);
      else if (j < i) sai.push(`${c.route}: ${c.truoc} đứng TRƯỚC congLuatBan(`);
    }
  }
  assert.deepEqual(sai, [], sai.join("\n"));
});

test("R-7: kiemCongXacNhan gọi congLuatBan( TRƯỚC mọi cổng khác (R2 giá danh mục)", () => {
  const src = doc("src/modules/orders/xac-nhan-chung.ts");
  const i = src.search(/export async function kiemCongXacNhan\b/);
  assert.ok(i >= 0);
  const than = src.slice(i, src.indexOf("\nexport ", i + 10));
  const a = than.indexOf("congLuatBan(");
  const b = than.indexOf("viPhamGiaDanhMuc(");
  assert.ok(a > 0 && b > 0 && a < b, "congLuatBan( phải là cổng đầu tiên của kiemCongXacNhan");
});

test("không tệp nào của orders gọi thẳng kiemLuatBan( ngoài orders/cong-ban.ts", () => {
  const sai: string[] = [];
  const quet = (dir: string): void => {
    for (const f of readdirSync(dir)) {
      const p = join(dir, f);
      if (statSync(p).isDirectory()) quet(p);
      else if (f.endsWith(".ts") && !f.endsWith(".test.ts") && f !== "cong-ban.ts" && /\bkiemLuatBan\(/.test(boChuThich(readFileSync(p, "utf8")))) sai.push(p.slice(ROOT.length));
    }
  };
  quet(join(ROOT, "src/modules/orders"));
  assert.deepEqual(sai, []);
  assert.match(doc("src/modules/orders/cong-ban.ts"), /\bkiemLuatBan\(/, "cong-ban.ts phải là nơi gọi kiemLuatBan");
});
