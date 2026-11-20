// Luật thuần «Ngừng bán theo ngày» (ADR-0220 Đ1, Đ2).
import { test } from "node:test";
import assert from "node:assert/strict";
import { cauNgungBanNgay, docKhoangMoi, trungNgungBanNgay, type KhoangNgungBan } from "./ngung-ban-ngay-rules.ts";

const DV: KhoangNgungBan = { id: "k1", scope: "SERVICE", catalogCode: "T3D", groupCode: null, fromDate: "2026-12-25", toDate: "2027-01-05" };
const NH: KhoangNgungBan = { id: "k2", scope: "GROUP", catalogCode: null, groupCode: "gdao", fromDate: "2026-12-30", toDate: "2026-12-31" };
const d = (catalogCode: string | null, ngay: string | null, nhom: string | null = null) => ({ catalogCode, nhom, ngay, name: "Tour 3 đảo" });

test("trúng khi ngày khởi hành nằm trong khoảng, gồm cả hai đầu; ngoài khoảng thì không", () => {
  const xet = (ngay: string) => trungNgungBanNgay({ khoang: [DV], dong: [d("T3D", ngay)] }).length;
  assert.deepEqual(["2026-12-24", "2026-12-25", "2026-12-28", "2027-01-05", "2027-01-06"].map(xet), [0, 1, 1, 1, 0]);
});

test("dòng nhập tay, dòng chưa có ngày, mã khác: không bị xét", () => {
  assert.deepEqual(trungNgungBanNgay({ khoang: [DV], dong: [d(null, "2026-12-28"), d("T3D", null), d("T3D", ""), d("KHAC", "2026-12-28")] }), []);
});

test("khoảng theo nhóm phủ dịch vụ đang thuộc nhóm; dịch vụ chưa phân loại hoặc nhóm khác thì không", () => {
  const r = trungNgungBanNgay({ khoang: [NH], dong: [d("A", "2026-12-30", "gdao"), d("B", "2026-12-30", "gkhac"), d("C", "2026-12-30", null)] });
  assert.deepEqual(r.map((x) => x.viTri), [0]);
});

test("thứ tự kết quả theo dòng đơn; mỗi dịch vụ xét theo ngày của CHÍNH nó", () => {
  const r = trungNgungBanNgay({ khoang: [DV, NH], dong: [d("X", "2026-12-31", "gdao"), d("T3D", "2026-12-20"), d("T3D", "2026-12-26")] });
  assert.deepEqual(r.map((x) => [x.viTri, x.khoangId]), [[0, "k2"], [2, "k1"]]);
});

test("câu báo nêu tên và khoảng ngày có năm; khoảng một ngày nói «ngày»", () => {
  assert.equal(cauNgungBanNgay({ name: "Tour 3 đảo", fromDate: "2026-12-25", toDate: "2027-01-05" }), "Tour 3 đảo ngừng bán từ 25/12/2026 đến 05/01/2027.");
  assert.equal(cauNgungBanNgay({ name: "Tour 3 đảo", fromDate: "2026-12-25", toDate: "2026-12-25" }), "Tour 3 đảo ngừng bán ngày 25/12/2026.");
});

test("đọc thân: đủ thì nhận; thiếu phạm vi, mã, ngày, ngày ngược, ngày cuối đã qua, ghi chú dài: từ chối", () => {
  const HN = "2026-11-20";
  const tot = { phamVi: "SERVICE", ma: " T3D ", tuNgay: "2026-12-25", denNgay: "2027-01-05", ghiChu: " Tàu bảo dưỡng " };
  assert.deepEqual(docKhoangMoi(tot, HN), { ok: true, value: { scope: "SERVICE", ma: "T3D", tuNgay: "2026-12-25", denNgay: "2027-01-05", ghiChu: "Tàu bảo dưỡng" } });
  assert.equal(docKhoangMoi({ ...tot, tuNgay: "2026-11-01", denNgay: HN }, HN).ok, true, "khoảng đã bắt đầu nhưng ngày cuối là hôm nay: nhận");
  for (const sai of [{ phamVi: "ALL" }, { ma: "" }, { ma: 5 }, { tuNgay: "25/12/2026" }, { denNgay: undefined }, { denNgay: "2026-12-24" }, { tuNgay: "2026-11-01", denNgay: "2026-11-19" }, { ghiChu: "x".repeat(201) }, { ghiChu: 7 }])
    assert.equal(docKhoangMoi({ ...tot, ...sai }, HN).ok, false, JSON.stringify(sai));
  assert.equal(docKhoangMoi(null, HN).ok, false);
});
