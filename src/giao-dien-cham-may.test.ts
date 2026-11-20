// Bài kiểm phần chấm của máy đo giao diện (scripts/giao-dien/cham-may.mjs). Hàm thuần: số đo dựng tay vào, kết quả ra.
import { test } from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error tệp .mjs không có kiểu
import { TIEU_CHI_MAY, chamMay, tongKet } from "../scripts/giao-dien/cham-may.mjs";

type Ket = { ma: string; ketQua: string; so: number; viDu: string[]; soCatChuPhu?: number };

/** Số đo của một ô ĐẠT hết ở khổ máy tính; `sua` ghi đè từng phần. */
function oDat(sua: Record<string, unknown> = {}) {
  const goc = {
    kho: 1280,
    mobile: false,
    do: { tranNgang: false, thoRa: [], soNhoHon44: 0, h1: [{ chu: "Tạo đơn" }], nutChinhTrongManDau: ["Lưu"], nutKieu: [], tuAnh: [], oGoNho: [], oKhongNhan: [], laTrangThaiToanTrang: false },
    them: { t3: [], chong: [], coChu: { so: 4 } },
    loiHt: { cat: [] },
    axe: [],
    t15: { soKhongTen: 0 },
  };
  return { ...goc, ...sua } as Record<string, any>;
}
const ket = (o: Record<string, unknown>, ma: string): Ket => (chamMay(o) as Ket[]).find((k) => k.ma === ma)!;
const doVoi = (sua: Record<string, unknown>) => ({ ...oDat().do, ...sua });

test("TIEU_CHI_MAY có đúng 12 mã theo thứ tự", () => {
  assert.deepEqual(TIEU_CHI_MAY.map((t: { ma: string }) => t.ma), ["T1", "T2", "T3", "T4", "T5", "T6", "T8", "T9", "T15", "M1", "M2", "M3"]);
  for (const t of TIEU_CHI_MAY) for (const k of ["ma", "ten", "nguong", "kho"]) assert.ok(k in t, `${t.ma} thiếu ${k}`);
});

test("chamMay trả đủ 12 mã, thứ tự cố định; ô đạt hết ⇒ không có không-đạt", () => {
  const r = chamMay(oDat()) as Ket[];
  assert.deepEqual(r.map((k) => k.ma), TIEU_CHI_MAY.map((t: { ma: string }) => t.ma));
  assert.deepEqual(r.filter((k) => k.ketQua === "khong-dat" || k.ketQua === "chua-do"), []);
});

test("T1: tràn ngang ⇒ không đạt, ví dụ là phần tử thò ra", () => {
  assert.equal(ket(oDat(), "T1").ketQua, "dat");
  const k = ket(oDat({ do: doVoi({ tranNgang: true, thoRa: ["bang-rong", "the"] }) }), "T1");
  assert.equal(k.ketQua, "khong-dat");
  assert.deepEqual(k.viDu, ["bang-rong", "the"]);
  // áp cả khổ điện thoại
  assert.equal(ket(oDat({ kho: 390, mobile: true, do: doVoi({ tranNgang: true, thoRa: ["x"] }) }), "T1").ketQua, "khong-dat");
});

test("T2: chỉ chỗ cắt có số tiền hoặc toàn chữ số mới làm không đạt; chữ khác đếm phụ", () => {
  assert.equal(ket(oDat({ loiHt: { cat: [{ el: "span", chu: "Tên khách rất dài rất dài", rong: 80, can: 200 }] } }), "T2").ketQua, "dat");
  const phu = ket(oDat({ loiHt: { cat: [{ el: "span", chu: "Tên khách rất dài", rong: 80, can: 200 }] } }), "T2");
  assert.equal(phu.soCatChuPhu, 1);
  assert.equal(phu.so, 0);
  const tien = ket(oDat({ loiHt: { cat: [{ el: "b", chu: "1.350.000 đ", rong: 40, can: 90 }] } }), "T2");
  assert.equal(tien.ketQua, "khong-dat");
  assert.equal(tien.so, 1);
  assert.equal(ket(oDat({ loiHt: { cat: [{ el: "b", chu: "2.500.000₫", rong: 40, can: 90 }] } }), "T2").ketQua, "khong-dat");
  assert.equal(ket(oDat({ loiHt: { cat: [{ el: "b", chu: "12345", rong: 30, can: 60 }] } }), "T2").ketQua, "khong-dat");
  // hộp ≤ 2 px (chữ ẩn cho bộ đọc màn hình) không tính
  assert.equal(ket(oDat({ loiHt: { cat: [{ el: "b", chu: "1.350.000 đ", rong: 1, can: 90 }] } }), "T2").ketQua, "dat");
});

test("T3: có phần tử nổi đè ⇒ không đạt", () => {
  assert.equal(ket(oDat({ them: { t3: [{ el: "button", chu: "Lưu", biDeBoi: "div.chan-dinh" }], chong: [], coChu: { so: 3 } } }), "T3").ketQua, "khong-dat");
  assert.equal(ket(oDat(), "T3").ketQua, "dat");
});

test("T4: chỉ xét khổ điện thoại", () => {
  assert.equal(ket(oDat({ do: doVoi({ soNhoHon44: 3 }) }), "T4").ketQua, "khong-ap-dung");
  assert.equal(ket(oDat({ kho: 390, mobile: true }), "T4").ketQua, "dat");
  const k = ket(oDat({ kho: 390, mobile: true, do: doVoi({ soNhoHon44: 2, nhoHon44: [{ ten: "Xoá", w: 30, h: 28, the: "button" }] }) }), "T4");
  assert.equal(k.ketQua, "khong-dat");
  assert.equal(k.so, 2);
});

test("T5: một h1 và tối đa một nút chính; trang trạng thái toàn trang không áp dụng", () => {
  assert.equal(ket(oDat(), "T5").ketQua, "dat");
  assert.equal(ket(oDat({ do: doVoi({ h1: [] }) }), "T5").ketQua, "khong-dat");
  assert.equal(ket(oDat({ do: doVoi({ h1: [{}, {}] }) }), "T5").ketQua, "khong-dat");
  assert.equal(ket(oDat({ do: doVoi({ nutChinhTrongManDau: ["A", "B"] }) }), "T5").ketQua, "khong-dat");
  assert.equal(ket(oDat({ do: doVoi({ h1: [], nutChinhTrongManDau: ["A", "B"], laTrangThaiToanTrang: true }) }), "T5").ketQua, "khong-ap-dung");
});

test("T6: chỉ khổ ≥ 1024; hình nút ≤ 3 và cỡ chữ ≤ 5", () => {
  const nut = (r: number) => ({ ten: "n", sig: `40h|r${r}px|bgrgb(0,0,0)|crgb(255,255,255)|b0px none|16px/600` });
  const bonKieu = [nut(4), nut(8), nut(12), nut(16)];
  assert.equal(ket(oDat({ kho: 390, mobile: true, do: doVoi({ nutKieu: bonKieu }) }), "T6").ketQua, "khong-ap-dung");
  assert.equal(ket(oDat({ do: doVoi({ nutKieu: bonKieu }) }), "T6").ketQua, "khong-dat");
  assert.equal(ket(oDat({ do: doVoi({ nutKieu: bonKieu.slice(0, 3) }) }), "T6").ketQua, "dat");
  // chỉ khác MÀU CHỮ thì vẫn là một hình
  const khacMau = [nut(4), { ten: "n", sig: nut(4).sig.replace("crgb(255,255,255)", "crgb(1,2,3)") }];
  assert.equal(ket(oDat({ do: doVoi({ nutKieu: khacMau }) }), "T6").so, 1);
  assert.equal(ket(oDat({ them: { t3: [], chong: [], coChu: { so: 6 } } }), "T6").ketQua, "khong-dat");
  assert.equal(ket(oDat({ them: { t3: [], chong: [], coChu: { so: 5 } } }), "T6").ketQua, "dat");
});

test("T8: axe null ⇒ chưa đo; serious/critical ⇒ không đạt; minor/moderate ⇒ đạt", () => {
  assert.equal(ket(oDat({ axe: null }), "T8").ketQua, "chua-do");
  assert.equal(ket(oDat({ axe: [{ id: "color-contrast", impact: "serious", n: 2, vd: ["label.x", "span.y"] }] }), "T8").ketQua, "khong-dat");
  const k = ket(oDat({ axe: [{ id: "button-name", impact: "critical", n: 1, vd: ["button.z"] }] }), "T8");
  assert.equal(k.ketQua, "khong-dat");
  assert.match(k.viDu[0], /button-name/);
  assert.match(k.viDu[0], /button\.z/);
  assert.equal(ket(oDat({ axe: [{ id: "region", impact: "moderate", n: 1, vd: ["div"] }] }), "T8").ketQua, "dat");
});

test("T9: chữ Anh lộ ra ⇒ không đạt", () => {
  assert.equal(ket(oDat({ do: doVoi({ tuAnh: ["cancelled"] }) }), "T9").ketQua, "khong-dat");
  assert.equal(ket(oDat(), "T9").ketQua, "dat");
});

test("T15: t15 null ⇒ chưa đo; có nút không tên ⇒ không đạt", () => {
  assert.equal(ket(oDat({ t15: null }), "T15").ketQua, "chua-do");
  const k = ket(oDat({ t15: { soKhongTen: 2, mota: ["button:button.x"] } }), "T15");
  assert.equal(k.ketQua, "khong-dat");
  assert.equal(k.so, 2);
});

test("M1, M2, M3", () => {
  assert.equal(ket(oDat({ do: doVoi({ oGoNho: [{ ten: "Tên", co: "14px" }] }) }), "M1").ketQua, "khong-dat");
  assert.equal(ket(oDat({ them: { t3: [], chong: [{ chuA: "a", chuB: "b" }], coChu: { so: 3 } } }), "M2").ketQua, "khong-dat");
  assert.equal(ket(oDat({ do: doVoi({ oKhongNhan: ["Ghi chú"] }) }), "M3").ketQua, "khong-dat");
  for (const ma of ["M1", "M2", "M3"]) assert.equal(ket(oDat(), ma).ketQua, "dat");
});

test("tongKet: tất cả đạt ⇒ 0", () => {
  const t = tongKet([{ cham: chamMay(oDat()) }, { cham: chamMay(oDat({ kho: 390, mobile: true })) }]);
  assert.equal(t.maThoat, 0);
  assert.equal(t.soKhongDat, 0);
  assert.equal(t.soChuaDo, 0);
  assert.equal(t.soOLoi, 0);
});

test("tongKet: một không đạt ⇒ 1", () => {
  const t = tongKet([{ cham: chamMay(oDat({ do: doVoi({ tuAnh: ["draft"] }) })) }]);
  assert.equal(t.maThoat, 1);
  assert.equal(t.soKhongDat, 1);
});

test("tongKet: axe null (chưa đo) ⇒ 2 dù không có không-đạt nào", () => {
  const t = tongKet([{ cham: chamMay(oDat({ axe: null })) }]);
  assert.equal(t.maThoat, 2);
  assert.equal(t.soChuaDo, 1);
});

test("tongKet: ô có loi ⇒ 2; chua-do thắng khong-dat; không-áp-dụng không ảnh hưởng", () => {
  assert.equal(tongKet([{ loi: "trang không mở" }]).maThoat, 2);
  assert.equal(tongKet([{ loi: "trang không mở" }]).soOLoi, 1);
  const lan = tongKet([{ cham: chamMay(oDat({ axe: null, do: doVoi({ tuAnh: ["draft"] }) })) }]);
  assert.equal(lan.maThoat, 2);
  assert.equal(lan.soKhongDat, 1);
  // khổ máy tính: T4 không áp dụng, khổ điện thoại: T6 không áp dụng — vẫn ra 0
  assert.equal(tongKet([{ cham: chamMay(oDat()) }]).maThoat, 0);
});
