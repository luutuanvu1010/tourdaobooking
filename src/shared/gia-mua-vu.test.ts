// SỔ VÀNG GIÁ MÙA VỤ (Hiến chương 5.17; đề xuất ADR-0229 — chưa duyệt). Đọc thẳng `gia-mua-vu.so-vang.json` (Kế toán xác nhận), không chép số vào đây.
// CỐ Ý ĐỎ («đỏ trước»): hàm thuần `./gia-mua-vu.ts` CHƯA viết — ADR-0229 chủ đã duyệt 22/11; chờ (1) Kế toán xác nhận sổ vàng, (2) nhánh ADR-0218
// vào bản chính. Nhánh này KHÔNG được đưa vào `npm run day-len` khi tệp này còn đỏ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chonQuyTac, coSoHoaHong, cungMua, doanMuaVu, kiemChongNgay, kiemQuyTacMoi, tinhGiaMuaVu, type QuyTacMuaVu } from "./gia-mua-vu.ts";
import { hoaHongDong } from "./hoa-hong-dong.ts";

type CaGia = { ca: string; moTa: string; giaGoc: number | null; maDichVu: string; maNhom: string | null; ngayDi: string | null; gia: number | null; quyTacId: string | null; soTang: number };
type CaQuyTac = { ca: string; vao: { phanTram: number; soTien: number; tu: string; den: string }; loi: string | null };
type CaHoaHong = {
  ca: string; moTa: string; dong: { donGia: number; soTang: number | null; soLuong: number }[]; kieu: "RATE" | "PER_PAX"; rateBp: number | null; perPax: number | null;
  soKhachTinh: number; thanhTien: number; coSoHoaHong: number; hoaHong: number; giaDaiLy: number; tranGiamGia?: number;
};
type CaChong = { ca: string; moTa: string; moi: { phamVi: "SERVICE" | "GROUP"; ma: string; tu: string; den: string }; trung: string | null };
const SO = JSON.parse(readFileSync(new URL("./gia-mua-vu.so-vang.json", import.meta.url), "utf8")) as {
  quyTac: QuyTacMuaVu[];
  tinhGia: CaGia[];
  kiemQuyTacMoi: { tranPhanTram: number; homNay: string; ca: CaQuyTac[] };
  kiemChongNgay: CaChong[];
  hoaHong: { ca: CaHoaHong[] };
  cungMua: { ca: { ca: string; moTa: string; quyTacDaChup: string | null; maDichVu: string; maNhom: string | null; ngayMoi: string; cungMua: boolean }[] };
};

for (const c of SO.tinhGia) {
  test(`sổ vàng ${c.ca}: ${c.moTa}`, () => {
    const kq = tinhGiaMuaVu({ giaGoc: c.giaGoc, maDichVu: c.maDichVu, maNhom: c.maNhom, ngayDi: c.ngayDi, quyTac: SO.quyTac });
    assert.deepEqual(kq, { gia: c.gia, quyTacId: c.quyTacId, soTang: c.soTang });
  });
}

for (const c of SO.kiemQuyTacMoi.ca) {
  test(`quy tắc mới ${c.ca}: ${c.loi ?? "hợp lệ"}`, () => {
    assert.equal(kiemQuyTacMoi(c.vao, { tranPhanTram: SO.kiemQuyTacMoi.tranPhanTram, homNay: SO.kiemQuyTacMoi.homNay }), c.loi);
  });
}

for (const c of SO.kiemChongNgay) {
  test(`chồng ngày ${c.ca}: ${c.moTa}`, () => {
    assert.equal(kiemChongNgay(c.moi, SO.quyTac), c.trung);
  });
}

// Chủ 21/11 câu 10a: đại lý KHÔNG hưởng hoa hồng trên phần tăng. Cơ sở hoa hồng theo % bỏ phần tăng; hoa hồng tính bằng hàm có sẵn `hoaHongDong`; giá đại lý = thành tiền − hoa hồng.
for (const c of SO.hoaHong.ca) {
  test(`hoa hồng ${c.ca}: ${c.moTa}`, () => {
    const thanhTien = c.dong.reduce((s, d) => s + d.donGia * d.soLuong, 0);
    assert.equal(thanhTien, c.thanhTien);
    const coSo = coSoHoaHong(c.dong);
    assert.equal(coSo, c.coSoHoaHong);
    const hoaHong = hoaHongDong({ kind: c.kieu, rateBp: c.rateBp, perPaxAmount: c.perPax, thanhTien: coSo, soKhachTinh: c.soKhachTinh });
    assert.equal(hoaHong, c.hoaHong);
    assert.equal(thanhTien - hoaHong, c.giaDaiLy);
    // Đơn một dịch vụ: trần giảm giá của đại lý = tổng hoa hồng (ADR-0079 điều 8) — trần thấp xuống trong mùa.
    if (c.tranGiamGia !== undefined) assert.equal(hoaHong, c.tranGiamGia);
  });
}

// ADR-0229 Đ6: «cùng mùa» theo bản chụp khi đổi ngày đơn đã chụp.
for (const c of SO.cungMua.ca) {
  test(`cùng mùa ${c.ca}: ${c.moTa}`, () => {
    assert.equal(cungMua({ quyTacDaChup: c.quyTacDaChup, maDichVu: c.maDichVu, maNhom: c.maNhom, ngayMoi: c.ngayMoi, quyTac: SO.quyTac }), c.cungMua);
  });
}

test("sổ vàng: giá ra luôn ≥ giá gốc và soTang = gia − giaGoc (chỉ tăng)", () => {
  for (const c of SO.tinhGia) {
    if (c.giaGoc === null) continue;
    assert.ok(c.gia !== null && c.gia >= c.giaGoc, c.ca);
    assert.equal(c.soTang, c.gia - c.giaGoc, c.ca);
  }
});

// ADR-0229 Đ7: đoạn ngày cho form khớp TỪNG NGÀY với chonQuyTac của máy chủ (cùng bộ quy tắc R1–R5).
test("doanMuaVu khớp chonQuyTac từng ngày (Tour 3 đảo, Tour 4 đảo, Vé cano, nhóm khác)", () => {
  const ke = (n: string, b: number) => { const d = new Date(`${n}T00:00:00.000Z`); d.setUTCDate(d.getUTCDate() + b); return d.toISOString().slice(0, 10); };
  for (const [ma, nhom] of [["T3D", "TOUR_DAO"], ["T4D", "TOUR_DAO"], ["VE_CANO", "CANO"], ["KS1", "KHACH_SAN"]] as const) {
    const doan = doanMuaVu({ maDichVu: ma, maNhom: nhom, quyTac: SO.quyTac, tuNgay: "2027-01-20" });
    for (let ngay = "2027-01-20"; ngay <= "2027-03-10"; ngay = ke(ngay, 1)) {
      const d = doan.find((x) => x.tu <= ngay && ngay <= x.den);
      assert.equal(d?.quyTac.id ?? null, chonQuyTac({ maDichVu: ma, maNhom: nhom, ngayDi: ngay, quyTac: SO.quyTac })?.id ?? null, `${ma} ${ngay}`);
    }
  }
  assert.deepEqual(doanMuaVu({ maDichVu: "T3D", maNhom: "TOUR_DAO", quyTac: SO.quyTac, tuNgay: "2027-01-20" }).map((d) => [d.tu, d.den, d.quyTac.id]), [
    ["2027-02-01", "2027-02-09", "R1"], ["2027-02-10", "2027-02-12", "R2"], ["2027-02-13", "2027-02-15", "R1"],
  ]);
});
