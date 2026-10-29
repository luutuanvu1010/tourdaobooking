// 7c (LO-TRINH bước 6, 29/10/2026): bộ «Island Booking System — Design System v2» là TẤM GƯƠNG của `public/app.css`.
// Bản chụp bộ trong kho (`docs/superpowers/specs/2026-10-27-danh-gia-ux-tong-the/ds-v2/`) phải khớp mã: token = `:root` (giá trị thật), biến mà bundle và
// bản xem trước dùng có trong bộ, token MỚI của đợt 0 có trong bộ, phần "CHÉP TỪ MÃ" của bundle giống từng ký tự. Đỏ ⇒ đồng bộ lại bộ theo README bộ mục 12
// (`node scripts/sinh-bundle-bo-v2.mjs`, sửa tokens.json, `node scripts/so-bo-v2-voi-ma.mjs`), rồi xuất bản lại bộ trên Claude.
import { test } from "node:test";
import assert from "node:assert/strict";
import { chuanHoa, soBoVoiMa } from "../scripts/so-bo-v2-voi-ma.mjs";

test("bộ v2 khớp mã: 0 lệch không lý do", () => {
  const kq = soBoVoiMa();
  const dong = kq.lech.map((l: { ten: string; ho: string; loai: string; bo?: string; ma?: string }) => `${l.loai}: ${l.ten} (${l.ho})${l.bo !== undefined ? ` bộ ${l.bo}` : ""}${l.ma !== undefined ? ` mã ${l.ma}` : ""}`);
  assert.deepEqual(dong, []);
});

test("token ngoài mã chỉ là bốn token có lý do (ba mốc @media + thanh bên gọn chưa dùng)", () => {
  const ten = soBoVoiMa().ngoaiMa.map((n: { ten: string }) => n.ten).sort();
  assert.deepEqual(ten, ["moc-dien-thoai", "moc-may-tinh", "moc-rong", "w-sidebar-gon"]);
});

test("chuẩn hoá giá trị: rem → px, max/min, calc không đơn vị, số 0 thừa", () => {
  assert.equal(chuanHoa("1.5rem"), "24px");
  assert.equal(chuanHoa("max(16px, 1rem)"), "16px");
  assert.equal(chuanHoa("min(calc(600 + 100), 800)"), "700");
  assert.equal(chuanHoa("rgba(8, 47, 73, 0.10)"), "rgba(8, 47, 73, 0.1)");
  assert.equal(chuanHoa("#0C4A6E"), "#0c4a6e");
});
