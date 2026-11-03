// Máy canh của Hướng dẫn (đặc tả docs/superpowers/specs/2026-11-03-huong-dan-muc-rieng/DAC-TA.md; dòng ở docs/SO-HANG-RAO.md). Canh việc QUÊN: mã đổi mà chưa xem
// lại bài, màn mới không có bài. Không canh được người chạy lệnh xem lại mà không đọc.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dauVanChu, dauVanNeo } from "../scripts/huong-dan-dau-van-lib.mjs";
import { chuCuaNhom, HUONG_DAN } from "./shared/huong-dan.ts";
import { BAI_VIEC } from "./shared/huong-dan-bai-noi-dung.ts";
import { DAU_VAN } from "./shared/huong-dan-dau-van.ts";
import { THANH_BEN } from "./shared/muc-giao-dien.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const LENH = (id: string): string => `đọc lại bài rồi chạy: npm run huong-dan:xem-lai -- ${id}`;

test("mỗi bài theo việc có neo, tệp neo còn tồn tại", () => {
  for (const b of BAI_VIEC) {
    assert.ok(b.neo.length > 0, `${b.id}: chưa khai tệp neo`);
    for (const t of b.neo) assert.ok(existsSync(`${ROOT}${t}`), `${b.id}: tệp neo ${t} không còn, sửa neo của bài`);
  }
});

test("tệp mã bài dựa vào đổi mà chưa xem lại bài ⇒ đỏ", () => {
  for (const b of BAI_VIEC) {
    const dv = DAU_VAN[b.id];
    assert.ok(dv, `${b.id}: chưa có dấu vân; ${LENH(b.id)}`);
    assert.equal(dauVanNeo(ROOT, b.neo), dv.neo, `Bài «${b.tieuDe}»: một trong các tệp ${b.neo.join(", ")} đã đổi; ${LENH(b.id)}`);
  }
});

test("sửa chữ bài mà chưa ghi lại dòng cập nhật ⇒ đỏ", () => {
  for (const b of BAI_VIEC) {
    assert.equal(dauVanChu(b), DAU_VAN[b.id]?.chu, `Bài «${b.tieuDe}»: chữ bài đã đổi; ${LENH(b.id)}`);
  }
});

test("không có dấu vân mồ côi", () => {
  for (const id of Object.keys(DAU_VAN)) assert.ok(BAI_VIEC.some((b) => b.id === id), `dấu vân thừa: ${id}`);
});

test("mọi mục thanh bên phải có bài khai đúng màn, hoặc nhãn có nguyên văn trong chữ Hướng dẫn", () => {
  const chu = HUONG_DAN.flatMap(chuCuaNhom).join("\n");
  const thieu = THANH_BEN.filter((m) => !BAI_VIEC.some((b) => b.trang === m.trang) && !chu.includes(m.nhan)).map((m) => m.nhan);
  assert.deepEqual(thieu, []);
});
