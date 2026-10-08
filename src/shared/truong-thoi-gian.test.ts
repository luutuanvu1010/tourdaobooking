// ADR-0062 Đ1 (NT-B1): MỘT bảng nhãn trường thời gian + hằng "giờ" dùng chung. Đoạn viết nhật ký chuyến / chặng KHÔNG tự viết nhãn; hàm đọc tin không có
// danh sách nhãn thứ hai. Phạm vi quét = ĐÚNG đoạn viết nhật ký (câu báo lỗi chứa nhãn nằm ngoài, không thuộc bài này).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { NHAN_TRUONG_THOI_GIAN, TRUONG_GIO_TINH_LUOT } from "./truong-thoi-gian.ts";

test("NT-B1: TRUONG_GIO_TINH_LUOT ⊂ khoá NHAN_TRUONG_THOI_GIAN; câu 3 = A: đủ 7 trường", () => {
  for (const k of TRUONG_GIO_TINH_LUOT) assert.ok(k in NHAN_TRUONG_THOI_GIAN, k);
  assert.deepEqual([...TRUONG_GIO_TINH_LUOT].sort(), Object.keys(NHAN_TRUONG_THOI_GIAN).sort());
  assert.equal(Object.keys(NHAN_TRUONG_THOI_GIAN).length, 7);
});

const DOAN_VIET_NHAT_KY: { tep: string; tu: string; den: string }[] = [
  { tep: "src/modules/orders/service-rules.ts", tu: "const TRIP_VALUE_FIELDS", den: "export function describeTripUpdates" }, // hằng nhãn + thân describeTripChange
  { tep: "src/shared/chang-dua-don.ts", tu: "export function moTaChang", den: "\n}\n" }, // thân moTaChang: nhánh "thêm —" + nhánh sửa
];
function catDoan(src: string, tu: string, den: string): string {
  const a = src.indexOf(tu);
  assert.ok(a >= 0, `không thấy dấu mở "${tu}" — cập nhật DOAN_VIET_NHAT_KY`);
  const b = src.indexOf(den, a + tu.length);
  assert.ok(b > a, `không thấy dấu đóng "${den}" sau "${tu}"`);
  return src.slice(a, b);
}
const thoatRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const coNhan = (code: string, nhan: string) => new RegExp(`(?<![\\p{L}\\p{N}])${thoatRe(nhan)}(?![\\p{L}\\p{N}])`, "u").test(code);
const boChuThich = (src: string) => src.split("\n").filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");

test("NT-B1: đoạn viết nhật ký chuyến / chặng không tự viết nhãn trường thời gian (mọi vị trí trong đoạn, cả template)", () => {
  for (const d of DOAN_VIET_NHAT_KY) {
    const code = boChuThich(catDoan(readFileSync(d.tep, "utf8"), d.tu, d.den));
    assert.ok(code.length > 50, `${d.tep}: đoạn cắt rỗng`);
    for (const nhan of new Set(Object.values(NHAN_TRUONG_THOI_GIAN))) assert.ok(!coNhan(code, nhan), `${d.tep} (đoạn từ "${d.tu}") viết tay nhãn "${nhan}"`);
  }
});

test("ADR-0062 Đ1-a: hàm đọc tin (tin-doi-don.ts, thong-bao.ts) không có danh sách nhãn trường giờ thứ hai", () => {
  for (const tep of ["src/shared/tin-doi-don.ts", "src/shared/thong-bao.ts"]) {
    const code = boChuThich(readFileSync(tep, "utf8"));
    for (const nhan of new Set(Object.values(NHAN_TRUONG_THOI_GIAN))) assert.ok(!coNhan(code, nhan), `${tep} viết tay nhãn "${nhan}" — lấy từ NHAN_TRUONG_THOI_GIAN`);
  }
});
