// LƯỚI «MỌI CỬA» của cổng «cùng mùa» (ADR-0229 Đ6; ghi ở docs/SO-HANG-RAO.md). Lưới VĂN BẢN rẻ, khuôn src/ngung-ban-ngay-moi-cua.test.ts — hành vi thật do
// src/modules/orders/gia-mua-vu-don-route.test.ts canh. Bắt một cửa đổi NGÀY ĐI của đơn đã lưu bị gỡ cổng, hoặc một tệp của `orders` gọi thẳng `cungMua(` bỏ qua `congCungMua`.
// Vì sao chỉ hai cửa (trong bảy cửa của CUA_NGUNG_BAN_NGAY): chỉ hai cửa này GHI ngày đi mới cho dịch vụ đã lưu mà KHÔNG dựng lại dòng tiền — `PUT /trip` (nháp và đã xác nhận)
// và Còn vé kèm `ngayDi`. Lập đơn không có bản chụp; lưu nháp (`PUT /api/orders/:id`) đổi ngày thì `catalogService` dựng lại giá theo ngày mới (Q11 đã vá, Đ6 nháp);
// `/status`, Gửi xác nhận, Gửi đơn không đổi ngày (đổi ngày ở đó đi qua Còn vé).
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

export const CUA_DOI_NGAY_DA_CHUP: readonly { tep: string; route: string }[] = [
  { tep: "src/modules/orders/index.ts", route: "PUT /api/orders/:id/trip" },
  { tep: "src/modules/orders/xac-nhan-route.ts", route: "POST /api/orders/:id/quyet-dinh" },
];

test("mọi cửa đổi ngày đi của đơn đã chụp gọi congCungMua(", () => {
  const sai: string[] = [];
  for (const c of CUA_DOI_NGAY_DA_CHUP) {
    const than = cacRoute(doc(c.tep)).get(c.route);
    if (!than) sai.push(`${c.route}: không thấy route ở ${c.tep}`);
    else if (!than.includes("congCungMua(")) sai.push(`${c.route}: không gọi congCungMua(`);
  }
  assert.deepEqual(sai, [], sai.join("\n"));
});

test("lưu nháp dựng lại giá khi đổi ngày: điều kiện giữ bản chụp ở catalogService có so ngày đi (vá Q11)", () => {
  const src = doc("src/modules/orders/service-rules.ts");
  const than = src.slice(src.search(/function catalogService\(/), src.search(/function manualService\(/));
  assert.match(than, /const kept = [^\n]*cungNgay/, "điều kiện `kept` phải gồm `cungNgay`");
});

test("không tệp nào của orders gọi thẳng cungMua( ngoài orders/cong-ban.ts; cổng không nhận người thao tác hay bên đặt", () => {
  const sai: string[] = [];
  const quet = (dir: string): void => {
    for (const f of readdirSync(dir)) {
      const p = join(dir, f);
      if (statSync(p).isDirectory()) quet(p);
      else if (f.endsWith(".ts") && !f.endsWith(".test.ts") && f !== "cong-ban.ts" && /\bcungMua\(/.test(boChuThich(readFileSync(p, "utf8")))) sai.push(p.slice(ROOT.length));
    }
  };
  quet(join(ROOT, "src/modules/orders"));
  assert.deepEqual(sai, []);
  const khai = /export async function congCungMua\(([\s\S]*?)\): Promise/.exec(doc("src/modules/orders/cong-ban.ts"))?.[1] ?? "";
  assert.ok(khai.length > 0 && !/staff|actor|booker/i.test(khai), `cổng không được nhận người thao tác / bên đặt — đang là: ${khai}`);
});
