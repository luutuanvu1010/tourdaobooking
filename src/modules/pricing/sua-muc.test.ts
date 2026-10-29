// ADR-0148 Đ1 lượt 1, Task 4 — luật THUẦN của nút «Sửa» (và phần vá «Đổi» / «Ngừng») ở src/modules/pricing/rules.ts. Kế hoạch docs/superpowers/plans/2026-10-29-sua-muc-luot-1-ke-hoach.md
// Q2 (ngày sớm nhất), Q3 (một đường Sửa: huỷ–thay hoặc từ ngày), Q4 (vá Đổi / Ngừng), Q5 (dòng huỷ–thay, dòng hết hạn). «Hôm nay» do nơi gọi truyền.
import { test } from "node:test";
import assert from "node:assert/strict";
import { kiemDoi, kiemNgung, kiemSua, ngaySomNhat, xemTruocSua } from "./rules.ts";

const HN = "2026-10-29";
const LY_DO = "Nhập sai giá đại lý của vé tiêu chuẩn";
const cu = (validFrom: string, validTo: string | null = null, daHuy = false) => ({ validFrom, validTo, daHuy });
const sua = (o: { cu: ReturnType<typeof cu>; tu: string; den?: string | null; ngayChup?: string | null; lyDo?: unknown; giongSo?: boolean }) =>
  kiemSua({ cu: o.cu, moi: { validFrom: o.tu, validTo: o.den ?? null }, ngayChup: o.ngayChup ?? null, homNay: HN, lyDo: o.lyDo === undefined ? LY_DO : o.lyDo, giongSo: o.giongSo ?? false });

test("ngaySomNhat (Q2) = lớn nhất của hôm nay, ngày chụp gần nhất + 1, ngày bắt đầu dòng cũ + 1", () => {
  assert.equal(ngaySomNhat({ homNay: HN, ngayChup: null, validFrom: "2026-01-01" }), HN);
  assert.equal(ngaySomNhat({ homNay: HN, ngayChup: "2026-10-20", validFrom: "2026-01-01" }), HN);
  assert.equal(ngaySomNhat({ homNay: HN, ngayChup: HN, validFrom: "2026-01-01" }), "2026-10-30", "đã có đơn chụp hôm nay ⇒ từ ngày mai (Hiến chương 5.6)");
  assert.equal(ngaySomNhat({ homNay: HN, ngayChup: null, validFrom: HN }), "2026-10-30", "dòng bắt đầu hôm nay ⇒ từ ngày mai (như «Đổi»)");
  assert.equal(ngaySomNhat({ homNay: HN, ngayChup: null, validFrom: "2027-01-01" }), "2027-01-02");
});

test("ví dụ chủ (tiêu chí 1): dòng 2027-01-01 → 2028-01-01 chưa có đơn ⇒ huỷ và thay, sửa được cả hai ngày", () => {
  const c = cu("2027-01-01", "2028-01-01");
  assert.deepEqual(xemTruocSua({ cu: c, ngayChup: null, homNay: HN }), { ok: true, duong: "HUY_THAY" });
  assert.deepEqual(sua({ cu: c, tu: "2027-01-01", den: "2028-01-01" }), { ok: true, duong: "HUY_THAY", lyDo: LY_DO }, "giữ hai ngày, đổi số");
  assert.deepEqual(sua({ cu: c, tu: "2027-02-01", den: "2027-12-31" }), { ok: true, duong: "HUY_THAY", lyDo: LY_DO }, "đổi hai ngày");
  assert.deepEqual(sua({ cu: c, tu: HN, den: "2027-12-31" }), { ok: true, duong: "HUY_THAY", lyDo: LY_DO }, "bắt đầu từ hôm nay");
  assert.deepEqual(sua({ cu: c, tu: "2027-01-01", den: "2028-01-01", giongSo: true }), { ok: false, error: "Chưa có gì thay đổi so với mức cũ." });
});

test("huỷ–thay (Q5): ngày bắt đầu mới ≥ hôm nay, hoặc đúng ngày bắt đầu cũ (giữ phần ngày đã qua cho Chụp bù)", () => {
  const c = cu("2026-10-01");
  assert.equal(sua({ cu: c, tu: "2026-10-01" }).ok, true, "giữ ngày bắt đầu cũ (đã qua)");
  assert.equal(sua({ cu: c, tu: HN }).ok, true);
  const r = sua({ cu: c, tu: "2026-10-15" });
  assert.equal(r.ok, false);
  assert.match((r as { error: string }).error, /không được trước hôm nay/);
});

test("dòng đã có đơn chụp (tiêu chí 2): phần sửa áp từ ngày sớm nhất; dòng cũ đóng hết ngày liền trước", () => {
  const c = cu("2026-10-01");
  assert.deepEqual(xemTruocSua({ cu: c, ngayChup: "2026-10-20", homNay: HN }), { ok: true, duong: "TU_NGAY", tuNgaySomNhat: HN, denNgayToiDa: null });
  assert.deepEqual(sua({ cu: c, tu: HN, ngayChup: "2026-10-20" }), { ok: true, duong: "TU_NGAY", denNgayCu: "2026-10-28", tuNgay: HN, lyDo: LY_DO });
  assert.deepEqual(sua({ cu: c, tu: "2026-11-15", den: "2026-12-31", ngayChup: "2026-10-20" }), { ok: true, duong: "TU_NGAY", denNgayCu: "2026-11-14", tuNgay: "2026-11-15", lyDo: LY_DO });
  const truoc = sua({ cu: c, tu: "2026-10-28", ngayChup: "2026-10-20" });
  assert.equal(truoc.ok, false);
  assert.match((truoc as { error: string }).error, /Đã có đơn dùng mức này — phần sửa chỉ áp được từ ngày 29\/10\/2026/);
  assert.deepEqual(sua({ cu: c, tu: HN, ngayChup: "2026-10-20", giongSo: true }), { ok: false, error: "Phần sửa giống hệt mức cũ." });
});

test("đã có đơn chụp HÔM NAY ⇒ phần sửa từ ngày mai; dòng bắt đầu hôm nay ⇒ từ ngày mai", () => {
  assert.deepEqual(xemTruocSua({ cu: cu("2026-10-01"), ngayChup: HN, homNay: HN }), { ok: true, duong: "TU_NGAY", tuNgaySomNhat: "2026-10-30", denNgayToiDa: null });
  assert.equal(sua({ cu: cu("2026-10-01"), tu: HN, ngayChup: HN }).ok, false);
  assert.deepEqual(sua({ cu: cu(HN), tu: "2026-10-30", ngayChup: HN }), { ok: true, duong: "TU_NGAY", denNgayCu: HN, tuNgay: "2026-10-30", lyDo: LY_DO });
});

test("dòng đã có ngày kết thúc vẫn sửa được (tiêu chí 2); phần sửa phải bắt đầu trong khoảng ngày của dòng cũ; hết chỗ thì từ chối rõ", () => {
  const c = cu("2026-10-01", "2026-12-31");
  assert.deepEqual(xemTruocSua({ cu: c, ngayChup: "2026-10-20", homNay: HN }), { ok: true, duong: "TU_NGAY", tuNgaySomNhat: HN, denNgayToiDa: "2026-12-31" });
  assert.deepEqual(sua({ cu: c, tu: "2026-11-01", den: "2027-06-30", ngayChup: "2026-10-20" }), { ok: true, duong: "TU_NGAY", denNgayCu: "2026-10-31", tuNgay: "2026-11-01", lyDo: LY_DO }, "kéo dài bằng dòng mới");
  assert.equal(sua({ cu: c, tu: "2026-12-31", ngayChup: "2026-10-20" }).ok, true, "bắt đầu đúng ngày kết thúc cũ: dòng cũ đóng hết 30/12");
  const sau = sua({ cu: c, tu: "2027-01-01", ngayChup: "2026-10-20" });
  assert.equal(sau.ok, false);
  assert.match((sau as { error: string }).error, /phải bắt đầu trong khoảng ngày của mức cũ/);
  assert.deepEqual(sua({ cu: c, tu: "2026-11-01", den: "2026-12-31", ngayChup: "2026-10-20", giongSo: true }), { ok: false, error: "Phần sửa giống hệt mức cũ." });
  // Kết thúc hôm nay và đã có đơn chụp hôm nay: không còn ngày nào để sửa (X = ngày mai > ngày kết thúc).
  const het = xemTruocSua({ cu: cu("2026-10-01", HN), ngayChup: HN, homNay: HN });
  assert.equal(het.ok, false);
  assert.match((het as { error: string }).error, /không còn ngày nào để sửa/);
});

test("dòng hết hạn, dòng đã huỷ, lý do thiếu / ngắn / chứa số điện thoại ⇒ từ chối (tiêu chí 4)", () => {
  assert.deepEqual(xemTruocSua({ cu: cu("2026-01-01", "2026-10-28"), ngayChup: null, homNay: HN }), { ok: false, error: "Mức này đã hết hạn nên không sửa được. Thêm mức mới nếu cần." });
  assert.deepEqual(xemTruocSua({ cu: cu("2027-01-01", null, true), ngayChup: null, homNay: HN }), { ok: false, error: "Dòng này đã huỷ — sửa dòng thay cho nó." });
  for (const lyDo of [undefined, null, "", "   ", "ngắn quá", 123]) {
    const r = kiemSua({ cu: cu("2027-01-01", "2028-01-01"), moi: { validFrom: "2027-01-01", validTo: "2028-01-01" }, ngayChup: null, homNay: HN, lyDo, giongSo: false });
    assert.deepEqual(r, { ok: false, error: "Ghi lý do sửa (ít nhất 10 ký tự)." }, String(lyDo));
  }
  assert.deepEqual(sua({ cu: cu("2027-01-01"), tu: "2027-01-01", lyDo: "x".repeat(301) }), { ok: false, error: "Lý do tối đa 300 ký tự." });
  assert.equal(sua({ cu: cu("2027-01-01"), tu: "2027-01-01", lyDo: "Đại lý gọi 0905123456 báo sai" }).ok, false);
  assert.deepEqual(sua({ cu: cu("2027-01-01"), tu: "2027-01-01", lyDo: `  ${LY_DO}  ` }), { ok: true, duong: "HUY_THAY", lyDo: LY_DO }, "cắt khoảng trắng");
});

test("Đổi (Q4): như cũ, thêm điều kiện sau ngày chụp gần nhất", () => {
  const d = (ngayChup: string | null, tuNgay: string) => kiemDoi({ cu: { validFrom: "2026-10-01", validTo: null }, tuNgay, homNay: HN, ngayChup });
  assert.deepEqual(d(null, HN), { ok: true, denNgayCu: "2026-10-28", tuNgay: HN });
  assert.deepEqual(d("2026-10-20", HN), { ok: true, denNgayCu: "2026-10-28", tuNgay: HN });
  const r = d(HN, HN);
  assert.equal(r.ok, false, "đã có đơn chụp hôm nay ⇒ không đổi được từ hôm nay");
  assert.match((r as { error: string }).error, /từ ngày 30\/10\/2026/);
  assert.deepEqual(d(HN, "2026-10-30"), { ok: true, denNgayCu: HN, tuNgay: "2026-10-30" });
});

test("Ngừng (Q4): dòng chưa có đơn chụp — như cũ (≥ ngày bắt đầu); đã có đơn chụp — không trước ngày chụp gần nhất, không trước hôm qua; dòng có ngày kết thúc chỉ rút ngắn", () => {
  const n = (c: ReturnType<typeof cu>, denNgay: string, ngayChup: string | null = null) => kiemNgung({ raw: { denNgay }, cu: c, ngayChup, homNay: HN });
  assert.deepEqual(n(cu("2026-10-01"), "2026-10-01"), { ok: true, value: "2026-10-01" }, "chưa chụp: đóng lùi tới ngày bắt đầu như cũ");
  assert.equal(n(cu("2026-10-01"), "2026-09-30").ok, false);
  assert.deepEqual(n(cu("2026-10-01"), "2026-10-20", "2026-10-20"), { ok: false, message: "Đã có đơn dùng mức này tới ngày 20/10/2026 — ngày kết thúc sớm nhất là 28/10/2026." }, "đã chụp 20/10: sàn = hôm qua");
  assert.deepEqual(n(cu("2026-10-01"), "2026-10-28", "2026-10-20"), { ok: true, value: "2026-10-28" });
  assert.equal(n(cu("2026-10-01"), "2026-10-28", HN).ok, false, "đã chụp hôm nay: sàn = hôm nay");
  assert.deepEqual(n(cu("2026-10-01"), HN, HN), { ok: true, value: HN });
  assert.deepEqual(n(cu("2026-10-01", "2026-12-31"), "2026-11-30"), { ok: true, value: "2026-11-30" }, "rút ngắn dòng đã có ngày kết thúc");
  assert.deepEqual(n(cu("2026-10-01", "2026-12-31"), "2026-12-31"), { ok: false, message: "Ngày kết thúc mới phải sớm hơn ngày kết thúc hiện tại (31/12/2026)." });
  assert.deepEqual(n(cu("2026-10-01", null, true), "2026-12-31"), { ok: false, message: "Dòng này đã huỷ — sửa dòng thay cho nó." });
  assert.deepEqual(n(cu("2026-10-01", "2026-10-20"), "2026-10-10"), { ok: false, message: "Mức này đã hết hạn nên không ngừng được." }, "ADR-0148 Đ1.3: chỉ rút ngắn ngày kết thúc CHƯA QUA");
  assert.deepEqual(n(cu("2026-10-01", "2026-10-28"), "2026-10-20"), { ok: false, message: "Mức này đã hết hạn nên không ngừng được." }, "kết thúc hôm qua = đã qua");
  assert.deepEqual(n(cu("2026-10-01", HN), "2026-10-20"), { ok: true, value: "2026-10-20" }, "kết thúc hôm nay = chưa qua");
});
