// SỔ VÀNG GIÁ MÙA VỤ (Hiến chương 5.17; đề xuất ADR-0229 — chưa duyệt). Đọc thẳng `gia-mua-vu.so-vang.json` (Kế toán xác nhận), không chép số vào đây.
// CỐ Ý ĐỎ («đỏ trước»): hàm thuần `./gia-mua-vu.ts` CHƯA viết — chờ (1) chủ duyệt ADR-0229 và trả lời câu 2 (thứ tự tính, làm tròn), (2) nhánh ADR-0218
// vào bản chính. Nhánh này KHÔNG được đưa vào `npm run day-len` khi tệp này còn đỏ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { kiemChongNgay, kiemQuyTacMoi, tinhGiaMuaVu, type QuyTacMuaVu } from "./gia-mua-vu.ts";

type CaGia = { ca: string; moTa: string; giaGoc: number | null; maDichVu: string; maNhom: string | null; ngayDi: string | null; gia: number | null; quyTacId: string | null; soTang: number };
type CaQuyTac = { ca: string; vao: { phanTram: number; soTien: number; tu: string; den: string }; loi: string | null };
type CaChong = { ca: string; moTa: string; moi: { phamVi: "SERVICE" | "GROUP"; ma: string; tu: string; den: string }; trung: string | null };
const SO = JSON.parse(readFileSync(new URL("./gia-mua-vu.so-vang.json", import.meta.url), "utf8")) as {
  quyTac: QuyTacMuaVu[];
  tinhGia: CaGia[];
  kiemQuyTacMoi: { tranPhanTram: number; homNay: string; ca: CaQuyTac[] };
  kiemChongNgay: CaChong[];
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

test("sổ vàng: giá ra luôn ≥ giá gốc và soTang = gia − giaGoc (chỉ tăng)", () => {
  for (const c of SO.tinhGia) {
    if (c.giaGoc === null) continue;
    assert.ok(c.gia !== null && c.gia >= c.giaGoc, c.ca);
    assert.equal(c.soTang, c.gia - c.giaGoc, c.ca);
  }
});
