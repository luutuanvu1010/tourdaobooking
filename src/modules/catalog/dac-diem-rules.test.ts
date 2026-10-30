// Luật thuần «Đặc điểm dịch vụ» (ADR-0152 Đ1, Đ5; kế hoạch 2026-10-30 T2). Dữ liệu tự tạo; tên đặc điểm chỉ là ví dụ — mã không biết đặc điểm nào.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MA_DAC_DIEM_RE,
  MA_GIA_TRI_RE,
  MOI_THEO_NHOM_SO_NGAY,
  chuaKhai,
  kiemTenDacDiem,
  kiemTenGiaTri,
  maDacDiemMoi,
  maGiaTriMoi,
  moiTheoNhom,
} from "./dac-diem-rules.ts";

test("tên đặc điểm / giá trị: cắt khoảng trắng; rỗng, chỉ khoảng trắng, > 40 ký tự, không phải chữ → câu lỗi tiếng Việt", () => {
  assert.deepEqual(kiemTenDacDiem("  Vận chuyển cảng–đảo "), { ok: true, value: "Vận chuyển cảng–đảo" });
  assert.deepEqual(kiemTenGiaTri("Gồm"), { ok: true, value: "Gồm" });
  for (const [f, chu] of [[kiemTenDacDiem, "đặc điểm"], [kiemTenGiaTri, "giá trị"]] as const) {
    for (const sai of ["", "   ", "x".repeat(41), 5, null, undefined]) {
      const r = f(sai);
      assert.equal(r.ok, false, JSON.stringify(sai));
      if (!r.ok) assert.match(r.message, new RegExp(`^Tên ${chu}`), r.message);
    }
    assert.equal(f("x".repeat(40)).ok, true, "đúng 40 ký tự được");
  }
});

test("mã máy sinh: đặc điểm `a` + 12 hex, giá trị `v` + 12 hex (khác tiền tố `g` của nhóm — hàng rào (l1)); không trùng", () => {
  const a = new Set(Array.from({ length: 50 }, maDacDiemMoi));
  const v = new Set(Array.from({ length: 50 }, maGiaTriMoi));
  assert.equal(a.size, 50);
  assert.equal(v.size, 50);
  for (const m of a) assert.match(m, MA_DAC_DIEM_RE);
  for (const m of v) assert.match(m, MA_GIA_TRI_RE);
  assert.doesNotMatch("g0123456789ab", MA_DAC_DIEM_RE);
  assert.doesNotMatch("a0123456789ab", MA_GIA_TRI_RE);
});

const DV = [
  { code: "D1", inSheet: true, hidden: false, firstSeenAt: "2026-09-01T00:00:00.000Z" },
  { code: "D2", inSheet: true, hidden: false, firstSeenAt: "2026-09-01T00:00:00.000Z" },
  { code: "AN", inSheet: true, hidden: true, firstSeenAt: "2026-10-30T00:00:00.000Z" }, // bị ẩn
  { code: "ROI", inSheet: false, hidden: false, firstSeenAt: "2026-10-30T00:00:00.000Z" }, // đã rời Sheet
  { code: "MOI", inSheet: true, hidden: false, firstSeenAt: "2026-10-30T01:00:00.000Z" },
];

test("Đ5 «chưa khai»: dịch vụ đang bán (trong Sheet, không ẩn) không có giá trị hiệu lực cho ĐÚNG đặc điểm đó; ẩn / rời Sheet không vào", () => {
  const hl = [
    { catalogCode: "D1", attributeCode: "aX", source: "SERVICE" as const },
    { catalogCode: "D2", attributeCode: "aY", source: "GROUP" as const },
  ];
  assert.deepEqual(chuaKhai(DV, hl, "aX"), ["D2", "MOI"], "D2 có aY nhưng chưa có aX");
  assert.deepEqual(chuaKhai(DV, hl, "aY"), ["D1", "MOI"]);
  assert.deepEqual(chuaKhai(DV, [], "aZ"), ["D1", "D2", "MOI"]);
});

test("Đ5 «mới, đang theo nhóm»: first_seen_at trong 14 ngày (tính cả hôm nay, giờ Việt Nam) VÀ giá trị lấy từ nhóm; biên 14 ngày", () => {
  assert.equal(MOI_THEO_NHOM_SO_NGAY, 14);
  const homNay = "2026-10-30";
  const dv = [
    { code: "N0", inSheet: true, hidden: false, firstSeenAt: "2026-10-29T17:30:00.000Z" }, // 00:30 ngày 30/10 giờ VN — hôm nay
    { code: "N13", inSheet: true, hidden: false, firstSeenAt: "2026-10-17T05:00:00.000Z" }, // 17/10 = hôm nay − 13 → còn trong 14 ngày
    { code: "N14", inSheet: true, hidden: false, firstSeenAt: "2026-10-16T05:00:00.000Z" }, // 16/10 = hôm nay − 14 → ngoài
    { code: "N14b", inSheet: true, hidden: false, firstSeenAt: "2026-10-16T16:59:59.000Z" }, // 23:59 ngày 16/10 giờ VN → ngoài
    { code: "NR", inSheet: true, hidden: false, firstSeenAt: "2026-10-30T01:00:00.000Z" }, // mới nhưng giá trị RIÊNG
    { code: "NA", inSheet: true, hidden: true, firstSeenAt: "2026-10-30T01:00:00.000Z" }, // mới, theo nhóm, nhưng bị ẩn
  ];
  const hl = [
    ...["N0", "N13", "N14", "N14b", "NA"].map((c) => ({ catalogCode: c, attributeCode: "aX", source: "GROUP" as const })),
    { catalogCode: "NR", attributeCode: "aX", source: "SERVICE" as const },
    { catalogCode: "N0", attributeCode: "aY", source: "GROUP" as const },
  ];
  assert.deepEqual(moiTheoNhom(dv, hl, homNay), [
    { catalogCode: "N0", attributeCode: "aX" },
    { catalogCode: "N0", attributeCode: "aY" },
    { catalogCode: "N13", attributeCode: "aX" },
  ]);
});
