// Luật bố cục ảnh vé Tour Đảo (ADR-0175 Đ1.7; đặc tả 2026-11-05-lenh-ve-mau-ve-claude-design.md mục «RÀNG BUỘC KỸ THUẬT» và «Vé từng khách»).
import assert from "node:assert/strict";
import { test } from "node:test";
import { CAU_KHONG_PHAI_HOA_DON, CO_CHU_TOI_THIEU, KHO_VE, QR_TOI_THIEU_PX, VIEN_TRANG_TOI_THIEU_PX, boCucVeTourDao, oQrChoVe, type DoChu, type NoiDungVe } from "./ve-anh-tour-dao-bo-cuc.ts";
import { taoMaVeTourDao } from "./ma-ve-tour-dao.ts";

/** Bộ đo giả bi quan: mỗi ký tự rộng 0,62 cỡ chữ (chữ in đậm tiếng Việt thật hẹp hơn). */
const doGia: DoChu = (chu, coPx) => chu.length * coPx * 0.62;
const MA = taoMaVeTourDao(() => new Uint8Array(16).map((_, i) => i * 7 + 3));
const ND: NoiDungVe = { tenCongTy: "Công ty TNHH Tour Đảo", hotline: "0000 000 000", tenDichVu: "Tour 4 đảo Nha Trang", tenDichVuEn: "Nha Trang 4-Island Tour", nhomKhach: "ADULT", denNgay: "2026-12-31", ma: MA };
const LE = 72;

test("ô QR: vùng mã ≥ 520 px, viền trắng ≥ 40 px, cả khung mã nằm ở nửa trên và trong bề ngang vé", () => {
  for (const n of [21, 25, 29, 33, 37]) {
    const o = oQrChoVe(n);
    assert.ok(n * o >= QR_TOI_THIEU_PX, `n=${n}: vùng mã ${n * o}`);
    assert.ok(4 * o >= VIEN_TRANG_TOI_THIEU_PX, `n=${n}: viền ${4 * o}`);
    const b = boCucVeTourDao(ND, n, doGia);
    assert.equal(b.qr.o, o);
    assert.equal(b.qr.canh, o * (n + 8), "khung = mã + 4 ô lề trắng mỗi bên (veMaQr vẽ đúng cỡ này)");
    assert.ok(b.qr.y + b.qr.canh <= KHO_VE.cao / 2, `n=${n}: đáy khung ${b.qr.y + b.qr.canh} quá nửa vé`);
    assert.ok(b.qr.x >= 0 && b.qr.x + b.qr.canh <= KHO_VE.rong, `n=${n}: tràn ngang`);
    assert.equal(b.qr.x, Math.round((KHO_VE.rong - b.qr.canh) / 2), "mã ở giữa");
  }
});

test("không chữ nào đè lên khung mã QR", () => {
  const b = boCucVeTourDao(ND, 29, doGia);
  for (const d of b.dong) {
    const tren = d.y - d.coPx; // đường cơ sở trừ cỡ chữ ≈ đỉnh chữ
    const duoi = d.y + Math.ceil(d.coPx * 0.3);
    assert.ok(duoi <= b.qr.y || tren >= b.qr.y + b.qr.canh, `«${d.chu}» đè lên mã`);
  }
  assert.ok(b.logo.y + b.logo.canh <= b.qr.y, "logo không đè mã");
});

test("chữ nhỏ nhất 28 px; dòng tiếng Anh nhỏ hơn dòng tiếng Việt cùng cặp, nằm ngay bên dưới", () => {
  const b = boCucVeTourDao(ND, 29, doGia);
  for (const d of b.dong) assert.ok(d.coPx >= CO_CHU_TOI_THIEU, `«${d.chu}» cỡ ${d.coPx}`);
  const cap = new Map<string, { vi: number[]; en: number[]; yVi: number; yEn: number }>();
  for (const d of b.dong) {
    if (d.ngonNgu === "chung") continue;
    const c = cap.get(d.nhom) ?? { vi: [], en: [], yVi: 0, yEn: Infinity };
    c[d.ngonNgu].push(d.coPx);
    if (d.ngonNgu === "vi") c.yVi = Math.max(c.yVi, d.y);
    else c.yEn = Math.min(c.yEn, d.y);
    cap.set(d.nhom, c);
  }
  for (const [nhom, c] of cap) {
    assert.ok(c.vi.length > 0 && c.en.length > 0, `${nhom}: thiếu một thứ tiếng`);
    assert.ok(Math.max(...c.en) < Math.min(...c.vi), `${nhom}: tiếng Anh phải nhỏ hơn`);
    assert.ok(c.yEn > c.yVi, `${nhom}: tiếng Anh phải ở dưới`);
  }
  assert.deepEqual([...cap.keys()].sort(), ["dichVu", "hoaDon", "loaiVe", "motLan", "nhomKhach", "soVe", "thoiHan"].sort());
});

test("nội dung đúng mẫu «Vé từng khách»: có tên công ty, hotline (không dịch), số vé 4 ký tự cuối, câu không phải hóa đơn", () => {
  const b = boCucVeTourDao(ND, 29, doGia);
  const chu = b.dong.map((d) => d.chu);
  for (const can of ["Công ty TNHH Tour Đảo", "Hotline 0000 000 000", "Vé dịch vụ", "Service ticket", "Tour 4 đảo Nha Trang", "Nha Trang 4-Island Tour", "Người lớn", "Adult",
    `Số vé …${MA.slice(-4)}`, `Ticket no. …${MA.slice(-4)}`, CAU_KHONG_PHAI_HOA_DON.vi, CAU_KHONG_PHAI_HOA_DON.en]) assert.ok(chu.includes(can), `thiếu «${can}»`);
  const tat = chu.join(" ");
  assert.match(tat, /Dùng vào ngày đi đã đặt\. Hạn cuối 31\/12\/2026/);
  assert.match(tat, /Valid on your booked date\. Expires 31\/12\/2026/);
  assert.match(tat, /Mỗi vé dùng một lần\. Xuất trình mã cho nhân viên Tour Đảo\./);
  assert.match(tat, /Single use\. Show this code to Tour Đảo staff\./);
  assert.equal(chu.filter((c) => c === "Công ty TNHH Tour Đảo").length, 1);
  assert.equal(chu.filter((c) => c === "Hotline 0000 000 000").length, 1);
});

test("không in mã đầy đủ, mã kỹ thuật, giá tiền", () => {
  const b = boCucVeTourDao(ND, 29, doGia);
  const tat = b.dong.map((d) => d.chu).join("\n");
  assert.ok(!tat.includes(MA), "mã đầy đủ lộ trên vé");
  assert.ok(!tat.includes("TD1."), "tiền tố mã lộ trên vé");
  assert.ok(!tat.includes(MA.slice(4, 12)), "một đoạn mã ngoài 4 ký tự cuối lộ trên vé");
  assert.doesNotMatch(tat, /VNĐ|VND|\bđ\b|₫|ADULT|CHILD|SENIOR|TOUR_DAO/);
});

test("bốn loại khách đều có hai thứ tiếng", () => {
  const ky: Record<NoiDungVe["nhomKhach"], [string, string]> = { ADULT: ["Người lớn", "Adult"], CHILD: ["Trẻ em", "Child"], SENIOR: ["Cao tuổi", "Senior"], ALL: ["Mọi loại khách", "All guests"] };
  for (const [nhom, [vi, en]] of Object.entries(ky) as [NoiDungVe["nhomKhach"], [string, string]][]) {
    const chu = boCucVeTourDao({ ...ND, nhomKhach: nhom }, 29, doGia).dong.map((d) => d.chu);
    assert.ok(chu.includes(vi) && chu.includes(en), nhom);
  }
});

test("không có tên tiếng Anh của dịch vụ: dòng dịch vụ chỉ tiếng Việt, các dòng khác vẫn hai thứ tiếng", () => {
  const b = boCucVeTourDao({ ...ND, tenDichVuEn: null }, 29, doGia);
  assert.equal(b.dong.filter((d) => d.nhom === "dichVu" && d.ngonNgu === "en").length, 0);
  assert.ok(b.dong.some((d) => d.nhom === "dichVu" && d.ngonNgu === "vi"));
  assert.ok(b.dong.some((d) => d.nhom === "hoaDon" && d.ngonNgu === "en"));
  const rong = boCucVeTourDao({ ...ND, tenDichVuEn: "   " }, 29, doGia);
  assert.equal(rong.dong.filter((d) => d.nhom === "dichVu" && d.ngonNgu === "en").length, 0, "chỉ khoảng trắng coi như để trống");
});

test("tên rất dài vẫn nằm gọn trong vé: cắt dòng theo bề ngang, tối đa số dòng, thêm dấu …", () => {
  const dai = "Tour ngắm san hô và lặn biển trọn ngày kèm bữa trưa hải sản trên bè nổi ".repeat(6).trim();
  const b = boCucVeTourDao({ ...ND, tenCongTy: "Công ty Trách nhiệm hữu hạn Du lịch Biển Đảo Tour Đảo Nha Trang Khánh Hòa", tenDichVu: dai, tenDichVuEn: dai }, 33, doGia);
  for (const d of b.dong) {
    const w = doGia(d.chu, d.coPx, d.dam);
    const trai = d.canh === "center" ? d.x - w / 2 : d.x;
    assert.ok(trai >= LE - 1 && trai + w <= KHO_VE.rong - LE + 1, `«${d.chu.slice(0, 30)}…» tràn ngang (${Math.round(trai)}..${Math.round(trai + w)})`);
  }
  assert.ok(b.dayNoiDung <= KHO_VE.cao - 48, `nội dung tràn đáy: ${b.dayNoiDung}`);
  const dv = b.dong.filter((d) => d.nhom === "dichVu" && d.ngonNgu === "vi");
  assert.ok(dv.length <= 3, "tên dịch vụ tối đa 3 dòng");
  assert.ok(dv[dv.length - 1]!.chu.endsWith("…"), "bị cắt thì có dấu …");
  assert.ok(b.dong.filter((d) => d.nhom === "dichVu" && d.ngonNgu === "en").length <= 2, "tên tiếng Anh tối đa 2 dòng");
});

test("ngày hạn cuối sai dạng thì báo lỗi, không vẽ ngày lạ", () => {
  assert.throws(() => boCucVeTourDao({ ...ND, denNgay: "31/12/2026" }, 29, doGia));
});
