// RÀO QUÉT MÃ (ADR-0142 QĐ1, QĐ2): quyền «được giao» của Bán hàng phụ trách chỉ mở NĂM ô (danh sách trắng) và không bao giờ chạm tiền.
//  (1) Hai chữ `isSalesOwner` / `laBanHangPhuTrach` không xuất hiện trong module `billing`, `receipt` (cờ này không được lan sang đường tiền).
//  (2) `duocGiaoTheoO(` chỉ được gọi với ô trong danh sách trắng; không bao giờ với `order.modify`, `order.cancel`, `order.money.edit`, `order.handover`,
//      `payment.receive`, `dispatch.refuse`.
// Quét chuỗi không phải cơ chế ranh giới đầy đủ — là lưới thêm cho đúng hai điều trên; sổ hàng rào: docs/SO-HANG-RAO.md.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { QUYEN_DUOC_GIAO_BAN_HANG } from "./shared/ban-hang-phu-trach.ts";

const SRC = new URL("./", import.meta.url).pathname;
const WEB = join(SRC, "..", "web");
const CAM = ["order.modify", "order.cancel", "order.money.edit", "order.handover", "payment.receive", "dispatch.refuse"];

function tep(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? tep(p) : p.endsWith(".ts") ? [p] : [];
  });
}

/** Lỗi của các lời gọi `duocGiaoTheoO(` trong một đoạn mã: ô cấm, hoặc đối số đầu là chuỗi nguyên văn ngoài danh sách trắng. */
export function quetDuocGiao(ma: string): string[] {
  const loi: string[] = [];
  const re = /\bduocGiaoTheoO\s*\(/g;
  for (let m = re.exec(ma); m; m = re.exec(ma)) {
    let sau = re.lastIndex;
    let sau0 = 1;
    for (; sau < ma.length && sau0 > 0; sau++) sau0 += ma[sau] === "(" ? 1 : ma[sau] === ")" ? -1 : 0;
    const loiGoi = ma.slice(m.index, sau);
    for (const op of CAM) if (loiGoi.includes(`"${op}"`) || loiGoi.includes(`'${op}'`)) loi.push(`gọi với ô cấm ${op}: ${loiGoi.slice(0, 80)}`);
    const dau = /^duocGiaoTheoO\s*\(\s*["']([^"']+)["']/.exec(loiGoi);
    if (dau && !(QUYEN_DUOC_GIAO_BAN_HANG as readonly string[]).includes(dau[1]!)) loi.push(`ô ${dau[1]} ngoài danh sách trắng`);
  }
  return loi;
}

test("rào quét: bộ bắt `duocGiaoTheoO` bắt ô cấm / ngoài danh sách trắng, cho qua ô trong danh sách", () => {
  assert.deepEqual(quetDuocGiao('duocGiaoTheoO("order.trip.edit", { a: 1, b: f(2) })'), []);
  assert.equal(quetDuocGiao('duocGiaoTheoO("order.modify", { a: 1 })').length >= 1, true);
  assert.equal(quetDuocGiao("duocGiaoTheoO('payment.receive', { a: 1 })").length >= 1, true);
  assert.equal(quetDuocGiao('duocGiaoTheoO("order.view", { a: 1 })').length, 1);
  assert.deepEqual(quetDuocGiao("duocGiaoTheoO(op, { a: 1 })"), []);
});

test("ADR-0142 QĐ1: `isSalesOwner` / `laBanHangPhuTrach` không có trong module billing, receipt", () => {
  const vao: string[] = [];
  for (const mod of ["billing", "receipt"]) {
    for (const f of tep(join(SRC, "modules", mod))) {
      if (/\b(isSalesOwner|laBanHangPhuTrach)\b/.test(readFileSync(f, "utf8"))) vao.push(f.replace(SRC, "src/"));
    }
  }
  assert.deepEqual(vao, [], "cờ Bán hàng phụ trách không được lan sang đường tiền");
});

test("ADR-0142 QĐ2: `duocGiaoTheoO` không bao giờ gọi với ô tiền / huỷ / từ chối", () => {
  const loi: string[] = [];
  for (const f of [...tep(SRC), ...tep(WEB)]) {
    if (f.endsWith(".test.ts")) continue;
    for (const l of quetDuocGiao(readFileSync(f, "utf8"))) loi.push(`${f.replace(SRC, "src/")}: ${l}`);
  }
  assert.deepEqual(loi, []);
});
