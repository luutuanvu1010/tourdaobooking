// Luật thuần hạn mức «Từ chối» (ADR-0032 điều 2–4, 6, 9; kế hoạch 2026-10-23 mục 3b). Bộ ca đếm dùng chung với bài SQL song sinh
// (src/modules/dispatch/han-muc-sql.test.ts) — sửa luật mà quên một bản thì một trong hai bài đỏ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { CA_DEM } from "./han-muc-tu-choi-ca.ts";
import {
  CAU_HET_LUOT, NHAN_CHE_DO, biGioiHanTuChoi, cauConLai, conLai, dauTuanIso, demTuChoi, docCaiDat, moTaChamHanMuc, moTaDoiCaiDat, quyetDinhHanMuc, type CaiDatHanMuc, type SuKien,
} from "./han-muc-tu-choi.ts";
import { PERMISSION_CODES, type PermissionCode } from "./permissions.ts";

const thanh = (ca: (typeof CA_DEM)[number]): SuKien[] => ca.suKien.map(([loai, orderId, at], i) => ({ seq: i + 1, loai, orderId, at }));

for (const ca of CA_DEM) {
  test(`demTuChoi — ${ca.ten}`, () => {
    assert.deepEqual(demTuChoi(thanh(ca), ca.x, ca.dauTuan), ca.mong);
  });
}

test("demTuChoi không phụ thuộc thứ tự mảng đưa vào (sắp theo seq)", () => {
  const ca = CA_DEM[1]!;
  assert.deepEqual(demTuChoi([...thanh(ca)].reverse(), ca.x, ca.dauTuan), ca.mong);
});

test("dauTuanIso: thứ Hai 00:30 giờ VN, Chủ nhật 23:59 giờ VN, đúng lúc giao tuần", () => {
  assert.equal(dauTuanIso(new Date("2026-10-18T17:30:00.000Z")), "2026-10-18T17:00:00.000Z", "thứ Hai 19/10 00:30 VN → tuần bắt đầu 19/10");
  assert.equal(dauTuanIso(new Date("2026-10-25T16:59:00.000Z")), "2026-10-18T17:00:00.000Z", "Chủ nhật 25/10 23:59 VN → vẫn tuần 19/10");
  assert.equal(dauTuanIso(new Date("2026-10-25T16:59:59.999Z")), "2026-10-18T17:00:00.000Z");
  assert.equal(dauTuanIso(new Date("2026-10-25T17:00:00.000Z")), "2026-10-25T17:00:00.000Z", "đúng 00:00 thứ Hai 26/10 VN → tuần mới");
  assert.equal(dauTuanIso(new Date("2026-10-21T05:00:00.000Z")), "2026-10-18T17:00:00.000Z", "giữa tuần");
  assert.match(dauTuanIso(new Date()), /^\d{4}-\d{2}-\d{2}T17:00:00\.000Z$/, "khuôn toISOString (so chuỗi được với occurred_at)");
});

const CS = (cheDo: CaiDatHanMuc["cheDo"], lienTiep = 2, moiTuan = 15): CaiDatHanMuc => ({ cheDo, lienTiep, moiTuan });

test("quyetDinhHanMuc: ba chế độ × bị/không bị giới hạn × vượt chuỗi / vượt tuần / chưa vượt", () => {
  const vuotChuoi = { chuoi: 2, tuan: 2 }, vuotTuan = { chuoi: 0, tuan: 15 }, chuaVuot = { chuoi: 1, tuan: 14 };
  for (const dem of [vuotChuoi, vuotTuan]) {
    assert.equal(quyetDinhHanMuc(CS("BLOCK"), dem, true), "chan");
    assert.equal(quyetDinhHanMuc(CS("MEASURE"), dem, true), "do_vuot");
    assert.equal(quyetDinhHanMuc(CS("OFF"), dem, true), "cho");
    for (const m of ["BLOCK", "MEASURE", "OFF"] as const) assert.equal(quyetDinhHanMuc(CS(m), dem, false), "cho", `không bị giới hạn — ${m}`);
  }
  for (const m of ["BLOCK", "MEASURE", "OFF"] as const) assert.equal(quyetDinhHanMuc(CS(m), chuaVuot, true), "cho");
  assert.equal(quyetDinhHanMuc(CS("BLOCK", 3, 3), { chuoi: 2, tuan: 3 }, true), "chan", "mức đổi được (2/3 → tuần 3 chặn)");
  assert.equal(quyetDinhHanMuc(CS("BLOCK", 3, 3), { chuoi: 2, tuan: 2 }, true), "cho");
});

test("biGioiHanTuChoi trên 1024 tập con của 10 mã quyền: đúng ⇔ có FIELD và không có SALES/ACCOUNTING/ADMIN/SUPER_ADMIN", () => {
  const VP: PermissionCode[] = ["SALES", "ACCOUNTING", "ADMIN", "SUPER_ADMIN"];
  for (let mask = 0; mask < 1 << PERMISSION_CODES.length; mask++) {
    const tap = PERMISSION_CODES.filter((_, i) => mask & (1 << i));
    assert.equal(biGioiHanTuChoi(tap), tap.includes("FIELD") && !VP.some((p) => tap.includes(p)), tap.join(","));
  }
});

test("conLai: chỉ khi Chặn VÀ bị giới hạn; số không âm", () => {
  assert.deepEqual(conLai(CS("BLOCK"), { chuoi: 1, tuan: 1 }, true), { lienTiep: 1, tuan: 14 });
  assert.deepEqual(conLai(CS("BLOCK"), { chuoi: 0, tuan: 0 }, true), { lienTiep: 2, tuan: 15 });
  assert.deepEqual(conLai(CS("BLOCK"), { chuoi: 3, tuan: 20 }, true), { lienTiep: 0, tuan: 0 });
  assert.equal(conLai(CS("MEASURE"), { chuoi: 1, tuan: 1 }, true), null);
  assert.equal(conLai(CS("OFF"), { chuoi: 1, tuan: 1 }, true), null);
  assert.equal(conLai(CS("BLOCK"), { chuoi: 1, tuan: 1 }, false), null);
});

test("docCaiDat: biên 1/10/100; 0/11/101, kiểu sai, thiếu khoá, khoá lạ, chế độ lạ → lỗi tiếng Việt", () => {
  assert.deepEqual(docCaiDat({ cheDo: "BLOCK", lienTiep: 2, moiTuan: 15 }), { ok: true, cs: CS("BLOCK") });
  assert.deepEqual(docCaiDat({ cheDo: "OFF", lienTiep: 1, moiTuan: 1 }), { ok: true, cs: CS("OFF", 1, 1) });
  assert.deepEqual(docCaiDat({ cheDo: "MEASURE", lienTiep: 10, moiTuan: 100 }), { ok: true, cs: CS("MEASURE", 10, 100) });
  const sai: unknown[] = [
    null, [], "x", {}, { cheDo: "ON", lienTiep: 2, moiTuan: 15 }, { cheDo: "BLOCK", lienTiep: 0, moiTuan: 15 }, { cheDo: "BLOCK", lienTiep: 11, moiTuan: 15 },
    { cheDo: "BLOCK", lienTiep: 2, moiTuan: 0 }, { cheDo: "BLOCK", lienTiep: 2, moiTuan: 101 }, { cheDo: "BLOCK", lienTiep: "2", moiTuan: 15 },
    { cheDo: "BLOCK", lienTiep: 2.5, moiTuan: 15 }, { cheDo: "BLOCK", lienTiep: 2 }, { cheDo: "BLOCK", lienTiep: 2, moiTuan: 15, la: 1 }, { lienTiep: 2, moiTuan: 15 },
  ];
  for (const b of sai) {
    const r = docCaiDat(b as Record<string, unknown> | null);
    assert.equal(r.ok, false, JSON.stringify(b));
    if (!r.ok) assert.ok(/[ạảãáàâầấậẩẫăắằặẳẵêềếệểễôồốộổỗơờớợởỡưừứựửữđ]/i.test(r.loi) && !/BLOCK|MEASURE|OFF/.test(r.loi), r.loi);
  }
});

test("chữ hiển thị: nhãn chế độ, câu còn lượt, câu hết lượt nguyên văn ADR điều 5; không lộ mã thô", () => {
  assert.deepEqual(NHAN_CHE_DO, { OFF: "Tắt", MEASURE: "Chỉ đo", BLOCK: "Chặn" });
  assert.equal(CAU_HET_LUOT, "Bạn đã từ chối đủ số lần cho phép. Hãy gọi văn phòng.");
  assert.equal(cauConLai(1, 14), "Bạn còn được từ chối 1 đơn liên tiếp, 14 lần trong tuần này.");
  assert.equal(moTaChamHanMuc(CS("BLOCK"), { chuoi: 2, tuan: 5 }), "Liên tiếp 2/2 · tuần 5/15 · Chặn");
  assert.equal(moTaChamHanMuc(CS("MEASURE"), { chuoi: 2, tuan: 5 }), "Liên tiếp 2/2 · tuần 5/15 · Chỉ đo (không chặn)");
  assert.equal(moTaDoiCaiDat(CS("MEASURE"), CS("BLOCK", 3, 15)), "Chế độ: Chỉ đo → Chặn; liên tiếp 2 → 3; mỗi tuần 15 → 15");
  assert.equal(moTaDoiCaiDat(null, CS("BLOCK")), "Chế độ: (chưa có) → Chặn; liên tiếp – → 2; mỗi tuần – → 15");
});
