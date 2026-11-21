// SỔ VÀNG GIÁ MÙA VỤ (Hiến chương 5.17; đề xuất ADR-0229 — chưa duyệt). Đọc thẳng `gia-mua-vu.so-vang.json` (Kế toán xác nhận), không chép số vào đây.
// CỐ Ý ĐỎ («đỏ trước»): hàm thuần `./gia-mua-vu.ts` CHƯA viết — chờ (1) chủ duyệt ADR-0229 (ba câu đã trả lời 21/11), (2) nhánh ADR-0218
// vào bản chính. Nhánh này KHÔNG được đưa vào `npm run day-len` khi tệp này còn đỏ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { coSoHoaHong, kiemChongNgay, kiemQuyTacMoi, tinhGiaMuaVu, type QuyTacMuaVu } from "./gia-mua-vu.ts";
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

test("sổ vàng: giá ra luôn ≥ giá gốc và soTang = gia − giaGoc (chỉ tăng)", () => {
  for (const c of SO.tinhGia) {
    if (c.giaGoc === null) continue;
    assert.ok(c.gia !== null && c.gia >= c.giaGoc, c.ca);
    assert.equal(c.soTang, c.gia - c.giaGoc, c.ca);
  }
});
