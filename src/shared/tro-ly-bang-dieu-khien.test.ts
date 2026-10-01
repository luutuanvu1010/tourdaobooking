// Luật thuần của bảng điều khiển trợ lý (ADR-0069). Hàng rào ghi ở docs/SO-HANG-RAO.md:
// "vai tắt bị chặn" (duocDungTroLy — MỘT hàm cho cả máy chủ 403 và cờ ẩn nút), "khoá không lộ quá 4 ký tự" (khoaCuoi).
// Hàng rào "luật lõi đứng trước" đã BỎ theo ADR-0073 (chủ duyệt 1/10) — thay bằng hàng rào khối tài liệu luôn nối ở tro-ly.test.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { PERMISSION_CODES, type PermissionCode } from "./permissions.ts";
import { chonDoan, doanNguCanh, duocDungTroLy, ketQuaThuKhoa, khoaCuoi, kiemLoiDan, kiemNguCanh, kiemVai, thanThuKhoa } from "./tro-ly.ts";
import { GIOI_HAN_TRO_LY as G } from "./tro-ly-gioi-han.ts";

const tatCa = (bat: boolean): Record<PermissionCode, boolean> => Object.fromEntries(PERMISSION_CODES.map((p) => [p, bat])) as Record<PermissionCode, boolean>;

// ---- điều 3: công tắc vai

test("duocDungTroLy: được khi ÍT NHẤT một quyền của người hỏi đang bật; mã không có trong cấu hình = tắt; không quyền nào = không", () => {
  const vai = { ...tatCa(false), SALES: true };
  assert.equal(duocDungTroLy(["SALES"], vai), true);
  assert.equal(duocDungTroLy(["PARTNER"], vai), false);
  assert.equal(duocDungTroLy(["PARTNER", "SALES"], vai), true, "nhiều quyền: một quyền bật là đủ");
  assert.equal(duocDungTroLy(["SALES"], {}), false, "không có dòng cấu hình ⇒ tắt (mặc định từ chối)");
  assert.equal(duocDungTroLy([], tatCa(true)), false);
  for (const p of PERMISSION_CODES) assert.equal(duocDungTroLy([p], tatCa(true)), true, p);
});

test("kiemVai: phải đủ 9 mã, mỗi mã true / false; thừa mã lạ ⇒ lỗi", () => {
  assert.deepEqual(kiemVai({ vai: tatCa(true) }), { ok: true, value: tatCa(true) });
  const thieu: Record<string, boolean> = { ...tatCa(true) };
  delete thieu.DRIVER;
  assert.equal(kiemVai({ vai: thieu }).ok, false);
  assert.equal(kiemVai({ vai: { ...tatCa(true), SALES: "có" } }).ok, false);
  assert.equal(kiemVai({ vai: { ...tatCa(true), LA: true } }).ok, false);
  assert.equal(kiemVai(null).ok, false);
});

// ---- điều 4: lời dặn + ngữ cảnh

const LD = { cauChao: "Chào bạn, hỏi mình cách dùng app nhé.", giong: "thân thiện, ngắn", loiDanThem: "Gọi người dùng là bạn.", cauHoiMau: ["Đổi mã PIN thế nào?"] };

test("kiemLoiDan: hợp lệ → làm sạch khoảng trắng, bỏ câu mẫu rỗng / trùng; SĐT, email, số tiền ở BẤT KỲ ô nào ⇒ lỗi lời thường nêu ô", () => {
  const r = kiemLoiDan({ ...LD, cauHoiMau: ["  Đổi mã PIN thế nào?  ", "", "Đổi mã PIN thế nào?", "Lập đơn ra sao?"] });
  assert.ok(r.ok);
  assert.deepEqual(r.ok && r.value.cauHoiMau, ["Đổi mã PIN thế nào?", "Lập đơn ra sao?"]);
  for (const [o, bad] of [["cauChao", "Gọi 0905 123 456 nhé"], ["giong", "mail a@b.vn"], ["loiDanThem", "giá 450.000 đ"]] as const) {
    const k = kiemLoiDan({ ...LD, [o]: bad });
    assert.equal(k.ok, false, `${o}: ${bad}`);
    assert.ok(!k.ok && /không được chứa/.test(k.message) && !/[a-z]+_[a-z]+/.test(k.message), !k.ok ? k.message : "");
  }
  assert.equal(kiemLoiDan({ ...LD, cauHoiMau: ["khách 0905123456 hỏi gì"] }).ok, false, "mỗi câu mẫu cũng qua bộ lọc");
});

test("kiemLoiDan: câu chào bắt buộc; quá giới hạn độ dài / số câu mẫu ⇒ lỗi; kiểu sai ⇒ lỗi", () => {
  assert.equal(kiemLoiDan({ ...LD, cauChao: "   " }).ok, false);
  assert.equal(kiemLoiDan({ ...LD, cauChao: "a".repeat(G.cauChao + 1) }).ok, false);
  assert.equal(kiemLoiDan({ ...LD, giong: "a".repeat(G.giong + 1) }).ok, false);
  assert.equal(kiemLoiDan({ ...LD, loiDanThem: "a".repeat(G.loiDanThem + 1) }).ok, false);
  assert.equal(kiemLoiDan({ ...LD, cauHoiMau: Array.from({ length: G.soCauMau + 1 }, (_, i) => `Câu ${i}?`) }).ok, false);
  assert.equal(kiemLoiDan({ ...LD, cauHoiMau: ["a".repeat(G.cauMau + 1)] }).ok, false);
  assert.equal(kiemLoiDan({ ...LD, cauHoiMau: "không phải mảng" }).ok, false);
  assert.equal(kiemLoiDan({ ...LD, giong: 5 }).ok, false);
});

test("kiemNguCanh: tiêu đề + nội dung bắt buộc, có trần; bỏ ngoặc vuông ở tiêu đề (tên nguồn); chữ vi phạm ⇒ lỗi; bat phải boolean", () => {
  const r = kiemNguCanh({ tieuDe: " Giờ [làm] việc ", noiDung: "Văn phòng mở 7:30 tới 17:00.", bat: true });
  assert.deepEqual(r, { ok: true, value: { tieuDe: "Giờ làm việc", noiDung: "Văn phòng mở 7:30 tới 17:00.", bat: true } });
  assert.equal(kiemNguCanh({ tieuDe: "", noiDung: "x", bat: true }).ok, false);
  assert.equal(kiemNguCanh({ tieuDe: "x", noiDung: " ", bat: true }).ok, false);
  assert.equal(kiemNguCanh({ tieuDe: "x", noiDung: "a".repeat(G.noiDungNguCanh + 1), bat: true }).ok, false);
  assert.equal(kiemNguCanh({ tieuDe: "Hotline 0905 123 456", noiDung: "x", bat: true }).ok, false);
  assert.equal(kiemNguCanh({ tieuDe: "x", noiDung: "phí 200.000 đồng", bat: true }).ok, false);
  assert.equal(kiemNguCanh({ tieuDe: "x", noiDung: "y", bat: "có" }).ok, false);
});

test("trần độ dài: một đoạn ngữ cảnh tối đa vẫn vừa ngân sách token (không bị chonDoan bỏ qua mãi mãi)", () => {
  const d = doanNguCanh([{ doanId: "d", tieuDe: "Giờ làm việc", noiDung: "giờ làm việc văn phòng ".repeat(Math.floor(G.noiDungNguCanh / 23)), bat: true }]);
  assert.equal(d.length, 1);
  assert.deepEqual(chonDoan("giờ làm việc văn phòng", ["SALES"], d).map((x) => x.ten), ["Ngữ cảnh bổ sung › Giờ làm việc"]);
});

test("doanNguCanh: chỉ đoạn đang bật; tên 'Ngữ cảnh bổ sung › …' (không trùng tên kho có sẵn); cho mọi vai; đoạn bật được chonDoan chọn", () => {
  const d = doanNguCanh([
    { doanId: "a", tieuDe: "Quy trình khách huỷ sát giờ", noiDung: "Khi khách huỷ sát giờ, báo điều hành ngay và ghi lý do vào đơn.", bat: true },
    { doanId: "b", tieuDe: "Đoạn đã tắt", noiDung: "Khi khách huỷ sát giờ thì làm cách cũ.", bat: false },
  ]);
  assert.deepEqual(d, [{ ten: "Ngữ cảnh bổ sung › Quy trình khách huỷ sát giờ", quyen: [], chu: "Khi khách huỷ sát giờ, báo điều hành ngay và ghi lý do vào đơn." }]);
  assert.equal(chonDoan("khách huỷ sát giờ", ["SALES"], d)[0]?.ten, "Ngữ cảnh bổ sung › Quy trình khách huỷ sát giờ");
});

// ---- điều 2: khoá + Thử key

test("HÀNG RÀO khoaCuoi: chỉ 4 ký tự cuối của khoá đã cắt khoảng trắng; khoá ngắn (< 16) ⇒ null; không khoá ⇒ null", () => {
  assert.equal(khoaCuoi("  sk-proj-abcdefghijklmnopWXYZ \n"), "WXYZ");
  assert.equal(khoaCuoi("ngan-qua-12345"), null);
  assert.equal(khoaCuoi(""), null);
  assert.equal(khoaCuoi(undefined), null);
  const k = khoaCuoi("sk-1234567890abcdefghij");
  assert.ok(k !== null && k.length <= 4);
});

test("thanThuKhoa: câu cố định không dữ liệu công ty, không tài liệu, token ra nhỏ, store false", () => {
  const t = thanThuKhoa("gpt-5-mini");
  assert.equal(t.model, "gpt-5-mini");
  assert.equal(t.store, false);
  assert.ok(Number(t.max_output_tokens) <= 50);
  const s = JSON.stringify(t);
  assert.ok(!s.includes("TÀI LIỆU") && !s.includes("Tour Đảo") && !s.includes("Island"), s);
});

test("ketQuaThuKhoa: được / sai key (401) / hết tiền (429 insufficient_quota) / giới hạn tốc độ / lỗi mạng / lỗi khác — lời thường, không mã thô", () => {
  assert.equal(ketQuaThuKhoa({ ok: true }).ma, "duoc");
  assert.equal(ketQuaThuKhoa({ status: 401, maLoi: "invalid_api_key" }).ma, "sai_khoa");
  assert.equal(ketQuaThuKhoa({ status: 429, maLoi: "insufficient_quota" }).ma, "het_tien");
  assert.equal(ketQuaThuKhoa({ status: 429, maLoi: null }).ma, "gioi_han");
  assert.equal(ketQuaThuKhoa({ mang: true }).ma, "loi_mang");
  assert.equal(ketQuaThuKhoa({ status: 500, maLoi: null }).ma, "loi_khac");
  assert.equal(ketQuaThuKhoa({ status: 400, maLoi: null }).ma, "mau_tu_choi", "ADR-0073 B10: mẫu đang chọn không nhận tham số thử (vd. mức suy nghĩ)");
  assert.match(ketQuaThuKhoa({ status: 400, maLoi: null }).cau, /^Mẫu AI đang chọn không nhận/);
  for (const k of [{ ok: true }, { status: 401, maLoi: null }, { status: 429, maLoi: "insufficient_quota" }, { mang: true }, { status: 503, maLoi: null }, { status: 400, maLoi: null }] as const) {
    const c = ketQuaThuKhoa(k).cau;
    assert.ok(c.length > 5 && !/_|http|error|invalid/i.test(c), c);
  }
});
