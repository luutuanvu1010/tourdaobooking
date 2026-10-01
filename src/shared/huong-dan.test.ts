import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { HUONG_DAN, nhomCuaToi, nutCuaNhom, phanTich, phanTichDong, phutDoc, viPhamNoiDung, type NhomHuongDan } from "./huong-dan.ts";
import { PERMISSION_CODES } from "./permissions.ts";

const CHUNG = HUONG_DAN.find((n) => n.quyen.length === 0) as NhomHuongDan;

test("A1: mỗi mã quyền có ít nhất một nhóm hướng dẫn riêng (thêm quyền mới mà quên hướng dẫn ⇒ đỏ)", () => {
  for (const q of PERMISSION_CODES) assert.ok(HUONG_DAN.some((n) => n.quyen.includes(q)), `quyền ${q} chưa có hướng dẫn`);
});

test("id nhóm không trùng, đúng một Phần chung, mỗi nhóm có bắt đầu nhanh và ít nhất một mục", () => {
  assert.equal(new Set(HUONG_DAN.map((n) => n.id)).size, HUONG_DAN.length);
  assert.equal(HUONG_DAN.filter((n) => n.quyen.length === 0).length, 1);
  for (const n of HUONG_DAN) {
    assert.ok(n.gioiThieu.trim() && n.batDauNhanh.trim(), n.id);
    assert.ok(n.muc.length >= 1, n.id);
    for (const m of n.muc) assert.ok(m.tieuDe.trim() && m.noiDung.trim(), `${n.id}: mục rỗng`);
  }
});

// Kho chữ giao diện: mọi tệp chạy của app, TRỪ chính các tệp hướng dẫn (nếu không bài kiểm tự đúng), TRỪ nhật ký thay đổi và chú thích
// (người kiểm độc lập 30/9: đổi tên nút mà changelog.ts / chú thích còn trích tên cũ ⇒ bài xanh giả — đúng lúc cần đỏ).
// Kho tri thức của trợ lý Hỗ trợ (ADR-0066) cũng bỏ: sơ đồ trang là BẢN CHÉP nhãn giao diện (sinh từ mã), kiến trúc lời thường là văn xuôi —
// để chúng trong kho thì một nút bị đổi tên vẫn "còn" trong bản chép và bài A2 xanh giả.
const BO_QUA = new Set(["changelog.ts", "so-do-trang.ts", "tro-ly-kien-truc.ts", "tro-ly-cau-truc.ts", "tro-ly-cau-truc-ten.ts"]);
const boChuThich = (s: string): string => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/<!--[\s\S]*?-->/g, "").replace(/(^|\s)\/\/.*$/gm, "$1");
function khoChuGiaoDien(): string {
  const doc = (dir: string, duoi: string): string[] =>
    readdirSync(dir)
      .filter((f) => f.endsWith(duoi) && !f.startsWith("huong-dan") && !f.endsWith(".test.ts") && !BO_QUA.has(f))
      .map((f) => boChuThich(readFileSync(`${dir}/${f}`, "utf8")));
  return [...doc("web", ".ts"), ...doc("public", ".html"), ...doc("src/shared", ".ts")].join("\n").replace(/&amp;/g, "&").replace(/\\"/g, '"');
}

test("A2: kho chữ bỏ chú thích nhưng giữ chuỗi có // (đường dẫn)", () => {
  assert.equal(boChuThich(`a("Lưu"); // nút "Xoá"\n/* "Sửa" */ b('https://x.vn') <!-- "Gọi" -->`).includes("Xoá"), false);
  assert.ok(boChuThich(`b('https://x.vn')`).includes("https://x.vn"));
  assert.ok(!boChuThich(`/* "Sửa" */ x`).includes("Sửa"));
});

// Nhãn phải là NGUYÊN một chuỗi trong mã (đứng giữa hai dấu nháy, hoặc giữa > < của HTML) — không chỉ là khúc con: nhãn ngắn như
// "Đổi", "Gọi" là khúc con của gần như mọi tệp, kiểm "có chứa" thì không bao giờ đỏ. Cho phép khoảng trắng / dấu "…" sát mép (nhãn nút có dấu cách đệm).
const coNguyenChuoi = (kho: string, nut: string): boolean => {
  const e = nut.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`["'\`>]\\s*${e}\\s*["'\`<]`, "u").test(kho);
};

test("A2: mọi [[Tên nút]] trong hướng dẫn còn nguyên văn (nguyên chuỗi) trong mã giao diện (đổi tên nút mà quên hướng dẫn ⇒ đỏ)", () => {
  const kho = khoChuGiaoDien();
  const thieu: string[] = [];
  for (const n of HUONG_DAN) for (const nut of nutCuaNhom(n)) if (!coNguyenChuoi(kho, nut)) thieu.push(`${n.id}: [[${nut}]]`);
  assert.deepEqual(thieu, []);
});

test("A2: bộ so nguyên chuỗi — khúc con không tính", () => {
  const kho = `h("button", null, "Đổi khách"); label: 'Gọi'; <a>Trợ giúp</a>`;
  assert.equal(coNguyenChuoi(kho, "Đổi khách"), true);
  assert.equal(coNguyenChuoi(kho, "Gọi"), true);
  assert.equal(coNguyenChuoi(kho, "Trợ giúp"), true);
  assert.equal(coNguyenChuoi(kho, "Đổi"), false, "khúc con của \"Đổi khách\" không được tính");
  assert.equal(coNguyenChuoi(kho, "khách"), false);
});

test("A3: luật nội dung — không số tiền, không chuỗi giống SĐT, không email", () => {
  assert.deepEqual(HUONG_DAN.flatMap(viPhamNoiDung), []);
});

test("A3: bộ bắt luật nội dung bắt đúng từng loại", () => {
  const mau = (s: string): NhomHuongDan => ({ id: "x", tieuDe: "x", quyen: [], gioiThieu: s, batDauNhanh: "x", muc: [{ tieuDe: "x", noiDung: "x" }] });
  for (const bad of ["giá 450.000 đ", "thu 1.200.000 VNĐ", "gọi 0905 123 456", "gọi 0905123456", "gửi a.b@tourdao.vn"]) assert.equal(viPhamNoiDung(mau(bad)).length, 1, bad);
  for (const ok of ["đón lúc 07:30", "ngày 5/10", "xe 16 chỗ", "mốc 6 giờ", "tối đa 180 phút"]) assert.deepEqual(viPhamNoiDung(mau(ok)), [], ok);
});

test("A4: Phần chung + một nhóm vai đọc được trong 30 phút (150 chữ/phút)", () => {
  for (const n of HUONG_DAN) if (n !== CHUNG) assert.ok(phutDoc(CHUNG) + phutDoc(n) <= 30, `${n.id}: ${phutDoc(CHUNG)} + ${phutDoc(n)} phút`);
});

test("A5: nhomCuaToi — mỗi tài khoản thấy Phần chung + đúng nhóm của mình", () => {
  const ids = (p: Parameters<typeof nhomCuaToi>[0]): string[] => nhomCuaToi(p).map((n) => n.id);
  assert.deepEqual(ids(["SALES"]), ["chung", "ban-hang"]);
  assert.deepEqual(ids(["INTERN"]), ["chung", "ban-hang"]);
  assert.deepEqual(ids(["DRIVER"]), ["chung", "tai-xe"]);
  assert.deepEqual(ids(["DRIVER_PARTNER"]), ["chung", "tai-xe"]);
  assert.deepEqual(ids(["PARTNER"]), ["chung", "doi-tac"]);
  assert.deepEqual(ids(["HR"]), ["chung", "nhan-su"], "ADR-0071: Hành chính nhân sự");
  assert.ok(!ids(["SALES"]).includes("quan-tri"));
  assert.ok(ids(["SALES", "ADMIN"]).includes("quan-tri"));
  assert.ok(ids(["SUPER_ADMIN"]).includes("quan-tri"));
  assert.deepEqual(ids([]), ["chung"]);
});

test("phanTich: tiêu đề, đoạn, danh sách số / chấm, ghi chú, mục con thụt lề", () => {
  const k = phanTich("### Lập đơn\n\nMở trang.\nBấm nút.\n\n1. Bấm [[Tạo đơn]].\n2. Chọn **tour**.\n   - mục con\n\n> Ví dụ: chị Lan.\n> Hai dòng.\n\n- a\n- b");
  assert.deepEqual(k.map((x) => x.k), ["tieuDe", "doan", "dsSo", "ghiChu", "dsCham"]);
  const ds = k[2] as { k: "dsSo"; muc: unknown[][] };
  assert.equal(ds.muc.length, 3, "mục con thụt lề gộp vào danh sách số");
  assert.deepEqual(phanTichDong("Bấm [[Lưu]] rồi **xong**"), [{ k: "chu", t: "Bấm " }, { k: "nut", t: "Lưu" }, { k: "chu", t: " rồi " }, { k: "dam", t: "xong" }]);
  assert.deepEqual(phanTichDong("dấu ** mở không đóng"), [{ k: "chu", t: "dấu ** mở không đóng" }]);
});
