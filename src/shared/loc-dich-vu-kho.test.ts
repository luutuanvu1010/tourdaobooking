import { test } from "node:test";
import assert from "node:assert/strict";
import { CHUA_PHAN_LOAI } from "./loc-danh-muc.ts";
import {
  BO_LOC_TRONG, TOI_DA_MA_LOC, TOI_DA_CHU_TIM, bangNhomTheoMa, cacNutNhom, coChuaPhanLoai, dangLoc, dieuKienLo, docThamSoLo, khopBoLoc, khopChuTim, khopDieuKien, nhomCuaMa, thamSoLo,
} from "./loc-dich-vu-kho.ts";

const ITEMS = [
  { code: "VINWON", groupCode: "VUI_CHOI" },
  { code: "TOUR4D", groupCode: "TOUR" },
  { code: "LAN01", groupCode: "TOUR" },
  { code: "LE01", groupCode: null },
];
const bang = bangNhomTheoMa(ITEMS);

test("bảng mã → nhóm: mã có nhóm giữ nhóm; mã không nhóm và mã đã rời danh mục đều là «Chưa phân loại»", () => {
  assert.equal(nhomCuaMa(bang, "VINWON"), "VUI_CHOI");
  assert.equal(nhomCuaMa(bang, "LE01"), CHUA_PHAN_LOAI);
  assert.equal(nhomCuaMa(bang, "DA_XOA"), CHUA_PHAN_LOAI);
});

test("chữ tìm KHÔNG phân biệt dấu, hoa thường; «vin» và «vịn» ra cùng kết quả; chữ trống khớp mọi dòng", () => {
  for (const tim of ["vin", "vịn", "VIN", "  Vịn "]) assert.equal(khopChuTim(["Vinpearl Land"], tim), true, tim);
  assert.equal(khopChuTim(["Vịnh Nha Trang"], "vinh"), true);
  assert.equal(khopChuTim(["Đảo Bình Ba"], "dao binh"), true);
  assert.equal(khopChuTim(["Tour 4 đảo"], "lặn"), false);
  assert.equal(khopChuTim([null, undefined], "vin"), false);
  assert.equal(khopChuTim([null], ""), true);
  assert.equal(khopChuTim([], "   "), true);
});

test("khớp bộ lọc ở trình duyệt: nhóm VÀ chữ tìm; tìm theo tên dịch vụ, mã, tên in trên vé", () => {
  const lo = { ma: "VINWON", chu: ["VinWonders", "Vé vào cổng Vịnh"] };
  assert.equal(khopBoLoc(lo, BO_LOC_TRONG, bang), true);
  assert.equal(khopBoLoc(lo, { nhom: "VUI_CHOI", tim: "" }, bang), true);
  assert.equal(khopBoLoc(lo, { nhom: "TOUR", tim: "" }, bang), false);
  assert.equal(khopBoLoc(lo, { nhom: "", tim: "vinwon" }, bang), true, "theo mã");
  assert.equal(khopBoLoc(lo, { nhom: "", tim: "cổng vinh" }, bang), true, "theo tên in trên vé, bỏ dấu");
  assert.equal(khopBoLoc(lo, { nhom: "VUI_CHOI", tim: "tour" }, bang), false, "nhóm đúng mà chữ không khớp");
  assert.equal(khopBoLoc({ ma: "DA_XOA", chu: [null] }, { nhom: CHUA_PHAN_LOAI, tim: "" }, bang), true, "mã đã rời danh mục vào «Chưa phân loại»");
  assert.equal(khopBoLoc({ ma: "LE01", chu: ["Vé lẻ"] }, { nhom: CHUA_PHAN_LOAI, tim: "" }, bang), true);
  assert.equal(khopBoLoc({ ma: "TOUR4D", chu: ["Tour 4 đảo"] }, { nhom: CHUA_PHAN_LOAI, tim: "" }, bang), false);
});

test("đang lọc: có nhóm hoặc có chữ tìm (khoảng trắng không tính)", () => {
  assert.equal(dangLoc(BO_LOC_TRONG), false);
  assert.equal(dangLoc({ nhom: "", tim: "   " }), false);
  assert.equal(dangLoc({ nhom: "TOUR", tim: "" }), true);
  assert.equal(dangLoc({ nhom: "", tim: "vin" }), true);
});

test("điều kiện gửi máy chủ cho KẾT QUẢ Y HỆT bộ lọc trình duyệt, kể cả «Chưa phân loại» với mã đã rời danh mục", () => {
  const dong = [...ITEMS.map((i) => i.code), "DA_XOA", "KHAC"].flatMap((ma) => [
    { ma, chu: ["Vinpearl"] },
    { ma, chu: ["Tour đảo", null] },
  ]);
  const cacLoc = [BO_LOC_TRONG, { nhom: "TOUR", tim: "" }, { nhom: "VUI_CHOI", tim: "vịn" }, { nhom: CHUA_PHAN_LOAI, tim: "" }, { nhom: CHUA_PHAN_LOAI, tim: "dao" }, { nhom: "KHONG_CO", tim: "" }, { nhom: "", tim: "tour" }];
  for (const loc of cacLoc) {
    const dk = dieuKienLo(bang, loc);
    for (const d of dong) assert.equal(khopDieuKien(d, dk), khopBoLoc(d, loc, bang), `${loc.nhom}/${loc.tim}/${d.ma}/${String(d.chu[0])}`);
  }
});

test("tham số truy vấn: không lọc thì không có tham số; ghi rồi đọc lại được đúng điều kiện", () => {
  assert.deepEqual(thamSoLo(dieuKienLo(bang, BO_LOC_TRONG)), []);
  assert.equal(docThamSoLo(new URLSearchParams("tatCa=1&trang=2")), null);
  for (const loc of [{ nhom: "TOUR", tim: "" }, { nhom: CHUA_PHAN_LOAI, tim: "vịn" }, { nhom: "", tim: "Vé cổng" }, { nhom: "KHONG_CO", tim: "" }]) {
    const dk = dieuKienLo(bang, loc);
    const doc = docThamSoLo(new URLSearchParams(thamSoLo(dk)));
    assert.ok(doc && doc !== "sai", JSON.stringify(loc));
    assert.deepEqual(doc.ma && [...doc.ma].sort(), dk.ma && [...dk.ma].sort());
    assert.deepEqual(doc.boMa && [...doc.boMa].sort(), dk.boMa && [...dk.boMa].sort());
    assert.equal(doc.tim, dk.tim);
  }
  // Nhóm không còn mã nào: danh sách rỗng (không khớp gì), khác hẳn «không lọc nhóm».
  const rong = docThamSoLo(new URLSearchParams(thamSoLo(dieuKienLo(bang, { nhom: "KHONG_CO", tim: "" }))));
  assert.ok(rong && rong !== "sai" && rong.ma !== null && rong.ma.size === 0);
  assert.equal(khopDieuKien({ ma: "TOUR4D", chu: [] }, rong), false);
});

test("đọc tham số: mã sai dạng, quá nhiều mã, chữ tìm quá dài hay hai kiểu nhóm cùng lúc ⇒ «sai»", () => {
  assert.equal(docThamSoLo(new URLSearchParams("ma=TOUR4D,có dấu")), "sai");
  assert.equal(docThamSoLo(new URLSearchParams("boMa=A;B")), "sai");
  assert.equal(docThamSoLo(new URLSearchParams("ma=A&boMa=B")), "sai");
  assert.equal(docThamSoLo(new URLSearchParams(`ma=${Array.from({ length: TOI_DA_MA_LOC + 1 }, (_x, i) => `M${i}`).join(",")}`)), "sai");
  assert.equal(docThamSoLo(new URLSearchParams(`tim=${"a".repeat(TOI_DA_CHU_TIM + 1)}`)), "sai");
  const ok = docThamSoLo(new URLSearchParams(`ma=${Array.from({ length: TOI_DA_MA_LOC }, (_x, i) => `M${i}`).join(",")}&tim=${"a".repeat(TOI_DA_CHU_TIM)}`));
  assert.ok(ok && ok !== "sai");
  const trongTim = docThamSoLo(new URLSearchParams("tim=%20%20"));
  assert.equal(trongTim, null, "chữ tìm chỉ có khoảng trắng: coi như không lọc");
});

test("hàng nút nhóm: «Tất cả» đầu, nhóm theo thứ tự danh mục, «Chưa phân loại» cuối khi cần", () => {
  const groups = [{ code: "TOUR", name: "Tour" }, { code: "VUI_CHOI", name: "Vui chơi" }];
  assert.deepEqual(cacNutNhom(groups, false), [{ ma: "", ten: "Tất cả" }, { ma: "TOUR", ten: "Tour" }, { ma: "VUI_CHOI", ten: "Vui chơi" }]);
  assert.deepEqual(cacNutNhom(groups, true).at(-1), { ma: CHUA_PHAN_LOAI, ten: "Chưa phân loại" });
  assert.deepEqual(cacNutNhom([], true), [], "danh mục không có nhóm: không có hàng nút");
});

test("có cần nút «Chưa phân loại»: danh mục có dịch vụ không nhóm, hoặc dòng đang biết mang mã ngoài danh mục", () => {
  assert.equal(coChuaPhanLoai(bang, []), true, "LE01 không nhóm");
  const coNhom = bangNhomTheoMa(ITEMS.filter((i) => i.groupCode !== null));
  assert.equal(coChuaPhanLoai(coNhom, ["TOUR4D", "VINWON"]), false);
  assert.equal(coChuaPhanLoai(coNhom, ["TOUR4D", "DA_XOA"]), true);
});
