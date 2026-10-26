// ADR-0136 Đ13 (Task 3.5): Trợ giúp Đối tác nói «Gửi đơn», không còn hướng dẫn nút «Lưu, chờ xác nhận» / «Xác nhận đơn» cho người lập giữ quyền Đối tác; hai câu báo nguyên văn.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chuCuaNhom, nutCuaNhom } from "./huong-dan.ts";
import { HD_DOI_TAC } from "./huong-dan-doi-tac.ts";
import { CAU_BAO_GUI_DON } from "./gui-don-cau-bao.ts";

test("Trợ giúp Đối tác: không còn nút «Lưu, chờ xác nhận» / «Xác nhận đơn» (cả trong chữ lẫn trong tên nút [[…]]); có nút «Gửi đơn» và «Rút lại»", () => {
  const chu = chuCuaNhom(HD_DOI_TAC).join("\n");
  assert.ok(!chu.includes("Lưu, chờ xác nhận"), "còn mẫu «Lưu, chờ xác nhận»");
  assert.ok(!/\[\[Xác nhận đơn\]\]/.test(readFileSync(new URL("./huong-dan-doi-tac.ts", import.meta.url), "utf8")), "còn nút [[Xác nhận đơn]]");
  const nut = nutCuaNhom(HD_DOI_TAC);
  assert.ok(nut.includes("Gửi đơn") && nut.includes("Rút lại"), nut.join("|"));
  assert.ok(!nut.includes("Xác nhận đơn") && !nut.includes("Lưu, chờ xác nhận"), nut.join("|"));
});

test("Trợ giúp Đối tác: hai câu báo Gửi đơn có mặt nguyên văn (kể cả dấu &)", () => {
  const chu = chuCuaNhom(HD_DOI_TAC).join("\n").replace(/\*\*/g, "");
  assert.ok(chu.includes(CAU_BAO_GUI_DON.A), "thiếu câu A");
  assert.ok(chu.includes(CAU_BAO_GUI_DON.B), "thiếu câu B");
});

test("hộp ảnh «Xác nhận đơn để gửi khách» vẫn là tên hợp lệ (Đ11) — giữ", () => {
  assert.ok(chuCuaNhom(HD_DOI_TAC).join("\n").includes("Xác nhận đơn để gửi khách"));
});
