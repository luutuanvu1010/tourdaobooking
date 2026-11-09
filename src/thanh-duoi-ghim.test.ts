// ADR-0187 Đ2.3 — tự chọn nút thanh dưới điện thoại. Luật thuần ở src/shared/muc-giao-dien.ts: ghimDuoc (CÙNG hàm cho máy chủ, danh sách chọn ở trang Tôi
// và bộ lọc lúc vẽ), ghimHieuLuc, docGhim, kiemGhim, thanhTab(n, ghim). Đặc tả: docs/superpowers/specs/2026-11-09-ghim-nut-thanh-duoi-design.md §5.
import { test } from "node:test";
import assert from "node:assert/strict";
import { PERMISSION_CODES, type PermissionCode } from "./shared/permissions.ts";
import { GHIM_TOI_DA, KHOA_GHIM, TRANG, docGhim, ghimDuoc, ghimHieuLuc, kiemGhim, luaChonGhim, moTrang, thanhTab } from "./shared/muc-giao-dien.ts";

const ai = (...permissions: PermissionCode[]) => ({ id: "u1", permissions });
const nhan = (t: { nhan: string }[]) => t.map((x) => x.nhan);

test("mặc định không đổi: không chọn gì / mảng rỗng ⇒ đúng như thanhTab cũ (Bán hàng + Kế toán vẫn mất Sổ công nợ như đo 9/11)", () => {
  const s = ai("SALES", "ACCOUNTING");
  assert.deepEqual(nhan(thanhTab({ staff: s })), ["Trang chủ", "Đơn hàng", "Tạo đơn", "Danh bạ", "Tôi"]);
  assert.deepEqual(thanhTab({ staff: s }, []), thanhTab({ staff: s }));
  assert.deepEqual(thanhTab({ staff: s }, null), thanhTab({ staff: s }));
});

test("tiêu chí 1: Bán hàng + Kế toán chọn Sổ công nợ ⇒ thanh dưới có Sổ công nợ (bỏ qua chiKhi của dòng), Tôi luôn cuối", () => {
  const s = ai("SALES", "ACCOUNTING");
  const t = thanhTab({ staff: s }, ["trangChu", "donHang", "taoDon", "soCongNo"]);
  assert.deepEqual(nhan(t), ["Trang chủ", "Đơn hàng", "Tạo đơn", "Sổ công nợ", "Tôi"]);
  assert.equal(t.find((x) => x.trang === "soCongNo")?.bieuTuong, "lock");
  assert.equal(t.find((x) => x.trang === "soCongNo")?.href, TRANG.soCongNo.duong);
});

test("tiêu chí 7: trang đã chọn nay không mở được (bị bỏ Kế toán) ⇒ bỏ nút đó lúc vẽ; lọc xong rỗng ⇒ về mặc định", () => {
  const s = ai("SALES");
  assert.deepEqual(nhan(thanhTab({ staff: s }, ["soCongNo", "donHang"])), ["Đơn hàng", "Tôi"]);
  assert.deepEqual(thanhTab({ staff: s }, ["soCongNo"]), thanhTab({ staff: s }));
});

test("khung tạm (bản nhớ khung) luôn vẽ mặc định, kể cả khi có danh sách", () => {
  const k = { admin: false, seesAll: true, office: true, canCreate: true };
  assert.deepEqual(thanhTab({ khungNho: k }, ["soCongNo"]), thanhTab({ khungNho: k }));
});

test("ghimDuoc = có dòng THANH_TAB, khác Tôi, hien VÀ moTrang — moTrang một mình KHÔNG đủ (Sổ công nợ không khai moTrang)", () => {
  const ban = ai("SALES");
  assert.equal(moTrang("soCongNo", ban), true, "moTrang một mình cho qua — vì thế không được dùng làm cổng");
  assert.equal(ghimDuoc("soCongNo", ban), false);
  assert.equal(ghimDuoc("soCongNo", ai("ACCOUNTING")), true);
  assert.equal(ghimDuoc("toi", ban), false);
  assert.equal(ghimDuoc("nhatKy", ai("SUPER_ADMIN")), false, "trang không có dòng THANH_TAB (chưa có biểu tượng) không chọn được");
  assert.equal(ghimDuoc("khongCo", ban), false);
  assert.ok(!KHOA_GHIM.includes("toi"));
  assert.equal(GHIM_TOI_DA, 4);
});

test("trên MỌI tập quyền: mỗi nút vẽ từ danh sách chọn đều là trang mở được, tối đa 5 nút, Tôi cuối; danh sách chọn = đúng các trang ghimDuoc", () => {
  for (let mask = 0; mask < 1 << PERMISSION_CODES.length; mask++) {
    const s = { id: "u", permissions: PERMISSION_CODES.filter((_, i) => mask & (1 << i)) };
    const t = thanhTab({ staff: s }, KHOA_GHIM);
    assert.ok(t.length <= 5);
    assert.equal(t.at(-1)?.trang, "toi");
    for (const x of t.slice(0, -1)) assert.ok(TRANG[x.trang].hien(s) && moTrang(x.trang, s), `${s.permissions.join("+")}: ${x.trang}`);
    assert.deepEqual(luaChonGhim(s).map((x) => x.trang), KHOA_GHIM.filter((k) => ghimDuoc(k, s)));
  }
});

test("docGhim: bỏ khoá lạ, trùng, Tôi, giữ thứ tự, tối đa 4", () => {
  assert.deepEqual(docGhim(null), []);
  assert.deepEqual(docGhim(""), []);
  assert.deepEqual(docGhim("soCongNo,xyz,donHang,soCongNo,toi,taoDon,danhBa,thietLap"), ["soCongNo", "donHang", "taoDon", "danhBa"]);
});

test("ghimHieuLuc: đang xem như vai trò khác ⇒ null; không có ô me.favorites.write (Tài xế đối tác) ⇒ null; còn lại danh sách đã lưu", () => {
  assert.deepEqual(ghimHieuLuc({ ...ai("SALES"), thanhDuoi: ["donHang"] }), ["donHang"]);
  assert.equal(ghimHieuLuc({ ...ai("SALES"), thanhDuoi: ["donHang"], actingRole: "SALES" }), null);
  assert.equal(ghimHieuLuc({ ...ai("DRIVER_PARTNER"), thanhDuoi: ["donHang"] }), null);
  assert.equal(ghimHieuLuc(ai("SALES")), null);
});

test("kiemGhim (máy chủ): thân hỏng / quá 4 / trùng / khoá lạ / Tôi ⇒ 400; trang không mở được ⇒ 403; hợp lệ ⇒ danh sách", () => {
  const s = ai("SALES", "ACCOUNTING");
  const loi = (v: unknown) => { const r = kiemGhim(v, s); return "loi" in r ? r.loi.status : 0; };
  assert.equal(loi(null), 400);
  assert.equal(loi({}), 400);
  assert.equal(loi({ trang: "soCongNo" }), 400);
  assert.equal(loi({ trang: [1] }), 400);
  assert.equal(loi({ trang: ["donHang", "donHang"] }), 400);
  assert.equal(loi({ trang: ["toi"] }), 400);
  assert.equal(loi({ trang: ["xyz"] }), 400);
  assert.equal(loi({ trang: ["trangChu", "donHang", "taoDon", "soCongNo", "danhBa"] }), 400);
  assert.equal(loi({ trang: ["thietLap"] }), 403, "Thiết lập chỉ cho người có admin.manage");
  const ok = kiemGhim({ trang: ["soCongNo", "donHang"] }, s);
  assert.deepEqual("trang" in ok ? ok.trang : null, ["soCongNo", "donHang"]);
  const rong = kiemGhim({ trang: [] }, s);
  assert.deepEqual("trang" in rong ? rong.trang : null, []);
  const r = kiemGhim({ trang: ["soCongNo"] }, ai("SALES"));
  assert.ok("loi" in r && /không mở được/.test(r.loi.message), "câu tiếng Việt");
});
