// Hoa hồng «Đổi mức một bước» (Task 3, PR máy chủ): luật thuần — kiemDoi, kiemThanDoiMuc, cungMuc. Đặc tả A3.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ngayDoiSomNhat } from "../../shared/hoa-hong-hien-thi.ts";
import { addDays } from "../../shared/vn-date.ts";
import { cungMuc, kiemDoi, kiemThanDoiMuc, type DongMuc } from "./rules.ts";

const HOM_NAY = "2026-10-25";
const doi = (validFrom: string, validTo: string | null, tuNgay: unknown) => kiemDoi({ cu: { validFrom, validTo }, tuNgay, homNay: HOM_NAY });

test("kiemDoi câu 1: dòng cũ đã có ngày ngừng ⇒ không đổi được", () => {
  const r = doi("2026-01-01", "2026-12-31", addDays(HOM_NAY, 1));
  assert.deepEqual(r, { ok: false, error: "Dòng này đã có ngày ngừng nên không đổi được. Thêm mức mới bắt đầu sau ngày ngừng." });
});

test("kiemDoi câu 2: dòng cũ chưa tới ngày áp dụng ⇒ không đổi được", () => {
  const r = doi(addDays(HOM_NAY, 1), null, addDays(HOM_NAY, 2));
  assert.deepEqual(r, { ok: false, error: "Mức này chưa tới ngày áp dụng nên không đổi được." });
});

test("kiemDoi câu 3: ngày bắt đầu không phải ngày, hoặc trước hôm nay", () => {
  const msg = "Ngày bắt đầu của mức mới không được trước hôm nay.";
  for (const t of [undefined, null, 123, "", "2026-13-40", "25/10/2026", addDays(HOM_NAY, -1)]) {
    assert.deepEqual(doi("2026-01-01", null, t), { ok: false, error: msg }, String(t));
  }
});

test("kiemDoi câu 4: mức cũ bắt đầu cùng hoặc sau ngày bắt đầu mới ⇒ dùng Ngừng rồi Thêm", () => {
  const r = doi(HOM_NAY, null, HOM_NAY);
  assert.deepEqual(r, { ok: false, error: "Mức cũ bắt đầu từ 25/10/2026 nên không đổi được từ ngày 25/10/2026. Dùng Ngừng cho mức cũ, rồi Thêm mức mới." });
});

test("kiemDoi: thứ tự kiểm — câu 1 thắng câu 2, câu 2 thắng câu 3", () => {
  const a = doi(addDays(HOM_NAY, 5), "2027-01-01", "bậy");
  assert.ok(!a.ok && a.error.startsWith("Dòng này đã có ngày ngừng"));
  const b = doi(addDays(HOM_NAY, 5), null, "bậy");
  assert.ok(!b.ok && b.error.startsWith("Mức này chưa tới"));
});

test("kiemDoi biên: cũ bắt đầu hôm nay, mức mới từ ngày mai ⇒ ok, đóng cũ hết hôm nay", () => {
  const tu = addDays(HOM_NAY, 1);
  assert.deepEqual(doi(HOM_NAY, null, tu), { ok: true, denNgayCu: HOM_NAY, tuNgay: tu });
});

test("ngayDoiSomNhat (ô «Từ» của hộp Đổi trên giao diện) khớp kiemDoi: máy chủ nhận đúng ngày đó, từ chối ngày liền trước", () => {
  for (const cu of [HOM_NAY, addDays(HOM_NAY, -1), addDays(HOM_NAY, -30)]) {
    const som = ngayDoiSomNhat(cu, HOM_NAY);
    assert.equal(doi(cu, null, som).ok, true, `cũ từ ${cu}: phải nhận ${som}`);
    assert.equal(doi(cu, null, addDays(som, -1)).ok, false, `cũ từ ${cu}: phải từ chối ngày trước ${som}`);
  }
});

test("kiemDoi biên: mức mới từ hôm nay, cũ bắt đầu 3 ngày trước ⇒ ok, đóng cũ hết hôm qua", () => {
  assert.deepEqual(doi(addDays(HOM_NAY, -3), null, HOM_NAY), { ok: true, denNgayCu: addDays(HOM_NAY, -1), tuNgay: HOM_NAY });
});

test("kiemThanDoiMuc: nhận phần mức (kiểu, số, theo loại, ngày, ghi chú)", () => {
  const r = kiemThanDoiMuc({ kieu: "PER_PAX", moiKhach: 50_000, theoLoai: { treEm: 30_000, nguoiCaoTuoi: 40_000 }, tuNgay: "2026-11-01", denNgay: "2026-12-31", ghiChu: "Mùa cao điểm" });
  assert.ok(r.ok);
  assert.equal(r.value.kind, "PER_PAX");
  assert.equal(r.value.perPaxAmount, 50_000);
  assert.deepEqual(r.value.theoLoai, { adult: 50_000, child: 30_000, senior: 40_000 });
  assert.equal(r.value.validFrom, "2026-11-01");
  assert.equal(r.value.validTo, "2026-12-31");
  assert.equal(r.value.note, "Mùa cao điểm");
  const rr = kiemThanDoiMuc({ kieu: "RATE", tyLeBp: 1250, tuNgay: "2026-11-01" });
  assert.ok(rr.ok);
  assert.equal(rr.value.rateBp, 1250);
});

test("kiemThanDoiMuc: có doiTuong / phamVi / catalogCode / groupCode trong thân ⇒ lỗi", () => {
  const goc = { kieu: "RATE", tyLeBp: 1000, tuNgay: "2026-11-01" };
  const extras = [{ doiTuong: { loai: "VAI", code: "TRAVEL_AGENCY" } }, { phamVi: "ALL" }, { catalogCode: "TOUR_A" }, { groupCode: "NHOM_A" }];
  for (const e of extras) {
    assert.deepEqual(kiemThanDoiMuc({ ...goc, ...e }), { ok: false, message: "Đổi mức không đổi được đối tượng hay dịch vụ." }, JSON.stringify(e));
  }
});

test("kiemThanDoiMuc: thân sai ⇒ lỗi như thân mức thường", () => {
  assert.equal(kiemThanDoiMuc(null).ok, false);
  assert.equal(kiemThanDoiMuc([]).ok, false);
  assert.equal(kiemThanDoiMuc({ kieu: "RATE", tyLeBp: 99_999, tuNgay: "2026-11-01" }).ok, false);
  assert.equal(kiemThanDoiMuc({ kieu: "RATE", tyLeBp: 100 }).ok, false, "thiếu tuNgay");
});

test("cungMuc: cùng kiểu và số ⇒ true; khác một trong ba số theo loại khách ⇒ false", () => {
  const theoLoai = { adult: 50_000, child: 30_000, senior: 40_000 };
  const dong: DongMuc = { id: "x", targetPartyId: null, targetRoleCode: "A", scope: "ALL", catalogCode: null, groupCode: null, kind: "PER_PAX", rateBp: null, perPaxAmount: 50_000, theoLoai, validFrom: "2026-01-01", validTo: null };
  const goc = { kind: "PER_PAX" as const, rateBp: null, perPaxAmount: 50_000, theoLoai };
  assert.equal(cungMuc(dong, { ...goc, theoLoai: { ...theoLoai } }), true);
  for (const k of ["adult", "child", "senior"] as const) {
    assert.equal(cungMuc(dong, { ...goc, theoLoai: { ...theoLoai, [k]: theoLoai[k] + 1 } }), false, k);
  }
  assert.equal(cungMuc(dong, { ...goc, theoLoai: null }), false);
  assert.equal(cungMuc(dong, { ...goc, perPaxAmount: 60_000 }), false);
  assert.equal(cungMuc(dong, { kind: "RATE", rateBp: 1000, perPaxAmount: null, theoLoai: null }), false);
});
