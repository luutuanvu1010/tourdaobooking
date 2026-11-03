// ADR-0159 Đ1 mục 3: «Phải qua cả ba nơi gọi `soanXacNhan`, có bài kiểm quét nơi gọi». Bài quét mã nguồn: MỌI lời gọi `soanXacNhan(` / `confirmOrder(` ngoài định nghĩa phải nằm trong danh sách dưới,
// và mỗi nơi phải truyền câu lấy từ `cocChoXacNhan` — bỏ một đường hoặc thêm đường mới chưa khai thì đỏ. Kiểu ở `repository.ts` đã buộc tham số `coc`; bài này chặn việc truyền `KHONG_COC` cho qua.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { TRAN_DAT_COC, conPhaiTra, docLoiKhai, vuotTong } from "./shared/dat-coc-truoc.ts";

const GOC = new URL(".", import.meta.url).pathname;
/** Che chú thích và chuỗi chữ để không khớp nhầm câu trong lời bình. */
const che = (s: string): string => s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1 ");

function tepNguon(): string[] {
  const out: string[] = [];
  const di = (d: string): void => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) di(p);
      else if (e.name.endsWith(".ts") && !e.name.endsWith(".test.ts")) out.push(p);
    }
  };
  di(GOC);
  return out;
}
/** Tệp → số lời gọi đã khai. `repository.ts`: `confirmOrder` gọi `soanXacNhan` (một) — phần định nghĩa `function` không tính. */
const DA_KHAI: Record<string, number> = {
  "modules/orders/repository.ts": 1,
  "modules/orders/xac-nhan-route.ts": 2, // Gửi đơn nhánh B, Còn vé
  "modules/orders/index.ts": 1, // POST /status
};

function loiGoi(): Map<string, number[]> {
  const m = new Map<string, number[]>();
  for (const f of tepNguon()) {
    const nguon = che(readFileSync(f, "utf8"));
    for (const k of nguon.matchAll(/(?<!function )\b(soanXacNhan|confirmOrder)\(/g)) {
      const r = relative(GOC, f);
      m.set(r, [...(m.get(r) ?? []), k.index!]);
    }
  }
  return m;
}

test("nơi gọi `soanXacNhan` / `confirmOrder`: đúng danh sách đã khai — nơi mới chưa khai thì đỏ", () => {
  const thuc = Object.fromEntries([...loiGoi()].map(([f, a]) => [f, a.length]));
  assert.deepEqual(thuc, DA_KHAI, "Thêm đường xác nhận mới: phải truyền câu từ cocChoXacNhan rồi khai ở đây");
});

test("mỗi đường truyền đúng `cocXn.coc` lấy từ `cocChoXacNhan` của CHÍNH route; không ai đổi tên hàm để né bài này", () => {
  for (const [f, ds] of loiGoi()) {
    if (f === "modules/orders/repository.ts") continue;
    const nguon = che(readFileSync(join(GOC, f), "utf8"));
    for (const i of ds) {
      const loi = nguon.slice(i, nguon.indexOf(";", i));
      assert.match(loi, /\bcocXn\.coc\b/, `${f}: lời gọi không truyền cocXn.coc: ${loi.slice(0, 120)}`);
      const dauRoute = nguon.lastIndexOf('route("', i);
      const truoc = nguon.slice(dauRoute, i);
      assert.match(truoc, /const cocXn = await cocChoXacNhan\(/, `${f}: route không dựng cocXn bằng cocChoXacNhan`);
      assert.match(truoc, /if \("loi" in cocXn\) return cocXn\.loi;/, `${f}: route phải trả lỗi của cocChoXacNhan trước khi ghi`);
    }
  }
  for (const f of tepNguon()) {
    const r = relative(GOC, f);
    const nguon = che(readFileSync(f, "utf8"));
    assert.doesNotMatch(nguon, /\b(soanXacNhan|confirmOrder)\s+as\b/, `${r}: đổi tên hàm xác nhận khi import làm bài quét mù`);
    if (r !== "modules/orders/repository.ts" && r !== "modules/orders/xac-nhan-chung.ts") assert.doesNotMatch(nguon, /\bKHONG_COC\b/, `${r}: chỉ cocChoXacNhan được dùng KHONG_COC`);
  }
});

test("`orders` không nhắc bảng `bil_`, không import billing cho đường đặt cọc", () => {
  for (const f of tepNguon()) {
    const r = relative(GOC, f);
    if (!r.startsWith("modules/orders/")) continue;
    const nguon = che(readFileSync(f, "utf8"));
    assert.doesNotMatch(nguon, /from "\.\.\/billing/, r);
    if (/cocChoXacNhan|loiKhaiDangLuu|declared_deposit/.test(nguon)) assert.doesNotMatch(nguon, /\bbil_[a-z]/, r);
  }
});

test("luật thuần: đọc số khai; trần bằng trần của billing và CHECK của cột", () => {
  assert.deepEqual(docLoiKhai(undefined), { ok: true, value: null });
  assert.deepEqual(docLoiKhai(null), { ok: true, value: null });
  assert.deepEqual(docLoiKhai(0), { ok: true, value: 0 });
  assert.deepEqual(docLoiKhai(TRAN_DAT_COC), { ok: true, value: TRAN_DAT_COC });
  for (const sai of [-1, 1.5, "1", true, {}, [], TRAN_DAT_COC + 1]) assert.equal(docLoiKhai(sai).ok, false, String(sai));
  assert.equal(vuotTong(101, 100), true);
  assert.equal(vuotTong(100, 100), false);
  assert.equal(conPhaiTra(100, 30), 70);
  assert.equal(conPhaiTra(100, 130), 0, "xem trước không hiện số âm");
  const billing = readFileSync(join(GOC, "modules/billing/service.ts"), "utf8").match(/MAX_SO_TIEN = ([\d_]+)/)![1]!.replaceAll("_", "");
  assert.equal(Number(billing), TRAN_DAT_COC);
  const mig = readFileSync(join(GOC, "../migrations/0136_loi_khai_dat_coc_truoc.sql"), "utf8");
  assert.ok(mig.includes(`declared_deposit <= ${TRAN_DAT_COC}`));
});
