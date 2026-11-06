// Bảng tham chiếu ngôn ngữ (ADR-0167): máy canh sáu điều kiện đỏ. Phần đầu thử từng phép kiểm bằng dữ liệu mẫu; phần sau chạy trên mã thật.
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
// @ts-expect-error — tệp .mjs không có kiểu
import { kiemDuong, kiemHuongDan, kiemKhaiNiem, kiemKhongDungChuLoai, kiemNguonTen, kiemNoiDat, kiemTenLacCho, kiemTenNhieuHang, kiemUngVien, renderBangThamChieu } from "../scripts/bang-tham-chieu-lib.mjs";
// @ts-expect-error — tệp .mjs không có kiểu
import { chuanNhan, duongTrongMa, khoaNut, lietKeNut, tenHuongDan, toanChu } from "../scripts/quet-nut-lib.mjs";
import { AUDIT_ACTIONS } from "./shared/audit-actions.ts";
import { CAM_THEO_TEP, TU_DA_LOAI } from "./shared/bang-tu-giao-dien.ts";
import { PERMISSION_LABEL } from "./shared/permissions.ts";
import { NHAN_DANG_CHO_XAC_NHAN, STATUS_LABEL } from "./shared/order-status-label.ts";
import { CHU_DUNG_CHUNG, KHAI_NIEM, TEN_NHIEU_HANG } from "./shared/bang-tham-chieu-khai-niem.ts";
import { BO_QUA, VIEC_QUAN_TRONG } from "./shared/bang-tham-chieu-viec.ts";
import type { ChuDungChung, KhaiNiem, MucBoQua, ViecQuanTrong } from "./shared/bang-tham-chieu.ts";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");

type Nut = { kenh: string; tep: string; dong: number; nhan: string[]; doiChu: string[]; aria: string; action: string; id: string; lyDo: string[]; api: string[]; ghi: string[] };
const nut = (tep: string, nhan: string[], lyDo: string[] = [], dong = 10): Nut => ({ kenh: "button", tep, dong, nhan, doiChu: [], aria: "", action: "", id: "", lyDo, api: [], ghi: [] });
const viec = (ten: string, noiDat: { tep: string; chu: string }[], rieng: Partial<ViecQuanTrong> = {}): ViecQuanTrong => ({
  nhom: "N", manHinh: "M", ten, thatSuLam: "x", hoiLai: "không", hoanTac: "không", duongLenh: [], maNhatKy: [], noiDat, trangThai: "da-chot", nguonTen: "thử", ...rieng,
});

test("chuanNhan bỏ ký hiệu đầu; khoaNut nối nhãn bằng « / », nút không chữ dùng aria, action, id", () => {
  assert.equal(chuanNhan("＋ Thêm"), "Thêm");
  assert.equal(chuanNhan("✓  Lưu   đơn"), "Lưu đơn");
  assert.equal(khoaNut(nut("a", ["＋ Thêm", "Sửa"])), "Thêm / Sửa");
  assert.equal(khoaNut({ nhan: [], aria: "Đóng", action: "", id: "" }), "aria:Đóng");
  assert.equal(khoaNut({ nhan: [], aria: "", action: "xoa", id: "" }), "action:xoa");
  assert.equal(khoaNut({ nhan: [], aria: "", action: "", id: "kia" }), "id:kia");
  assert.equal(khoaNut({ nhan: [], aria: "", action: "", id: "" }), "không-chữ");
});

test("điều 1: nút đã khai phải mang đúng tên", () => {
  const v = [viec("Gửi kiểm vé", [{ tep: "web/a.ts", chu: "Gửi kiểm vé" }])];
  const loi = kiemNoiDat(v, [nut("web/a.ts", ["Gửi xác nhận"])]);
  assert.equal(loi.length, 1);
  assert.match(loi[0], /web\/a\.ts/);
  assert.match(loi[0], /Gửi kiểm vé/);
  assert.deepEqual(kiemNoiDat(v, [nut("web/a.ts", ["＋ Gửi kiểm vé"])]), []);
  const ghep = [viec("Mở vé", [{ tep: "web/b.ts", chu: "Mở ‹…› vé" }]), viec("Hỏi", [{ tep: "web/b.ts", chu: "⟪cau(x)⟫" }])];
  const l2 = kiemNoiDat(ghep, [nut("web/b.ts", ["Khác"])]);
  assert.equal(l2.length, 2);
  for (const l of l2) assert.match(l, /chữ ghép từ mã/);
  // hai nút cùng khoá trong một tệp: bỏ một nút, còn một, bảng vẫn xanh
  const v2 = [viec("Lưu", [{ tep: "web/c.ts", chu: "Lưu" }])];
  assert.deepEqual(kiemNoiDat(v2, [nut("web/c.ts", ["Lưu"], [], 5), nut("web/c.ts", ["Lưu"], [], 90)]), []);
  assert.deepEqual(kiemNoiDat(v2, [nut("web/c.ts", ["Lưu"], [], 5)]), []);
});

test("điều 2: tên đã khai không xuất hiện ở chỗ chưa khai", () => {
  const v = [viec("Gửi kiểm vé", [{ tep: "web/a.ts", chu: "Gửi kiểm vé" }]), viec("Lưu đơn", [{ tep: "web/a.ts", chu: "Lưu" }]), viec("Chọn", [{ tep: "web/a.ts", chu: "A / b" }])];
  const chung: ChuDungChung[] = [{ chu: "Lưu", vi: "tiêu đề hộp nói đối tượng" }];
  const da = nut("web/a.ts", ["Gửi kiểm vé"]);
  const lac = nut("web/z.ts", ["Gửi kiểm vé"], [], 33);
  const loi = kiemTenLacCho(v, [], chung, [da, lac]);
  assert.equal(loi.length, 1);
  assert.match(loi[0], /web\/z\.ts:33/);
  assert.match(loi[0], /Gửi kiểm vé/);
  assert.deepEqual(kiemTenLacCho(v, [], chung, [nut("web/a.ts", ["Lưu"]), nut("web/z.ts", ["Lưu"])]), [], "chữ dùng chung không bị bắt");
  const bo: MucBoQua[] = [{ tep: "web/z.ts", chu: "Gửi kiểm vé", lyDo: "thử" }];
  assert.deepEqual(kiemTenLacCho(v, bo, chung, [da, lac]), [], "đã bỏ qua có lý do");
  for (const nhan of ["⟪x ? 1 : 2⟫", "[biểu tượng x]", "—"]) {
    const v3 = [viec("V", [{ tep: "web/a.ts", chu: nhan }])];
    assert.deepEqual(kiemTenLacCho(v3, [], [], [nut("web/a.ts", [nhan]), nut("web/z.ts", [nhan])]), [], nhan);
  }
  // nhãn có « / » trong chính chữ không bị tách thành hai tên
  const v4 = [viec("A", [{ tep: "web/a.ts", chu: "A / b" }])];
  assert.deepEqual(kiemTenLacCho(v4, [], [], [nut("web/a.ts", ["A / b"]), nut("web/z.ts", ["b"]), nut("web/z.ts", ["A"])]), []);
});

test("điều 3: nút ghi, nguy hiểm, nút chính phải có dòng hoặc mục bỏ qua", () => {
  const ghi = nut("web/a.ts", ["Gửi"], ["ghi"], 7);
  const loi = kiemUngVien([], [], [ghi]);
  assert.equal(loi.length, 1);
  assert.match(loi[0], /web\/a\.ts/);
  assert.match(loi[0], /Gửi/);
  assert.deepEqual(kiemUngVien([viec("G", [{ tep: "web/a.ts", chu: "Gửi" }])], [], [ghi]), []);
  assert.deepEqual(kiemUngVien([], [{ tep: "web/a.ts", chu: "Gửi", lyDo: "chỉ tải lại" }], [ghi]), []);
  assert.deepEqual(kiemUngVien([], [], [nut("web/a.ts", ["Gửi"], ["từ khoá"])]), []);
});

test("tên nằm ở nhiều hàng việc phải được xếp loại, xếp thừa cũng đỏ", () => {
  const v = [viec("A", [{ tep: "web/a.ts", chu: "Từ chối" }]), viec("B", [{ tep: "web/b.ts", chu: "Từ chối" }])];
  const n = [nut("web/a.ts", ["Từ chối"]), nut("web/b.ts", ["Từ chối"])];
  const loi = kiemTenNhieuHang(v, [], [], n);
  assert.equal(loi.length, 1);
  assert.match(loi[0], /Từ chối/);
  assert.match(loi[0], /chưa xếp loại/);
  assert.deepEqual(kiemTenNhieuHang(v, [{ chu: "Từ chối", vi: "x" }], [], n), []);
  assert.deepEqual(kiemTenNhieuHang(v, [], [{ chu: "Từ chối", loai: "cung-viec", vi: "x" }], n), []);
  assert.deepEqual(kiemTenNhieuHang([v[0]!], [], [], [n[0]!]), []);
  assert.match(kiemTenNhieuHang([v[0]!], [], [{ chu: "Từ chối", loai: "cung-viec", vi: "x" }], [n[0]!])[0]!, /không còn ở nhiều hàng/);
});

test("điều 4: đường lệnh và mã nhật ký phải còn trong mã", () => {
  const duong = new Set(["/api/orders/:x"]);
  const ma = new Set(["created"]);
  assert.deepEqual(kiemDuong([viec("V", [], { duongLenh: ["/api/orders/:x"], maNhatKy: ["created"] })], duong, ma), []);
  assert.equal(kiemDuong([viec("V", [], { duongLenh: ["/api/khong-co"] })], duong, ma).length, 1);
  assert.equal(kiemDuong([viec("V", [], { maNhatKy: ["khong_co" as never] })], duong, ma).length, 1);
});

test("điều 5: tên [[…]] của Hướng dẫn phải có thật và không phải chữ đã loại", () => {
  const cam = [{ cam: /Ghi lần thu/u, thay: "Ghi khoản thu", nguon: "x" }];
  const nuts = [nut("web/a.ts", ["＋ Thêm khách"])];
  assert.equal(kiemHuongDan([{ ten: "Ghi lần thu", noi: "h:1" }], nuts, "", cam).length, 1);
  assert.equal(kiemHuongDan([{ ten: "Không có", noi: "h:2" }], nuts, "Gửi kiểm vé", cam).length, 1);
  assert.deepEqual(kiemHuongDan([{ ten: "Gửi kiểm vé", noi: "h:3" }], nuts, "chữ Gửi kiểm vé ở tiêu đề", cam), []);
  assert.deepEqual(kiemHuongDan([{ ten: "Thêm khách", noi: "h:4" }], nuts, "", cam), []);
});

test("khái niệm: đã chốt cần giải nghĩa, ngày chủ chọn; chữ đã loại phải bị dòng cấm bắt", () => {
  const tu = [{ cam: /Ghi lần thu/u, thay: "Ghi khoản thu", nguon: "x" }];
  const theoTep = [{ tep: [/^web\//], cam: /Chính sách/u, thay: "Cấp", nguon: "x" }];
  const ok: KhaiNiem = { ten: "Khoản thu", giaiNghia: "Một lần khách trả tiền.", khacVoi: "", chuDaLoai: ["Ghi lần thu", "Chính sách"], maNoiBo: [], trangThai: "da-chot", chuChon: "2026-10-08 (chủ)" };
  assert.deepEqual(kiemKhaiNiem([ok], tu, theoTep), []);
  assert.equal(kiemKhaiNiem([{ ...ok, giaiNghia: " " }], tu, theoTep).length, 1);
  assert.equal(kiemKhaiNiem([{ ...ok, chuChon: "chủ chọn" }], tu, theoTep).length, 1);
  assert.deepEqual(kiemKhaiNiem([{ ...ok, trangThai: "cho-chon", giaiNghia: "", chuChon: "" }], tu, theoTep), []);
  assert.equal(kiemKhaiNiem([{ ...ok, chuDaLoai: ["Chữ lạ"] }], tu, theoTep).length, 1);
  assert.equal(kiemKhaiNiem([{ ...ok, ten: "Ghi lần thu" }], tu, theoTep).length, 1);
});

test("«đã chốt» ở hàng việc phải chỉ ra lời chủ hoặc số ADR; AI rà soát thì để «tên hiện tại»", () => {
  const moc = (trangThai: ViecQuanTrong["trangThai"], nguonTen: string) => viec("V", [], { trangThai, nguonTen });
  assert.equal(kiemNguonTen([moc("da-chot", "rà soát 2026-11-04: tên đúng")]).length, 1);
  assert.deepEqual(kiemNguonTen([moc("da-chot", "ADR-0166 câu 9"), moc("da-chot", "rà soát 2026-11-04: tên đúng; chủ 2026-10-18 (hộp hỏi)"), moc("ten-hien-tai", "rà soát 2026-11-04: tên đúng"), moc("cho-chon", "chờ chủ")]), []);
});

test("bộ quét nhận lệnh ghi ở cả ba dạng: method viết thẳng, tham số của hàm bọc, method là biến", () => {
  const goc = mkdtempSync(join(tmpdir(), "quet-nut-"));
  try {
    for (const d of ["web", "public", "src/shared"]) mkdirSync(join(goc, d), { recursive: true });
    const nutMau = (bien: string, chu: string, than: string) => `const ${bien} = h("button", { type: "button" }, "${chu}");\n${bien}.addEventListener("click", () => void ${than});\n`;
    writeFileSync(join(goc, "web", "mau.ts"), [
      nutMau("a", "Một", 'api("/api/x", { method: "POST" })'),
      nutMau("b", "Hai", 'gui("/api/x", "PATCH", {})'),
      nutMau("c", "Ba", 'api("/api/x", { method: PHUONG_THUC })'),
      nutMau("d", "Bốn", 'api("/api/x")'),
    ].join(""));
    const ghi = (lietKeNut(goc) as Nut[]).filter((r) => r.lyDo.includes("ghi")).map((r) => r.nhan[0]).sort();
    assert.deepEqual(ghi, ["Ba", "Hai", "Một"]);
  } finally {
    rmSync(goc, { recursive: true, force: true });
  }
});

test("tên việc và chữ nơi đặt không được là chữ đã loại", () => {
  const tu = [{ cam: /Ghi lần thu/u, thay: "Ghi khoản thu", nguon: "x" }];
  const theoTep = [{ tep: [/^web\/a\.ts$/], cam: /^Đóng$/u, thay: "Ngừng", nguon: "x" }];
  assert.equal(kiemKhongDungChuLoai([viec("Ghi lần thu", [])], tu, theoTep).length, 1);
  assert.equal(kiemKhongDungChuLoai([viec("V", [{ tep: "web/b.ts", chu: "Ghi lần thu" }])], tu, theoTep).length, 1);
  assert.equal(kiemKhongDungChuLoai([viec("V", [{ tep: "web/a.ts", chu: "Đóng" }])], tu, theoTep).length, 1);
  assert.deepEqual(kiemKhongDungChuLoai([viec("V", [{ tep: "web/b.ts", chu: "Đóng" }])], tu, theoTep), []);
});

test("thuật ngữ trong mã: bắt buộc có mã nội bộ và giải nghĩa, bản đọc tách khỏi phần chủ đọc", () => {
  const tm = (rieng: Partial<KhaiNiem>): KhaiNiem => ({ ten: "Khoá lạc quan", giaiNghia: "Nghĩa.", khacVoi: "", chuDaLoai: [], maNoiBo: ["expectedUpdatedAt"], trangThai: "trong-ma", chuChon: "", ...rieng });
  assert.deepEqual(kiemKhaiNiem([tm({})], [], []), []);
  assert.match(kiemKhaiNiem([tm({ maNoiBo: [] })], [], []).join(), /mã nội bộ/);
  assert.match(kiemKhaiNiem([tm({ giaiNghia: " " })], [], []).join(), /giải nghĩa/);
  const ra = renderBangThamChieu({ khaiNiem: [tm({})], chuDungChung: [], viec: [], boQua: [] });
  assert.ok(ra.indexOf("## Khái niệm") < ra.indexOf("## Thuật ngữ trong mã"));
  assert.ok(ra.indexOf("Khoá lạc quan") > ra.indexOf("## Thuật ngữ trong mã"), "thuật ngữ trong mã không nằm trong bảng chủ đọc");
});

test("điều 6: bản đọc cho người ổn định, có Khái niệm trước Việc quan trọng, hàng chờ chọn hiện «chờ chọn»", () => {
  const dau = {
    khaiNiem: [{ ten: "Khoản thu", giaiNghia: "Nghĩa.", khacVoi: "", chuDaLoai: [], maNoiBo: ["ledger"], trangThai: "da-chot", chuChon: "2026-10-08" } as KhaiNiem],
    chuDungChung: [{ chu: "Lưu", vi: "vì" }],
    viec: [viec("Gửi kiểm vé", [{ tep: "web/a.ts", chu: "Gửi kiểm vé" }]), viec("Sửa giá", [{ tep: "web/b.ts", chu: "Sửa giá" }], { trangThai: "cho-chon" })],
    boQua: [{ tep: "web/c.ts", chu: "Tải lại", lyDo: "chỉ tải lại" }],
  };
  const a = renderBangThamChieu(dau);
  assert.equal(a, renderBangThamChieu(dau));
  assert.ok(a.indexOf("## Khái niệm") < a.indexOf("## Việc quan trọng"));
  assert.match(a, /chờ chọn/);
  assert.match(a, /đừng sửa tay/);
});

test("bộ quét chạy được trên mã thật", () => {
  const ds = lietKeNut(ROOT);
  assert.ok(ds.length > 800, `chỉ quét được ${ds.length} nút`);
  assert.ok(ds.every((n: { kenh: string }) => n.kenh !== "khuon"));
});

// ---------------------------------------------------------------------------------------------------------------------
// Chạy trên mã thật
// ---------------------------------------------------------------------------------------------------------------------
const NUT_THAT = lietKeNut(ROOT);
const kể = (loi: string[]) => `${loi.length} chỗ lệch:\n${loi.slice(0, 30).join("\n")}${loi.length > 30 ? `\n… và ${loi.length - 30} chỗ nữa` : ""}`;

test("bảng khớp mã: điều 1, 3, 4 (nút đã khai đúng tên; nút ghi/nút chính có dòng; đường lệnh và mã nhật ký còn thật)", () => {
  const l1 = kiemNoiDat(VIEC_QUAN_TRONG, NUT_THAT);
  assert.deepEqual(l1, [], `điều 1 — ${kể(l1)}`);
  const l3 = kiemUngVien(VIEC_QUAN_TRONG, BO_QUA, NUT_THAT);
  assert.deepEqual(l3, [], `điều 3 — ${kể(l3)}`);
  const l4 = kiemDuong(VIEC_QUAN_TRONG, duongTrongMa(ROOT), new Set(Object.keys(AUDIT_ACTIONS)));
  assert.deepEqual(l4, [], `điều 4 — ${kể(l4)}`);
});

test("không tệp nào ngoài bài kiểm và kịch bản nạp bảng", () => {
  const loi: string[] = [];
  const duyet = (thuMuc: string) => {
    for (const e of readdirSync(join(ROOT, thuMuc), { recursive: true, withFileTypes: true })) {
      if (!e.isFile() || !/\.(ts|mjs|html)$/.test(e.name) || e.name.endsWith(".test.ts")) continue;
      const tep = join(e.parentPath, e.name).slice(ROOT.length + 1);
      if (/^src\/shared\/bang-tham-chieu[^/]*\.ts$/.test(tep)) continue; // chính các tệp bảng nhập nhau
      if (/bang-tham-chieu/.test(readFileSync(join(ROOT, tep), "utf8").replace(/\/\/.*$/gm, "").split("\n").filter((d) => /\b(?:import|from)\b|import\(/.test(d)).join("\n"))) loi.push(tep);
    }
  };
  duyet("web");
  duyet("src");
  duyet("public");
  assert.deepEqual(loi.filter((t) => !t.startsWith("scripts/")), [], "bảng tham chiếu chỉ để bài kiểm và kịch bản sinh tài liệu đọc; giao diện và máy chủ không nạp (sẽ làm nặng trang)");
});

test("điều 2: tên đã khai không xuất hiện ở chỗ chưa khai (trừ chữ dùng chung)", () => {
  const l2 = kiemTenLacCho(VIEC_QUAN_TRONG, BO_QUA, CHU_DUNG_CHUNG, NUT_THAT);
  assert.deepEqual(l2, [], `điều 2 — ${kể(l2)}`);
});

test("mọi hàng việc «đã chốt» trên bảng thật chỉ ra được lời chủ hoặc số ADR", () => {
  const loi = kiemNguonTen(VIEC_QUAN_TRONG);
  assert.deepEqual(loi, [], kể(loi));
});

test("mọi tên nằm ở nhiều hàng việc đã được xếp: chữ dùng chung, cùng một việc, hoặc chờ chủ", () => {
  const l = kiemTenNhieuHang(VIEC_QUAN_TRONG, CHU_DUNG_CHUNG, TEN_NHIEU_HANG, NUT_THAT);
  assert.deepEqual(l, [], `tên nhiều hàng — ${kể(l)}`);
});

test("điều 5: mọi [[tên nút]] của Hướng dẫn có thật và không phải chữ đã loại", () => {
  const l5 = kiemHuongDan(tenHuongDan(ROOT), NUT_THAT, toanChu(ROOT), TU_DA_LOAI);
  assert.deepEqual(l5, [], `điều 5 — ${kể(l5)}`);
});

test("khái niệm: đã chốt có giải nghĩa và ngày chủ chọn; chữ đã loại có dòng cấm; tên chuẩn không là chữ đã loại", () => {
  const loi = kiemKhaiNiem(KHAI_NIEM, TU_DA_LOAI, CAM_THEO_TEP);
  assert.deepEqual(loi, [], kể(loi));
  const trung = KHAI_NIEM.map((k) => k.ten).filter((t, i, a) => a.indexOf(t) !== i);
  assert.deepEqual(trung, [], "mỗi tên chuẩn chỉ một dòng khái niệm (mỗi tên một nghĩa)");
});

test("tên việc và chữ khai ở nơi đặt không phải chữ đã loại", () => {
  const loi = kiemKhongDungChuLoai(VIEC_QUAN_TRONG, TU_DA_LOAI, CAM_THEO_TEP);
  assert.deepEqual(loi, [], kể(loi));
});

test("có mỗi trạng thái đơn và mười một quyền", () => {
  const ten = new Set(KHAI_NIEM.map((k) => k.ten));
  for (const nhan of [...Object.values(STATUS_LABEL), NHAN_DANG_CHO_XAC_NHAN, ...Object.values(PERMISSION_LABEL)]) assert.ok(ten.has(nhan), `thiếu khái niệm «${nhan}»`);
  assert.equal(Object.values(PERMISSION_LABEL).length, 11);
});

test("chữ dùng chung không trùng nhau và mỗi chữ có lý do", () => {
  const chu = CHU_DUNG_CHUNG.map((c) => c.chu);
  assert.equal(new Set(chu).size, chu.length);
  for (const c of CHU_DUNG_CHUNG) assert.ok(c.vi.trim().length > 10, `«${c.chu}» thiếu lý do`);
});

test("docs/BANG-THAM-CHIEU.md khớp bản sinh (chạy `npm run tham-chieu`)", () => {
  const sinh = renderBangThamChieu({ khaiNiem: KHAI_NIEM, chuDungChung: CHU_DUNG_CHUNG, tenNhieuHang: TEN_NHIEU_HANG, viec: VIEC_QUAN_TRONG, boQua: BO_QUA });
  assert.equal(readFileSync(join(ROOT, "docs/BANG-THAM-CHIEU.md"), "utf8"), sinh);
});
