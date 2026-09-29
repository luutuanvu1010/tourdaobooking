// Luật thuần của danh sách hành khách (ADR-0047 A2; kế hoạch Task A6). Tên thử là tên GIẢ có đánh dấu, năm sinh hiếm.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_HANH_KHACH_MOI_DON, dongHienHanh, keHoachHanhKhach, kiemDanhSachHanhKhach, kiemHanhKhach, moTaDanhSachNhap, moTaThayDoiKhach, soKhachDoan, vuotSoKhach,
  type DongHanhKhach,
} from "./hanh-khach.ts";

const TODAY = "2026-09-29";
const ctx = { at: "Hành khách 1", today: TODAY };

test("kiemHanhKhach: hợp lệ → chuẩn hoá khoảng trắng (không đổi hoa thường — G6); loại khách trống được", () => {
  const r = kiemHanhKhach({ fullName: "  khách   Dò Tìm   Một ", birthYear: 1990, paxCode: null }, ctx);
  assert.deepEqual(r, { ok: true, value: { id: null, fullName: "khách Dò Tìm Một", birthYear: 1990, paxCode: null } });
  const c = kiemHanhKhach({ id: "11111111-2222-3333-4444-555555555555", fullName: "Bé Dò Tìm", birthYear: 2020, paxCode: "child" }, ctx);
  assert.ok(c.ok);
  assert.equal(c.value.id, "11111111-2222-3333-4444-555555555555");
  assert.equal(c.value.paxCode, "child");
});

test("kiemHanhKhach: tên rỗng / > 100 → lỗi; năm sinh ngoài [năm nay − 120, năm nay] (theo vnToday) → lỗi; không phải số nguyên → lỗi; loại lạ → lỗi", () => {
  const bad: Record<string, unknown>[] = [
    { fullName: "   ", birthYear: 1990 },
    { fullName: "x".repeat(101), birthYear: 1990 },
    { fullName: "A", birthYear: 1905 },
    { fullName: "A", birthYear: 2027 },
    { fullName: "A", birthYear: "1990" },
    { fullName: "A", birthYear: 1990.5 },
    { fullName: "A" },
    { fullName: "A", birthYear: 1990, paxCode: "baby" },
    { fullName: "A", birthYear: 1990, id: "khong-phai-uuid" },
    { fullName: 42, birthYear: 1990 },
  ];
  for (const b of bad) {
    const r = kiemHanhKhach(b, ctx);
    assert.equal(r.ok, false, JSON.stringify(b));
    assert.match(!r.ok ? r.message : "", /^Hành khách 1: /, "câu lỗi tiếng Việt có tiền tố vị trí");
  }
  assert.ok(kiemHanhKhach({ fullName: "A", birthYear: 1906 }, ctx).ok, "biên dưới: 2026 − 120");
  assert.ok(kiemHanhKhach({ fullName: "A", birthYear: 2026 }, ctx).ok, "biên trên: năm nay");
  assert.ok(kiemHanhKhach({ fullName: "A", birthYear: 1906 }, { ...ctx, today: "2026-01-01" }).ok);
});

test("kiemDanhSachHanhKhach: mảng ≤ 200; trùng id → lỗi; không phải mảng → lỗi", () => {
  assert.equal(MAX_HANH_KHACH_MOI_DON, 200);
  const one = { fullName: "Khách Dò Tìm Một", birthYear: 1911, paxCode: null };
  assert.equal(kiemDanhSachHanhKhach(Array.from({ length: 200 }, () => one), TODAY).ok, true);
  const big = kiemDanhSachHanhKhach(Array.from({ length: 201 }, () => one), TODAY);
  assert.equal(big.ok, false);
  assert.match(!big.ok ? big.message : "", /tối đa 200 hành khách/);
  const id = "11111111-2222-3333-4444-555555555555";
  assert.equal(kiemDanhSachHanhKhach([{ ...one, id }, { ...one, id }], TODAY).ok, false);
  assert.equal(kiemDanhSachHanhKhach({}, TODAY).ok, false);
  const bad = kiemDanhSachHanhKhach([one, { fullName: "" , birthYear: 1911 }], TODAY);
  assert.match(!bad.ok ? bad.message : "", /^Hành khách 2: /);
});

/** Chuỗi của một đơn đã xác nhận: A (a1 → a2), B (b1), C (c1 đã huỷ hết). */
const ROWS: DongHanhKhach[] = [
  { id: "a1", personKey: "a1", previousId: null, voided: false, fullName: "Khách Dò Tìm Một", birthYear: 1911, paxCode: "adult", updatedAt: "t1" },
  { id: "a2", personKey: "a1", previousId: "a1", voided: false, fullName: "Khách Dò Tìm Một Sửa", birthYear: 1911, paxCode: "adult", updatedAt: "t2" },
  { id: "b1", personKey: "b1", previousId: null, voided: false, fullName: "Khách Dò Tìm Hai", birthYear: 1922, paxCode: null, updatedAt: "t1" },
  { id: "c1", personKey: "c1", previousId: null, voided: true, fullName: "Khách Dò Tìm Ba", birthYear: 1922, paxCode: null, updatedAt: "t1" },
];
let seq = 0;
const newId = () => `new-${++seq}`;

test("dongHienHanh: mỗi người một dòng hiện hành (chưa huỷ, không có dòng thay thế chưa huỷ); người huỷ hết không có mặt", () => {
  assert.deepEqual(dongHienHanh(ROWS).map((r) => [r.personKey, r.id]), [["a1", "a2"], ["b1", "b1"]]);
});

test("keHoachHanhKhach: thêm = dòng mới person_key = id; sửa = dòng mới trỏ dòng HIỆN HÀNH, cùng person_key; huỷ = MỌI dòng chưa huỷ của người, MỚI trước CŨ sau (R8)", () => {
  seq = 0;
  const r = keHoachHanhKhach(ROWS, {
    them: [{ id: null, fullName: "Khách Mới", birthYear: 1990, paxCode: null }],
    sua: [{ personKey: "b1", fullName: "Khách Dò Tìm Hai Sửa", birthYear: 1922, paxCode: "senior" }],
    huy: ["a1"],
  }, newId);
  assert.ok(r.ok, JSON.stringify(r));
  assert.deepEqual(r.value.chen, [
    { id: "new-1", personKey: "new-1", previousId: null, fullName: "Khách Mới", birthYear: 1990, paxCode: null },
    { id: "new-2", personKey: "b1", previousId: "b1", fullName: "Khách Dò Tìm Hai Sửa", birthYear: 1922, paxCode: "senior" },
  ]);
  assert.deepEqual(r.value.huy, ["a2", "a1"], "mới trước cũ sau");
  assert.deepEqual(r.value.dem, { them: 1, sua: 1, huy: 1 });
});

test("keHoachHanhKhach: sửa y nguyên → không ghi; sửa/huỷ người không có hoặc đã huỷ hết → lỗi; vừa sửa vừa huỷ một người → lỗi; trùng → lỗi", () => {
  const same = keHoachHanhKhach(ROWS, { them: [], sua: [{ personKey: "b1", fullName: "Khách Dò Tìm Hai", birthYear: 1922, paxCode: null }], huy: [] }, newId);
  assert.ok(same.ok);
  assert.deepEqual(same.value, { chen: [], huy: [], dem: { them: 0, sua: 0, huy: 0 } });
  const errs = [
    { them: [], sua: [{ personKey: "zz", fullName: "A", birthYear: 1990, paxCode: null }], huy: [] },
    { them: [], sua: [{ personKey: "c1", fullName: "A", birthYear: 1990, paxCode: null }], huy: [] },
    { them: [], sua: [], huy: ["c1"] },
    { them: [], sua: [], huy: ["zz"] },
    { them: [], sua: [{ personKey: "b1", fullName: "A", birthYear: 1990, paxCode: null }], huy: ["b1"] },
    { them: [], sua: [], huy: ["b1", "b1"] },
    { them: [], sua: [{ personKey: "b1", fullName: "A", birthYear: 1990, paxCode: null }, { personKey: "b1", fullName: "B", birthYear: 1990, paxCode: null }], huy: [] },
  ];
  for (const e of errs) assert.equal(keHoachHanhKhach(ROWS, e, newId).ok, false, JSON.stringify(e));
  const vuot = keHoachHanhKhach(ROWS, { them: Array.from({ length: 199 }, () => ({ id: null, fullName: "A", birthYear: 1990, paxCode: null })), sua: [], huy: [] }, newId);
  assert.equal(vuot.ok, false, "2 người hiện có + 199 > 200");
  assert.equal(keHoachHanhKhach(ROWS, { them: Array.from({ length: 199 }, () => ({ id: null, fullName: "A", birthYear: 1990, paxCode: null })), sua: [], huy: ["b1"] }, newId).ok, true);
});

test("soKhachDoan / vuotSoKhach (R9): so số người có tên với số khách của dịch vụ ĐÔNG NHẤT (không cộng dồn)", () => {
  assert.equal(soKhachDoan([{ adult: 2, child: 1, senior: 0, infant: 0 }, { adult: 2, child: 0, senior: 0, infant: 0 }]), 3);
  assert.equal(soKhachDoan([]), 0);
  assert.equal(vuotSoKhach(3, 2), true);
  assert.equal(vuotSoKhach(3, 3), false);
  assert.equal(vuotSoKhach(0, 0), false);
});

test("moTaThayDoiKhach: ĐÚNG khuôn 'thêm N, sửa N, huỷ N khách' — chỉ số lượng; moTaDanhSachNhap: 'danh sách khách: N người'", () => {
  assert.equal(moTaThayDoiKhach({ them: 2, sua: 0, huy: 1 }), "thêm 2, sửa 0, huỷ 1 khách");
  assert.match(moTaThayDoiKhach({ them: 10, sua: 3, huy: 0 }), /^thêm \d+, sửa \d+, huỷ \d+ khách$/);
  assert.equal(moTaDanhSachNhap(3), "danh sách khách: 3 người");
});
