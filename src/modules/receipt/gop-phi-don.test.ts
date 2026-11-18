// Biên nhận khách lẻ gộp phí đưa đón vào giá (ADR-0218 Đ3; kế hoạch Task 10): chạy HẾT `bien_nhan_khach_le.cac_ca` của sổ vàng `golden/phi-dua-don-gia-goc.json` (7 ca, chủ đã xác nhận), thêm bất biến cho mọi ca
// (tổng dòng in = tạm tính, tổng từng phần = số của phần, không chữ «Phí đưa đón» ở bất kỳ đâu khi đang gộp — cả `ReceiptDto` lẫn ảnh xác nhận), rồi phủ năm nhóm khoảng trống của sổ bằng bài dẫn điều ADR.
// Dữ liệu tự dựng, không tên thật.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dungBienNhan } from "./rules.ts";
import { buildConfirmation } from "../../shared/order-confirmation.ts";
import { thanhTienDong } from "../../shared/order-lines.ts";

const g = JSON.parse(readFileSync(new URL("../../../golden/phi-dua-don-gia-goc.json", import.meta.url), "utf8"));
const MO_TA_LOAI: Record<string, [string, string]> = { NGUOI_LON: ["adult", "Người lớn"], TRE_EM: ["child", "Trẻ em"], CAO_TUOI: ["senior", "Người cao tuổi"], EM_BE: ["infant", "Em bé"] };
const COMPANY = { name: "Công ty Thử", taxCode: "0000000000", address: "Địa chỉ thử", hotline: "0900000000", email: "thu@example.com" };

type PhiCa = { chieu: "OUT" | "RETURN"; xe_rieng: boolean; don_gia: number; so_luong: number };
type DvCa = { ma: string; nguoi_ban: "TOUR_DAO" | "NCC_KHAC"; dong: { loai: string; so_luong: number; don_gia: number }[]; phi: PhiCa[]; don_vi?: string };
const tenDv = (ma: string): string => g.gia_goc[ma]?.ten ?? ma;

/** Đơn dựng từ đầu vào của ca (đủ trường mà `dungBienNhan` đọc). */
function donTuCa(dichVu: DvCa[]): any {
  const services = dichVu.map((d) => {
    const pax: Record<string, number> = { adult: 0, child: 0, senior: 0, infant: 0 };
    for (const l of d.dong) pax[MO_TA_LOAI[l.loai]![0]]! += l.so_luong;
    return {
      id: d.ma, kind: "catalog", catalogCode: d.ma, name: tenDv(d.ma), unit: d.don_vi ?? "perPax", pax, departDate: null, departTime: null, pickupTime: null, pickupPlace: null, checkinDate: null, checkinTime: null, checkinPlace: null,
      items: d.dong.map((l, i) => ({ id: `${d.ma}-${i}`, paxCode: MO_TA_LOAI[l.loai]![0], description: MO_TA_LOAI[l.loai]![1], detail: null, quantity: l.so_luong, unitPrice: l.don_gia, catalogPrice: l.don_gia, lineTotal: thanhTienDong({ quantity: l.so_luong, unitPrice: l.don_gia }) })),
      legs: [],
    };
  });
  const dongPhi = dichVu.flatMap((d) => d.phi.map((p, i) => ({
    id: `${d.ma}-p${i}`, legId: `${d.ma}-l${i}`, serviceId: d.ma, direction: p.chieu, zoneCode: null, zoneName: null, loaiChon: null, nguon: "GIA_GOC", tenChuongTrinh: null, lyDoDoi: null, kind: p.xe_rieng ? "PER_TRIP" : "PER_PAX",
    returnPax: null, quantity: p.so_luong, unitPrice: p.don_gia, lineTotal: thanhTienDong({ quantity: p.so_luong, unitPrice: p.don_gia }), description: "Phí đưa đón",
  })));
  const dichVuTien = services.reduce((t, s) => t + s.items.reduce((u: number, i: any) => u + i.lineTotal, 0), 0);
  const phi = dongPhi.reduce((t, d) => t + d.lineTotal, 0);
  return {
    id: "o1", orderCode: "TD-1", status: "confirmed", deliveredAt: null, completedAt: null, createdAt: "2026-12-01T00:00:00.000Z", bookerLaDoiTac: false, customerName: "Khách Thử", customerPhone: "0900000000", customerEmail: null, customerNote: null,
    subtotal: dichVuTien + phi, discount: 0, giamGiaHieuLuc: 0, total: dichVuTien + phi, services, phiDuaDon: dongPhi.length ? { dong: dongPhi, thieu: [], duKien: false } : null,
  };
}
const banTu = (dichVu: DvCa[]) => ({
  chup: dichVu.filter((d) => d.nguoi_ban === "NCC_KHAC").map((d) => ({ serviceId: d.ma, cungUng: { status: "SET", sellerPartyId: "ncc" } })) as any,
  ten: new Map([["ncc", "Nhà cung cấp khác"]]), congTyChuId: "ct",
});
const receipt = (dichVu: DvCa[], o: { mau?: "noi_bo" | "doi_tac"; hienRieng?: boolean } = {}) => {
  const order = donTuCa(dichVu);
  if (o.mau === "doi_tac") order.bookerLaDoiTac = true;
  return { order, r: dungBienNhan(order, COMPANY as any, { daTra: 0, conLai: order.total }, banTu(dichVu), false, o.hienRieng ?? false) };
};
/** «in_ra» của sổ vàng: dòng dịch vụ (kể cả trọn gói), dòng đưa đón của nhà cung cấp khác, dòng phí riêng. */
function inRa(r: any) {
  const dong: any[] = [];
  for (const s of r.services) for (const it of s.items) {
    if (it.tronGoi) dong.push({ mo_ta: `${s.name} (trọn gói, gồm đưa đón)`, so_luong_khach: it.tronGoi.soKhach, don_gia: null, thanh_tien: it.lineTotal });
    else dong.push({ mo_ta: `${s.name} — ${it.description}`, so_luong: it.quantity, don_gia: it.unitPrice, thanh_tien: it.lineTotal });
  }
  return dong;
}
const dongDuaDon = (r: any): any[] => (r.dongDuaDonTourDao ?? []).map((d: any) => ({ mo_ta: d.description, thanh_tien: d.lineTotal }));
const dongPhiRieng = (r: any): any[] => (r.phiDuaDon ?? []).map((d: any) => ({ mo_ta: d.description, so_luong: d.quantity, don_gia: d.unitPrice, thanh_tien: d.lineTotal }));
const coChuPhi = (r: any): boolean => /Phí đưa đón/.test(JSON.stringify(r)) || /Phí đưa đón/.test(JSON.stringify(buildConfirmation(r, null)));
const tongInRa = (r: any): number => r.services.reduce((t: number, s: any) => t + s.items.reduce((u: number, it: any) => u + it.lineTotal, 0), 0) + (r.phiDuaDon ?? []).reduce((t: number, d: any) => t + d.lineTotal, 0) + (r.dongDuaDonTourDao ?? []).reduce((t: number, d: any) => t + d.lineTotal, 0);
const bat = (r: any) => {
  assert.equal(tongInRa(r), r.subtotal, "tổng các dòng in ra = tạm tính");
  assert.equal(r.phan.reduce((t: number, p: any) => t + p.tong, 0), r.total, "Σ tổng từng phần = tổng cộng");
  assert.equal(r.subtotal, r.total, "tiền của đơn không đổi");
};

const caDaXacNhan = g.bien_nhan_khach_le.cac_ca;
const dauVaoCa = (ca: any): { dichVu: DvCa[]; hienRieng: boolean; mau: "noi_bo" | "doi_tac" } => {
  const goc = ca.dau_vao.giong_ca ? caDaXacNhan.find((c: any) => c.ma === ca.dau_vao.giong_ca).dau_vao : ca.dau_vao;
  return { dichVu: goc.dich_vu, hienRieng: ca.dau_vao.cong_tac_hien_rieng === true, mau: ca.dau_vao.mau === "doi_tac" ? "doi_tac" : "noi_bo" };
};

test("sổ vàng: mọi ca BN-xx da_xac_nhan ⇒ dòng in ra, chữ «Phí đưa đón» và tạm tính khớp ĐÚNG TỪNG ĐỒNG; bất biến tổng cho mọi ca", () => {
  let n = 0;
  for (const ca of caDaXacNhan) {
    assert.equal(ca.xac_nhan.trang_thai, "da_xac_nhan", ca.ma);
    const { dichVu, hienRieng, mau } = dauVaoCa(ca);
    const { r } = receipt(dichVu, { mau, hienRieng });
    bat(r);
    assert.equal(r.subtotal, ca.dap_an.tam_tinh, `${ca.ma} tạm tính`);
    assert.equal(coChuPhi(r), ca.dap_an.co_chu_phi_dua_don, `${ca.ma} chữ «Phí đưa đón»`);
    if (ca.dap_an.phan) {
      // BN-07: phần Tour Đảo = Tour A gộp + dòng «Tour B — đưa đón»; phần nhà cung cấp chỉ 800.000
      assert.deepEqual(r.phan.map((p: any) => p.tong), ca.dap_an.phan.map((p: any) => p.tong_phan), `${ca.ma} tổng phần`);
      const td = ca.dap_an.phan[0].in_ra;
      assert.deepEqual([...inRa(r).filter((d: any) => d.mo_ta.startsWith("Tour A")), ...dongDuaDon(r)].map((d) => [d.mo_ta, d.thanh_tien]), td.map((d: any) => [d.mo_ta, d.thanh_tien]), `${ca.ma} phần Tour Đảo`);
      assert.deepEqual(inRa(r).filter((d: any) => d.mo_ta.startsWith("Tour B")).map((d) => [d.mo_ta, d.thanh_tien]), ca.dap_an.phan[1].in_ra.map((d: any) => [d.mo_ta, d.thanh_tien]), `${ca.ma} phần nhà cung cấp`);
      assert.ok(!r.phan[1].dichVu.some((t: string) => /đưa đón/.test(t)), "tên dòng đưa đón không nằm ở phần nhà cung cấp");
    } else if (ca.dap_an.in_ra) {
      const mong = ca.dap_an.in_ra.map((d: any) => ({ ...d }));
      const that = [...inRa(r), ...dongPhiRieng(r)];
      assert.equal(that.length, mong.length, `${ca.ma} số dòng in ra`);
      mong.forEach((m: any, i: number) => {
        const t = that[i]!;
        assert.equal(t.mo_ta, m.mo_ta, `${ca.ma}#${i} mô tả`);
        assert.equal(t.thanh_tien, m.thanh_tien, `${ca.ma}#${i} thành tiền`);
        if ("don_gia" in m) assert.equal(t.don_gia, m.don_gia, `${ca.ma}#${i} đơn giá`);
        if ("so_luong" in m) assert.equal(t.so_luong, m.so_luong, `${ca.ma}#${i} số lượng`);
        if ("so_luong_khach" in m) assert.equal(t.so_luong_khach, m.so_luong_khach, `${ca.ma}#${i} số khách`);
      });
    }
    n++;
  }
  assert.equal(n, 7);
});

// ---- khoảng trống 5: biên nhận ----
const dv = (ma: string, dong: DvCa["dong"], phi: PhiCa[], o: Partial<DvCa> = {}): DvCa => ({ ma, nguoi_ban: "TOUR_DAO", dong, phi, ...o });
const NL = (so_luong: number, don_gia: number) => ({ loai: "NGUOI_LON", so_luong, don_gia });
const di = (so_luong: number, don_gia = 10_000): PhiCa => ({ chieu: "OUT", xe_rieng: false, don_gia, so_luong });

test("khoảng trống · người cao tuổi và trẻ em được cộng phí vào đơn giá (em bé giữ nguyên); mọi thành tiền qua thanhTienDong", () => {
  const { r } = receipt([dv("TOUR_A", [NL(1, 1_000_000), { loai: "CAO_TUOI", so_luong: 2, don_gia: 800_000 }, { loai: "TRE_EM", so_luong: 1, don_gia: 500_000 }, { loai: "EM_BE", so_luong: 1, don_gia: 0 }], [di(4)])]);
  bat(r);
  assert.deepEqual(r.services[0]!.items.map((i: any) => [i.description, i.unitPrice, i.lineTotal]), [["Người lớn", 1_010_000, 1_010_000], ["Người cao tuổi", 810_000, 1_620_000], ["Trẻ em", 510_000, 510_000], ["Em bé", 0, 0]]);
  assert.equal(coChuPhi(r), false);
});

test("khoảng trống · dịch vụ nhà cung cấp khác kèm XE RIÊNG ⇒ vẫn một dòng «<tên> — đưa đón» ở phần Tour Đảo, phần nhà cung cấp không đổi", () => {
  const b = dv("TOUR_B", [NL(2, 400_000)], [{ chieu: "OUT", xe_rieng: true, don_gia: 300_000, so_luong: 1 }], { nguoi_ban: "NCC_KHAC" });
  const { r } = receipt([dv("TOUR_A", [NL(1, 1_000_000)], [di(1)]), b]);
  bat(r);
  assert.deepEqual(r.dongDuaDonTourDao, [{ description: "Tour B — đưa đón", lineTotal: 300_000 }]);
  assert.deepEqual(r.services[1]!.items.map((i: any) => i.lineTotal), [800_000]);
  assert.deepEqual(r.phan.map((p: any) => p.tong), [1_010_000 + 300_000, 800_000]);
  assert.ok(r.phan[0].dichVu.includes("Tour B — đưa đón") && !r.phan[0].dichVu.includes("Phí đưa đón"));
  assert.equal(coChuPhi(r), false);
});

test("khoảng trống · một đơn vừa có dịch vụ chia đều vừa có dịch vụ trọn gói (xe riêng, chiều về ít khách, theo nhóm, nhập tay) ⇒ mỗi dịch vụ một cách; tổng đúng", () => {
  const { r } = receipt([
    dv("TOUR_A", [NL(2, 1_000_000)], [di(2)]),
    dv("TOUR_C", [NL(2, 700_000)], [{ chieu: "OUT", xe_rieng: true, don_gia: 200_000, so_luong: 1 }]),
    dv("TOUR_D", [NL(3, 500_000)], [di(3), { chieu: "RETURN", xe_rieng: false, don_gia: 10_000, so_luong: 2 }]),
    dv("TOUR_E", [NL(2, 900_000)], [di(2)], { don_vi: "per4Pax" }),
    dv("TOUR_F", [NL(2, 100_000)], [di(2)], { don_vi: "manual" }),
  ]);
  bat(r);
  assert.deepEqual(r.services[0]!.items.map((i: any) => i.unitPrice), [1_010_000]);
  assert.ok(!r.services[0]!.items[0]!.tronGoi);
  for (const k of [1, 2, 3, 4]) assert.ok(r.services[k]!.items.length === 1 && r.services[k]!.items[0]!.tronGoi, `dịch vụ ${k} trọn gói`);
  assert.deepEqual(r.services[1]!.items[0]!.lineTotal, 1_400_000 + 200_000);
  assert.deepEqual(r.services[2]!.items[0]!.lineTotal, 1_500_000 + 30_000 + 20_000);
  assert.equal(r.services[2]!.items[0]!.tronGoi!.soKhach, 3);
  assert.equal(coChuPhi(r), false);
});

test("khoảng trống · công tắc «Hiện riêng» BẬT cùng nhiều người bán ⇒ dòng phí riêng như cũ, không «<tên> — đưa đón», phần Tour Đảo ghi «Phí đưa đón»; tiền không đổi", () => {
  const b = dv("TOUR_B", [NL(2, 400_000)], [di(2)], { nguoi_ban: "NCC_KHAC" });
  const { r } = receipt([dv("TOUR_A", [NL(1, 1_000_000)], [di(1)]), b], { hienRieng: true });
  bat(r);
  assert.equal(r.dongDuaDonTourDao, undefined);
  assert.deepEqual(r.phiDuaDon!.map((d: any) => [d.description, d.lineTotal]), [["Phí đưa đón", 10_000], ["Phí đưa đón", 20_000]]);
  assert.ok(r.phan[0].dichVu.includes("Phí đưa đón"));
  assert.equal(r.services[0]!.items[0]!.unitPrice, 1_000_000);
  assert.equal(coChuPhi(r), true);
});

test("ảnh xác nhận đơn gửi khách lẻ (buildConfirmation): dòng trọn gói không in đơn giá, khối «Đưa đón (phần Tour Đảo)» có dòng của nhà cung cấp khác; không có «Phí đưa đón» hay «(dự kiến)» của khối phí", () => {
  const b = dv("TOUR_B", [NL(2, 400_000)], [di(2)], { nguoi_ban: "NCC_KHAC" });
  const { r } = receipt([dv("TOUR_A", [NL(2, 1_000_000)], [{ chieu: "OUT", xe_rieng: true, don_gia: 300_000, so_luong: 1 }]), b]);
  r.phiDuKien = true; // dù đơn nháp: bản gộp không in «dự kiến» của khối phí
  const m = buildConfirmation(r, null);
  const khoi = m.blocks.filter((k: any) => k.kind === "service") as any[];
  const tron = khoi[0].lines[0];
  assert.deepEqual([tron.description, tron.quantity, tron.unitPrice, tron.lineTotal], ["Trọn gói, gồm đưa đón", "2", "", "2.300.000 ₫"]);
  const dd = khoi.find((k) => k.name === "Đưa đón (phần Tour Đảo)");
  assert.deepEqual(dd.lines.map((l: any) => [l.description, l.lineTotal]), [["Tour B — đưa đón", "20.000 ₫"]]);
  assert.ok(!khoi.some((k) => /Phí đưa đón/.test(k.name)));
  assert.doesNotMatch(JSON.stringify(m), /Phí đưa đón|dự kiến/);
});

test("mẫu đối tác (HD-02-DT) ⇒ KHÔNG gộp: phí vẫn là dòng riêng, dịch vụ giữ đơn giá gốc (BN-06)", () => {
  const { r } = receipt([dv("TOUR_A", [NL(1, 1_000_000)], [di(1)])], { mau: "doi_tac" });
  assert.equal(r.mau, "doi_tac");
  assert.equal(r.services[0]!.items[0]!.unitPrice, 1_000_000);
  assert.equal(r.phiDuaDon!.length, 1);
  assert.equal(coChuPhi(r), true);
});
