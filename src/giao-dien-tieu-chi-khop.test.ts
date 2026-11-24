// Mã tiêu chí máy đo trong scripts/giao-dien/cham-may.mjs phải KHỚP đúng với bảng «## 1. Phần máy đo» của docs/TIEU-CHI-GIAO-DIEN.md (một nơi cho tiêu chí, máy kiểm hai bên).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
// @ts-expect-error tệp .mjs không có kiểu
import { TIEU_CHI_MAY } from "../scripts/giao-dien/cham-may.mjs";

test("tập mã TIEU_CHI_MAY bằng tập mã ở bảng phần máy đo của tài liệu tiêu chí", () => {
  const md = readFileSync(new URL("../docs/TIEU-CHI-GIAO-DIEN.md", import.meta.url), "utf8");
  const dong = md.split("\n");
  const bat = dong.findIndex((d) => /^## 1\. Phần máy đo/.test(d));
  assert.ok(bat >= 0, "thiếu tiêu đề «## 1. Phần máy đo»");
  const ket = dong.findIndex((d, i) => i > bat && /^## /.test(d));
  const khuc = dong.slice(bat + 1, ket === -1 ? undefined : ket);
  const maTrongTaiLieu = khuc.map((d) => d.match(/^\|\s*`([A-Z]+\d+)`\s*\|/)?.[1]).filter((m): m is string => !!m);
  const maTrongMay: string[] = TIEU_CHI_MAY.map((t: { ma: string }) => t.ma);
  assert.deepEqual([...maTrongTaiLieu].sort(), [...maTrongMay].sort());
  assert.equal(new Set(maTrongTaiLieu).size, maTrongTaiLieu.length, "mã bị lặp trong bảng");
});
