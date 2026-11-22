// LƯỚI «MỌI CỬA» của cổng «Ngừng bán theo ngày» (ADR-0220 Đ3; ghi ở docs/SO-HANG-RAO.md). Lưới VĂN BẢN rẻ, khuôn src/luat-ban-moi-cua.test.ts — hành vi thật do
// src/modules/orders/ngung-ban-ngay-cong-route.test.ts canh; lưới này bắt một CỬA ghi đơn bị gỡ cổng, hoặc một tệp của `orders` gọi thẳng `kiemNgungBanTheoNgay` bỏ qua `congNgungBanNgay`.
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

/** Mọi cửa ghi dịch vụ + ngày khởi hành phải gọi `congNgungBanNgay(` (trực tiếp, hoặc qua `kiemCongXacNhan(` có cổng ngay sau luật bán). Đổi bên đặt không thuộc lưới (ADR-0220 Đ3). */
export const CUA_NGUNG_BAN_NGAY: readonly { tep: string; route: string; quaCongChung?: true }[] = [
  { tep: "src/modules/orders/index.ts", route: "POST /api/orders" },
  { tep: "src/modules/orders/index.ts", route: "PUT /api/orders/:id" },
  { tep: "src/modules/orders/index.ts", route: "PUT /api/orders/:id/trip" },
  { tep: "src/modules/orders/index.ts", route: "POST /api/orders/:id/status" },
  { tep: "src/modules/orders/xac-nhan-route.ts", route: "POST /api/orders/:id/gui-xac-nhan" },
  { tep: "src/modules/orders/xac-nhan-route.ts", route: "POST /api/orders/:id/gui-don", quaCongChung: true },
  { tep: "src/modules/orders/xac-nhan-route.ts", route: "POST /api/orders/:id/quyet-dinh" }, // gọi TRỰC TIẾP: Còn vé kèm `ngayDi` ghi ngày mới mà `kiemCongXacNhan` chỉ xét ngày cũ
];

test("mọi cửa ghi đơn gọi cổng ngừng bán theo ngày", () => {
  const sai: string[] = [];
  const theoTep = new Map<string, Map<string, string>>();
  for (const c of CUA_NGUNG_BAN_NGAY) {
    if (!theoTep.has(c.tep)) theoTep.set(c.tep, cacRoute(doc(c.tep)));
    const than = theoTep.get(c.tep)!.get(c.route);
    if (!than) { sai.push(`${c.route}: không thấy route ở ${c.tep}`); continue; }
    if (!than.includes(c.quaCongChung ? "kiemCongXacNhan(" : "congNgungBanNgay(")) sai.push(`${c.route}: không gọi ${c.quaCongChung ? "kiemCongXacNhan(" : "congNgungBanNgay("}`);
  }
  assert.deepEqual(sai, [], sai.join("\n"));
});

test("kiemCongXacNhan gọi congNgungBanNgay( ngay sau luật bán, trước cổng giá danh mục", () => {
  const src = doc("src/modules/orders/xac-nhan-chung.ts");
  const i = src.search(/export async function kiemCongXacNhan\b/);
  assert.ok(i >= 0);
  const than = src.slice(i, src.indexOf("\nexport ", i + 10));
  const a = than.indexOf("congLuatBan(");
  const b = than.indexOf("congNgungBanNgay(");
  const c = than.indexOf("viPhamGiaDanhMuc(");
  assert.ok(a > 0 && b > a && c > b, "thứ tự phải là congLuatBan( → congNgungBanNgay( → viPhamGiaDanhMuc(");
});

test("không tệp nào của orders gọi thẳng kiemNgungBanTheoNgay( ngoài orders/cong-ban.ts; cổng không nhận tham số người thao tác hay bên đặt", () => {
  const sai: string[] = [];
  const quet = (dir: string): void => {
    for (const f of readdirSync(dir)) {
      const p = join(dir, f);
      if (statSync(p).isDirectory()) quet(p);
      else if (f.endsWith(".ts") && !f.endsWith(".test.ts") && f !== "cong-ban.ts" && /\bkiemNgungBanTheoNgay\(/.test(boChuThich(readFileSync(p, "utf8")))) sai.push(p.slice(ROOT.length));
    }
  };
  quet(join(ROOT, "src/modules/orders"));
  assert.deepEqual(sai, []);
  const cong = doc("src/modules/orders/cong-ban.ts");
  assert.match(cong, /\bkiemNgungBanTheoNgay\(/, "cong-ban.ts phải là nơi gọi kiemNgungBanTheoNgay");
  const khai = /export async function congNgungBanNgay\(([^)]*)\)/.exec(cong)?.[1] ?? "";
  assert.ok(khai.length > 0 && !/staff|actor|booker/i.test(khai), `ADR-0220 Đ2 «không ai bán vượt»: cổng không được nhận người thao tác / bên đặt — đang là: ${khai}`);
});
