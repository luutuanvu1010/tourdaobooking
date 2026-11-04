// Bảng tham chiếu ngôn ngữ (ADR-0167): máy canh sáu điều kiện đỏ. Phần đầu thử từng phép kiểm bằng dữ liệu mẫu; phần sau chạy trên mã thật.
import assert from "node:assert/strict";
import { test } from "node:test";
// @ts-expect-error — tệp .mjs không có kiểu
import { kiemDuong, kiemHuongDan, kiemKhaiNiem, kiemKhongDungChuLoai, kiemNoiDat, kiemTenLacCho, kiemUngVien, renderBangThamChieu } from "../scripts/bang-tham-chieu-lib.mjs";
// @ts-expect-error — tệp .mjs không có kiểu
import { chuanNhan, khoaNut, lietKeNut } from "../scripts/quet-nut-lib.mjs";
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

test("tên việc và chữ nơi đặt không được là chữ đã loại", () => {
  const tu = [{ cam: /Ghi lần thu/u, thay: "Ghi khoản thu", nguon: "x" }];
  const theoTep = [{ tep: [/^web\/a\.ts$/], cam: /^Đóng$/u, thay: "Ngừng", nguon: "x" }];
  assert.equal(kiemKhongDungChuLoai([viec("Ghi lần thu", [])], tu, theoTep).length, 1);
  assert.equal(kiemKhongDungChuLoai([viec("V", [{ tep: "web/b.ts", chu: "Ghi lần thu" }])], tu, theoTep).length, 1);
  assert.equal(kiemKhongDungChuLoai([viec("V", [{ tep: "web/a.ts", chu: "Đóng" }])], tu, theoTep).length, 1);
  assert.deepEqual(kiemKhongDungChuLoai([viec("V", [{ tep: "web/b.ts", chu: "Đóng" }])], tu, theoTep), []);
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
