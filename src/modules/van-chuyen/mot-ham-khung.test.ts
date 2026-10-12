// MỘT HÀM KHUNG XEM KHÁCH (ADR-0053 D7.2 "Không nơi nào tự tính khung"; kế hoạch A4 T1, §4 hàng "Một hàm khung"). Bài QUÉT mã (đã che chú thích + chuỗi):
//   - ngoài `src/shared/` (nơi hàm thuần nằm), không tệp nào ở `src/modules/**` và `web/**` gọi `trongNgayChay(` hay tự so ngày chạy với hôm nay;
//   - `trongKhungXemKhach(` được gọi ĐÚNG MỘT chỗ trong `src/modules/**` — hàm `khungCuaNguoiGoi` của `src/modules/van-chuyen/index.ts`; mọi route tài xế lấy cờ
//     khung từ hàm đó (GET chi tiết, chín lệnh tiến độ, bổ sung tên khách).
// KHÔNG canh (dựa vào kỷ luật): tệp ngoài hai thư mục trên; so sánh viết qua biến tên khác (vd. `d === h`).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { maskSource } from "../../../scripts/source-mask-lib.mjs";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "../../..");
const tep = (thuMuc: string): string[] =>
  readdirSync(join(ROOT, thuMuc), { recursive: true, encoding: "utf8" }).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts")).map((f) => join(ROOT, thuMuc, f));
const MA = [...tep("src/modules"), ...tep("web")].map((f) => ({ rel: relative(ROOT, f), ma: maskSource(readFileSync(f, "utf8")) }));
/** Tự so ngày chạy với hôm nay (khuôn cũ trước hàm khung). */
const TU_SO_NGAY = /\b\w*(?:ngay|date)\w*\s*===?\s*homNay\b|\bhomNay\s*===?\s*[\w.]*(?:ngay|date)\w*/i;

test("không tệp nào ở src/modules/**, web/** gọi trongNgayChay( hay tự so ngày chạy với hôm nay", () => {
  const loi = MA.flatMap(({ rel, ma }) => [
    ...(/\btrongNgayChay\s*\(/.test(ma) ? [`${rel}: gọi trongNgayChay( — dùng cờ khung từ khungCuaNguoiGoi`] : []),
    ...(TU_SO_NGAY.test(ma) ? [`${rel}: tự so ngày chạy với hôm nay`] : []),
  ]);
  assert.deepEqual(loi, []);
});

test("trongKhungXemKhach( được gọi đúng một chỗ trong src/modules/** — hàm khungCuaNguoiGoi của van-chuyen/index.ts", () => {
  const cho = MA.flatMap(({ rel, ma }) => [...ma.matchAll(/\btrongKhungXemKhach\s*\(/g)].map((m) => ({ rel, i: m.index!, ma })));
  assert.equal(cho.length, 1, `trongKhungXemKhach( xuất hiện ${cho.length} lần: ${cho.map((c) => c.rel).join(", ")}`);
  const c = cho[0]!;
  assert.equal(c.rel, "src/modules/van-chuyen/index.ts");
  const truoc = c.ma.slice(0, c.i);
  const khai = [...truoc.matchAll(/^(?:export\s+)?(?:async\s+function\s+|function\s+|const\s+)(\w+)/gm)].pop()?.[1];
  assert.equal(khai, "khungCuaNguoiGoi", "lời gọi phải nằm trong hàm khungCuaNguoiGoi");
});
