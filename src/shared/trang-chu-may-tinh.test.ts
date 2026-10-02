import assert from "node:assert/strict";
import { test } from "node:test";
import { conLai, cotNhom, dongThoiGian, loiChao, phutVN } from "./trang-chu-may-tinh.ts";

// Bề rộng lưới ô = cột nội dung (khổ − thanh bên 236px, trần 1200px) − đệm hai bên 24px của dải chào.
const rongLuoi = (kho: number): number => Math.min(kho - 236, 1200) - 48;

test("cotNhom: đúng số cột bản vẽ v2 vẽ ở 1280 và 1440 (bảng LCOLS)", () => {
  assert.deepEqual(cotNhom([3, 1, 3], rongLuoi(1280)), [3, 1, 3], "Bán hàng 1280: một hàng");
  assert.deepEqual(cotNhom([3, 4, 5, 3], rongLuoi(1280)), [2, 2, 3, 2], "Quản trị 1280: hai hàng");
  assert.deepEqual(cotNhom([3, 8, 6, 3], rongLuoi(1280)), [2, 3, 2, 2], "Toàn quyền (8 ô Quản lý như bản vẽ) 1280: ba hàng");
  assert.deepEqual(cotNhom([3, 8, 6, 3], rongLuoi(1440)), [2, 4, 3, 2], "Toàn quyền 1440: hai hàng");
  assert.deepEqual(cotNhom([3, 1, 3], rongLuoi(1440)), [3, 1, 3]);
  assert.deepEqual(cotNhom([3, 4, 5, 3], rongLuoi(1440)), [2, 2, 3, 2]);
});

test("cotNhom: Toàn quyền có thêm ô Giao diện (9 ô Quản lý) — vẫn ba hàng ở 1280 và cả 1440", () => {
  assert.deepEqual(cotNhom([3, 9, 6, 3], rongLuoi(1280)), [2, 3, 2, 2]);
  assert.deepEqual(cotNhom([3, 9, 6, 3], rongLuoi(1440)), [2, 3, 2, 2]);
  assert.deepEqual(cotNhom([3, 9, 6, 3], rongLuoi(1920)), [2, 3, 2, 2], "trần 1200px: khổ to hơn không thêm chỗ");
});

test("cotNhom: Kế toán (không Tạo đơn) một hàng", () => {
  assert.deepEqual(cotNhom([2, 1, 3], rongLuoi(1280)), [2, 1, 3]);
  assert.deepEqual(cotNhom([2, 1, 3], rongLuoi(1040)), [2, 1, 3]);
});

test("cotNhom: không xếp nổi trong ba hàng với ô ≥ 88px → null (xếp chồng nhóm như bản vẽ 768)", () => {
  assert.equal(cotNhom([3, 4, 5, 3], rongLuoi(1040)), null, "Quản trị 1040");
  assert.equal(cotNhom([3, 9, 6, 3], rongLuoi(1040)), null, "Toàn quyền 1040");
  assert.equal(cotNhom([3, 4, 5, 3], rongLuoi(768)), null);
  assert.equal(cotNhom([3, 1, 3], rongLuoi(768)), null, "Bán hàng 768");
  assert.equal(cotNhom([3, 1, 3], 0), null, "chưa đo được bề rộng");
});

test("cotNhom: mọi nhóm có ít nhất min(số ô, 2) cột, đủ chỗ cho mọi ô trong số hàng chọn, mỗi ô ≥ 88px theo đúng cách chia của flex", () => {
  for (const so of [[3, 1, 3], [2, 1, 3], [3, 4, 5, 3], [3, 9, 6, 3], [1, 2], [3, 3, 7, 3], [5]]) {
    for (let rong = 300; rong <= 1300; rong += 7) {
      const c = cotNhom(so, rong);
      if (!c) continue;
      const hang = Math.max(...so.map((n, i) => Math.ceil(n / c[i]!)));
      assert.ok(hang <= 3, `${so} @${rong}: ${hang} hàng`);
      const tong = c.reduce((a, b) => a + b, 0);
      const W = rong - 33 * (so.length - 1);
      for (const [i, ci] of c.entries()) {
        assert.ok(ci >= Math.min(so[i]!, 2) && ci <= so[i]!, `${so} @${rong}: nhóm ${i} có ${ci} cột`);
        assert.ok((W * ci) / tong - 4 * (ci - 1) >= 88 * ci, `${so} @${rong}: ô nhóm ${i} hẹp hơn 88px`);
      }
    }
  }
});

test("loiChao: theo giờ Việt Nam — sáng 04:00–10:59, trưa 11:00–12:59, chiều 13:00–17:59, tối còn lại", () => {
  const p = (h: number, m = 0) => h * 60 + m;
  assert.equal(loiChao(p(6, 45)), "Chào buổi sáng");
  assert.equal(loiChao(p(4)), "Chào buổi sáng");
  assert.equal(loiChao(p(10, 59)), "Chào buổi sáng");
  assert.equal(loiChao(p(11)), "Chào buổi trưa");
  assert.equal(loiChao(p(12, 59)), "Chào buổi trưa");
  assert.equal(loiChao(p(13)), "Chào buổi chiều");
  assert.equal(loiChao(p(17, 59)), "Chào buổi chiều");
  assert.equal(loiChao(p(18)), "Chào buổi tối");
  assert.equal(loiChao(p(23, 59)), "Chào buổi tối");
  assert.equal(loiChao(p(0)), "Chào buổi tối");
  assert.equal(loiChao(p(3, 59)), "Chào buổi tối");
});

test("phutVN: phút trong ngày theo giờ Việt Nam (UTC+7), không theo múi giờ máy", () => {
  assert.equal(phutVN(new Date("2026-10-01T23:45:00Z")), 6 * 60 + 45, "23:45 UTC = 06:45 sáng hôm sau ở VN");
  assert.equal(phutVN(new Date("2026-10-02T17:00:00Z")), 0);
  assert.equal(phutVN(new Date("2026-10-02T05:30:00Z")), 12 * 60 + 30);
});

test("conLai: chữ thời gian còn lại tới chuyến sắp tới", () => {
  assert.equal(conLai(15), "còn 15 phút");
  assert.equal(conLai(1), "còn 1 phút");
  assert.equal(conLai(0), "đến giờ đón");
  assert.equal(conLai(60), "còn 1 giờ");
  assert.equal(conLai(75), "còn 1 giờ 15 phút");
  assert.equal(conLai(185), "còn 3 giờ 5 phút");
});

test("dongThoiGian: hôm nay 06:45 với bốn chuyến của bản vẽ — vạch 06:00…09:00, 06:30 đã qua, 07:00 sắp tới", () => {
  const d = dongThoiGian(["06:30", "07:00", "07:15", "08:00"], 6 * 60 + 45);
  assert.ok(d);
  assert.equal(d.dau, 360);
  assert.equal(d.cuoi, 540);
  assert.deepEqual(d.vach.map((v) => v.nhan), ["06:00", "07:00", "08:00", "09:00"]);
  assert.deepEqual(d.vach.map((v) => v.tiLe), [0, 1 / 3, 2 / 3, 1]);
  assert.deepEqual(d.loai, ["qua", "toi", "sau", "sau"]);
  assert.equal(d.toi, 1);
  assert.equal(d.conLaiPhut, 15);
  assert.equal(d.bayGio?.nhan, "Bây giờ 06:45");
  assert.equal(d.bayGio?.tiLe, 0.25);
  assert.deepEqual(d.diem.map((x) => x?.tiLe), [0.5 / 3, 1 / 3, 1.25 / 3, 2 / 3]);
});

test("dongThoiGian: ngày mai / ngày kia (không có giờ hiện tại) — không vạch Bây giờ, không chuyến nào đã qua hay sắp tới", () => {
  const d = dongThoiGian(["06:45", "07:30"], null);
  assert.ok(d);
  assert.equal(d.bayGio, null);
  assert.deepEqual(d.loai, ["sau", "sau"]);
  assert.equal(d.toi, -1);
  assert.equal(d.conLaiPhut, null);
  assert.deepEqual(d.vach.map((v) => v.nhan), ["06:00", "07:00", "08:00"]);
});

test("dongThoiGian: giờ hiện tại ngoài khoảng → ẩn vạch Bây giờ; trước chuyến đầu: chuyến đầu sắp tới; sau chuyến cuối: mọi chuyến đã qua, không sắp tới", () => {
  const sang = dongThoiGian(["07:00", "08:30"], 5 * 60);
  assert.ok(sang);
  assert.equal(sang.bayGio, null);
  assert.deepEqual(sang.loai, ["toi", "sau"]);
  assert.equal(sang.conLaiPhut, 120);
  const toi = dongThoiGian(["07:00", "08:30"], 20 * 60);
  assert.ok(toi);
  assert.equal(toi.bayGio, null);
  assert.deepEqual(toi.loai, ["qua", "qua"]);
  assert.equal(toi.toi, -1);
  assert.equal(toi.conLaiPhut, null);
});

test("dongThoiGian: đúng giờ đón là 'sắp tới · đến giờ' (không phải đã qua); hai chuyến cùng giờ chỉ chuyến đầu là sắp tới", () => {
  const d = dongThoiGian(["07:00", "07:00", "07:30"], 7 * 60);
  assert.ok(d);
  assert.deepEqual(d.loai, ["toi", "sau", "sau"]);
  assert.equal(d.conLaiPhut, 0);
  const lon = dongThoiGian(["08:00", "07:15", "06:30"], 7 * 60);
  assert.ok(lon);
  assert.deepEqual(lon.loai, ["sau", "toi", "qua"], "danh sách không theo giờ: sắp tới vẫn là giờ sớm nhất từ bây giờ");
});

test("dongThoiGian: chuyến chưa có giờ đón bỏ khỏi dòng thời gian (giữ đúng vị trí trong danh sách), không có giờ nào → null", () => {
  const d = dongThoiGian([null, "07:00", "giờ lạ"], 6 * 60);
  assert.ok(d);
  assert.deepEqual(d.diem.map((x) => x === null), [true, false, true]);
  assert.deepEqual(d.loai, [null, "toi", null]);
  assert.equal(d.toi, 1);
  assert.equal(dongThoiGian([], 6 * 60), null);
  assert.equal(dongThoiGian([null, null], 6 * 60), null);
});

test("dongThoiGian: một chuyến đúng giờ chẵn vẫn có khoảng một giờ; khoảng dài thì thưa nhãn (tối đa 7 nhãn), vạch vẫn mỗi giờ", () => {
  const mot = dongThoiGian(["07:00"], null);
  assert.ok(mot);
  assert.deepEqual([mot.dau, mot.cuoi], [420, 480]);
  const dai = dongThoiGian(["05:10", "21:40"], null);
  assert.ok(dai);
  assert.deepEqual([dai.dau, dai.cuoi], [300, 1320]);
  assert.equal(dai.vach.length, 18);
  const coNhan = dai.vach.filter((v) => v.nhan !== null);
  assert.ok(coNhan.length <= 7, `${coNhan.length} nhãn`);
  assert.equal(dai.vach[0]!.nhan, "05:00");
});
