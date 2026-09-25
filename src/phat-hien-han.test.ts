// Hàng rào "dừng dây chuyền" cho PHÁT HIỆN kiểm toán/red team mức HIGH trở lên (CLAUDE.md §3, chủ duyệt 2026-09-24): mỗi phát hiện còn mở phải có
// mục trong `docs/quyen-hoan.json` → `phat_hien` với mã, mức, lý do, kế hoạch, hạn, người chịu trách nhiệm và nguồn. Quá hạn (han < hôm nay giờ VN)
// → `npm test` ĐỎ cho tới khi vá (xoá mục trong cùng commit vá) hoặc chủ dự án gia hạn bằng diff có lý do. Chỉ nhận mức CRITICAL/HIGH — mức thấp hơn
// không thuộc luật này, để sổ không phình. Mã trùng → đỏ (một phát hiện, một hạn).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { isISODate, vnToday } from "./shared/vn-date.ts";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const FILE = "docs/quyen-hoan.json";
const REQUIRED = ["ma", "muc_do", "ly_do", "ke_hoach", "han", "nguoi_chiu_trach_nhiem", "nguon"] as const;
const LEVELS = new Set(["CRITICAL", "HIGH"]);

type Entry = Record<(typeof REQUIRED)[number], unknown>;

function loadEntries(): Entry[] {
  const raw = JSON.parse(readFileSync(join(ROOT, FILE), "utf8")) as { phat_hien?: unknown };
  assert.ok(Array.isArray(raw.phat_hien), `${FILE} phải có mảng "phat_hien" (có thể rỗng khi mọi phát hiện đã vá).`);
  return raw.phat_hien as Entry[];
}

test("dừng dây chuyền: mỗi mục phat_hien đủ trường, mức CRITICAL/HIGH, hạn là ngày hợp lệ, mã không trùng", () => {
  const seen = new Set<string>();
  for (const [i, e] of loadEntries().entries()) {
    for (const k of REQUIRED) assert.ok(typeof e[k] === "string" && (e[k] as string).trim() !== "", `phat_hien[${i}] thiếu trường "${k}"`);
    assert.ok(LEVELS.has(e.muc_do as string), `phat_hien[${i}] (${String(e.ma)}): muc_do phải là CRITICAL hoặc HIGH, đang là "${String(e.muc_do)}"`);
    assert.ok(isISODate(e.han as string), `phat_hien[${i}] (${String(e.ma)}): han "${String(e.han)}" không phải ngày YYYY-MM-DD hợp lệ`);
    assert.ok(!seen.has(e.ma as string), `mã phát hiện bị trùng: ${String(e.ma)}`);
    seen.add(e.ma as string);
  }
});

test("dừng dây chuyền: không phát hiện nào quá hạn (han ≥ hôm nay giờ Việt Nam)", () => {
  const today = vnToday(new Date());
  const overdue = loadEntries().filter((e) => (e.han as string) < today).map((e) => `${String(e.ma)} (${String(e.muc_do)}, hạn ${String(e.han)} < ${today})`);
  assert.deepEqual(overdue, [], `PHÁT HIỆN QUÁ HẠN — dừng dây chuyền: vá rồi xoá mục, hoặc chủ dự án gia hạn trong ${FILE}: ${overdue.join("; ")}`);
});
