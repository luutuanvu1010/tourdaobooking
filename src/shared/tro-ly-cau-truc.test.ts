// ADR-0070 (accepted 2026-10-01): trợ lý Hỗ trợ hiểu cấu trúc app (kho d), bố cục trang (kho e), tự sinh lúc build, bộ lọc tên kỹ thuật.
// Tiêu chí nghiệm thu: docs/superpowers/plans/2026-10-01-tro-ly-hieu-cau-truc-thi-cong.md. Hàng rào ghi ở docs/SO-HANG-RAO.md: "bộ lọc tên kỹ thuật",
// "thiếu tên lời thường ⇒ đỏ", "tự sinh lúc build".
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CAU_TU_CHOI, chiaKho, chonDoan, dinhDangDoan, dungLoiNhac, uocToken, viPhamKho, NGAN_SACH_TOKEN, type DoanTriThuc } from "./tro-ly.ts";
import { viPhamKyThuat } from "./tro-ly-loc-ky-thuat.ts";
import { LUONG_CHINH, TEN_PHAN_HE, TEN_THAO_TAC } from "./tro-ly-cau-truc-ten.ts";
import { MATRIX, PERMISSION_CODES, PERMISSION_LABEL } from "./permissions.ts";
import { CAU_TRUC } from "./tro-ly-cau-truc.ts";
import { SO_DO_TRANG } from "./so-do-trang.ts";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { dungCauTruc, docCanh } from "../../scripts/tro-ly-cau-truc-lib.mjs";
import { DICH, DICH_CAU_TRUC, boCucHtml, dungDauVaoCauTruc, ghiNeuKhac, sinhTep, sinhTepCauTruc } from "../../scripts/sinh-so-do-trang.mjs";

const ROOT = new URL("../../", import.meta.url);
const doc = (p: string): string => readFileSync(new URL(p, ROOT), "utf8");
const cauTruc = (ten: string): DoanTriThuc => {
  const d = chiaKho().find((x) => x.ten === `Cấu trúc app › ${ten}`);
  assert.ok(d, `thiếu đoạn "Cấu trúc app › ${ten}"`);
  return d;
};

// ---------------------------------------------------------------- Đ1 bảng tên lời thường

test("Đ1: mọi thư mục src/modules/* và mọi nút ALLOWED_EDGES có tên + mô tả lời thường; mọi ô MATRIX có tên + mô tả; không tên thừa", () => {
  const thuMuc = readdirSync(new URL("src/modules/", ROOT)).filter((f) => statSync(new URL(`src/modules/${f}`, ROOT)).isDirectory());
  const canh = docCanh(doc("src/architecture.test.ts"));
  for (const m of new Set([...thuMuc, ...Object.keys(canh)])) {
    assert.ok(TEN_PHAN_HE[m]?.ten && TEN_PHAN_HE[m]?.moTa, `phân hệ "${m}" thiếu tên / mô tả`);
  }
  assert.deepEqual(Object.keys(TEN_PHAN_HE).sort(), [...new Set([...thuMuc, ...Object.keys(canh)])].sort(), "tên thừa");
  for (const op of Object.keys(MATRIX)) assert.ok(TEN_THAO_TAC[op as keyof typeof MATRIX]?.ten, `ô "${op}" thiếu tên`);
  assert.deepEqual(Object.keys(TEN_THAO_TAC).sort(), Object.keys(MATRIX).sort());
});

test("Đ1: bộ sinh NÉM LỖI (câu tiếng Việt nêu đúng mã) khi thiếu tên phân hệ / ô quyền, hoặc có tên thừa", () => {
  const vao = dungDauVaoCauTruc();
  const { orders: _bo, ...phanHeThieu } = vao.ten.phanHe;
  assert.throws(() => dungCauTruc({ ...vao, ten: { ...vao.ten, phanHe: phanHeThieu } }), /Thiếu tên lời thường cho phân hệ "orders"/);
  const { "trip.view": _bo2, ...thaoTacThieu } = vao.ten.thaoTac;
  assert.throws(() => dungCauTruc({ ...vao, ten: { ...vao.ten, thaoTac: thaoTacThieu } }), /Thiếu tên lời thường cho ô quyền "trip\.view"/);
  assert.throws(() => dungCauTruc({ ...vao, ten: { ...vao.ten, phanHe: { ...vao.ten.phanHe, cu: { ten: "Cũ", moTa: "Đã bỏ." } } } }), /Tên lời thường thừa cho phân hệ "cu"/);
  assert.throws(() => dungCauTruc({ ...vao, thuMucModule: [...vao.thuMucModule, "moi"] }), /"moi"/);
});

// ---------------------------------------------------------------- Đ2 kho (d) và (e)

test("Đ2 kho (d): có tổng quan phân hệ, mỗi phân hệ một đoạn (dựa vào ai), luồng chính 6 bước, 9 vai, mỗi việc một đoạn", () => {
  const ten = CAU_TRUC.map((d) => d.tieuDe);
  assert.ok(ten.includes("Các phân hệ của app"));
  for (const p of Object.values(TEN_PHAN_HE)) assert.ok(ten.includes(`Phân hệ ${p.ten}`), p.ten);
  assert.match(cauTruc("Phân hệ Vận chuyển").chu, /Dựa vào: .*Đơn hàng \(lấy khách và chặng đưa đón từ đơn đã xác nhận\)/);
  assert.ok(!/Dựa vào: [^.]*Nhật ký/.test(cauTruc("Phân hệ Vận chuyển").chu), "cạnh tới Nhật ký bị bỏ");
  assert.ok(ten.includes("Luồng chính của một đơn"));
  assert.equal(LUONG_CHINH.length, 6);
  LUONG_CHINH.forEach((b, i) => assert.ok(ten.includes(`Luồng chính, bước ${i + 1}: ${b.ten}`), b.ten));
  for (const p of PERMISSION_CODES) {
    const d = CAU_TRUC.find((x) => x.tieuDe === `Vai ${PERMISSION_LABEL[p]} làm được gì`);
    assert.ok(d, p);
    assert.deepEqual(d.quyen, [p], "đoạn vai gắn nhóm vai (ưu tiên khi người hỏi có vai đó)");
  }
  assert.ok(ten.includes("Việc: xem đơn"));
});

test("Đ2 kho (d): vai làm được / không làm được đúng MATRIX (dịch qua bảng tên, có phạm vi); ô chưa có máy chủ hỏi KHÔNG vào danh sách", () => {
  const tx = cauTruc("Vai Tài xế làm được gì").chu;
  assert.match(tx, /Làm được: [^\n]*xem chuyến xe \(chỉ phần đang được giao cho mình\)/);
  assert.match(tx, /Không làm được: [^\n]*xem đơn/);
  const bh = cauTruc("Vai Bán hàng làm được gì").chu;
  assert.match(bh, /Làm được: [^\n]*sửa, xác nhận, huỷ đơn \(phần của mình hoặc đang được giao\)/);
  assert.match(bh, /Không làm được: [^\n]*duyệt Đặt gấp/);
  // task.progress, dispatch.guides.view, invoice.* hôm nay chỉ có trên bảng (docs/quyen-hoan.json) — trợ lý không được hứa.
  for (const d of CAU_TRUC) for (const op of ["dispatch.guides.view", "task.progress", "invoice.request", "invoice.issue"] as const) {
    assert.ok(!d.noiDung.includes(TEN_THAO_TAC[op].ten), `${d.tieuDe}: nhắc "${TEN_THAO_TAC[op].ten}" (ô chưa có máy chủ hỏi)`);
  }
  assert.match(cauTruc("Việc: duyệt Đặt gấp").chu, /Ai làm được: Quản trị, Toàn quyền\./);
});

test("Đ2 kho (e): Tạo đơn — nhóm menu BÁN HÀNG, mục theo thứ tự, nút 'Lưu, chờ xác nhận' ở thanh nút cuối trang (sau Tóm tắt)", () => {
  const t = SO_DO_TRANG.find((x) => x.duongDan === "/order-form")!;
  assert.deepEqual(t.nhomMenu, ["BÁN HÀNG"]);
  assert.deepEqual(t.boCuc.map((m) => m.muc), ["Chọn ngày", "Dịch vụ", "Thanh toán", "Thông tin khách hàng", "Tóm tắt", "Thanh nút cuối trang"]);
  assert.deepEqual(t.boCuc.at(-1)!.nut, ["Lưu, chờ xác nhận", "Quay lại"]);
  assert.deepEqual(SO_DO_TRANG.find((x) => x.duongDan === "/dieu-phoi")!.nhomMenu, ["QUẢN TRỊ › Vận chuyển"]);
  assert.deepEqual(SO_DO_TRANG.find((x) => x.duongDan === "/help")!.nhomMenu, ["TÔI"]);
  const doan = chiaKho().find((d) => d.ten === "Sơ đồ trang › Tạo đơn")!;
  assert.match(doan.chu, /nhóm BÁN HÀNG/);
  assert.match(doan.chu, /Tóm tắt\. 6\. Thanh nút cuối trang — nút: Lưu, chờ xác nhận, Quay lại\./);
});

test("Đ2 (đặc tả mục 5 dòng 4): đổi tên một nút ⇒ kho sinh ra dùng tên MỚI (bố cục trang và bước luồng chính)", () => {
  const html = doc("public/order-form.html");
  const moi = html.replace(">Lưu, chờ xác nhận<", ">Lưu đơn nháp<");
  assert.notEqual(moi, html);
  const bc = boCucHtml(moi);
  assert.deepEqual(bc.at(-1)!.nut, ["Lưu đơn nháp", "Quay lại"]);
  const vao = dungDauVaoCauTruc();
  const trang = vao.trang.map((t: { duongDan: string }) => (t.duongDan === "/order-form" ? { ...t, boCuc: bc } : t));
  const buoc1 = dungCauTruc({ ...vao, trang }).find((d: { tieuDe: string }) => d.tieuDe.startsWith("Luồng chính, bước 1"))!;
  assert.match(buoc1.noiDung, /Lưu đơn nháp/);
  assert.ok(!buoc1.noiDung.includes("Lưu, chờ xác nhận"));
});

// ---------------------------------------------------------------- Đ3 tự sinh

test("Đ3: build:web BẮT ĐẦU bằng bộ sinh; chay-test.mjs gọi bộ sinh TRƯỚC bước 1 và đỏ khi bộ sinh lỗi / tệp sinh vừa đổi", () => {
  const pkg = JSON.parse(doc("package.json")) as { scripts: Record<string, string> };
  // `&&` (không `;`) để bộ sinh lỗi thì DỪNG build — `wrangler deploy` không đóng gói Worker với kho cũ.
  assert.match(pkg.scripts["build:web"]!, /^node scripts\/sinh-so-do-trang\.mjs && BUILD_ID=\$\(date [^;&]*\) && esbuild /);
  const ct = doc("scripts/chay-test.mjs");
  const iSinh = ct.indexOf("ghiTatCa(");
  assert.ok(iSinh > 0, "chay-test.mjs không gọi ghiTatCa");
  assert.ok(iSinh < ct.indexOf("Bước 1/2"), "bộ sinh phải chạy trước bước 1");
  assert.match(ct, /sinhLoi|loiSinh/);
});

test("Đ3: chạy lại bộ sinh ra ĐÚNG hai tệp đang có (tệp trong git không cũ)", async () => {
  assert.equal(doc(DICH), await sinhTep());
  assert.equal(doc(DICH_CAU_TRUC), await sinhTepCauTruc());
});

test("Đ3: ghiNeuKhac chỉ ghi khi nội dung khác (nhiều máy chủ e2e cùng build không ghi chồng, wrangler không nạp lại vô cớ)", () => {
  const p = join(mkdtempSync(join(tmpdir(), "sinh-")), "a.ts");
  writeFileSync(p, "x");
  assert.equal(ghiNeuKhac(p, "x"), false);
  assert.equal(ghiNeuKhac(p, "y"), true);
  assert.equal(readFileSync(p, "utf8"), "y");
  assert.equal(ghiNeuKhac(p, "y"), false);
});

// ---------------------------------------------------------------- Đ5 bộ lọc tên kỹ thuật

test("Đ5 viPhamKyThuat: bắt tiền tố bảng, a_b, /api/, đuôi tệp mã, tên module, SQL, D1, Worker, Cloudflare, mã quyền, mã ô quyền", () => {
  for (const s of [
    "đơn nằm ở ord_order", "bảng vc_trip", "cột valid_from", "gọi /api/orders", "tệp rules.ts", "tệp gen.mjs", "tệp 0050.sql",
    "phân hệ orders lo đơn", "phân hệ van-chuyen", "chạy SELECT", "dữ liệu ở D1", "chạy trên Worker", "máy chủ Cloudflare", "dùng SQLite",
    "quyền SUPER_ADMIN", "quyền SALES", "ô order.view", "ô order.leg.short_notice",
  ]) assert.ok(viPhamKyThuat(s), s);
  for (const s of [
    "Đơn hàng dựa vào Danh bạ và Địa điểm.", "Bấm Lưu, chờ xác nhận ở cuối biểu mẫu.", "Trang /orders", "Face ID, mã PIN", "Góp ý / Báo lỗi",
    "Vận chuyển lấy khách từ đơn đã xác nhận.", "xe 16 chỗ", "Bảng tin", "trợ lý",
  ]) assert.equal(viPhamKyThuat(s), null, s);
});

test("Đ5: bộ sinh NÉM LỖI khi chữ sinh ra có tên kỹ thuật (không âm thầm bỏ) — cả mô tả viết tay lẫn nhãn nút", () => {
  const vao = dungDauVaoCauTruc();
  const phanHe = { ...vao.ten.phanHe, orders: { ten: "Đơn hàng", moTa: "Lưu ở ord_order." } };
  assert.throws(() => dungCauTruc({ ...vao, ten: { ...vao.ten, phanHe } }), /tên bảng.*ord_order/);
  assert.throws(() => boCucHtml('<h2>Mục</h2><button>Xem /api/x</button>'), /đường dẫn API/);
});

test("Đ5: viPhamKho áp bộ lọc tên kỹ thuật cho MỌI đoạn của kho; kho hiện tại sạch", () => {
  assert.deepEqual(viPhamKho(), []);
  assert.equal(viPhamKho([{ ten: "x", quyen: [], chu: "bảng ord_order" }]).length, 1);
  assert.equal(viPhamKho([{ ten: "Chạy trên Cloudflare", quyen: [], chu: "ok" }]).length, 1, "tên đoạn cũng bị lọc");
});

// ---------------------------------------------------------------- Đ4 luật lõi số 2

test("Đ4 dungLoiNhac luật 2: ĐƯỢC giải thích mức khái niệm; VẪN từ chối từng mục của ADR-0070 điều 4 bằng câu từ chối nguyên văn", () => {
  const p = dungLoiNhac(["SALES"], []);
  const luat2 = p.split("\n").find((d) => d.startsWith("2. "))!;
  for (const duoc of ["phân hệ nào lo việc gì", "vì sao phải làm bước này trước bước kia", "vì sao một vai không thấy một nút"]) assert.ok(luat2.includes(duoc), duoc);
  for (const cam of [
    "mã nguồn", "tên bảng", "cột", "hàm", "tệp", "đường dẫn API", "máy chủ", "hạ tầng", "cơ sở dữ liệu", "bí mật", "mật khẩu", "mã PIN", "khoá", "cấu hình",
    "lách quyền", "giá", "số tiền của một đơn cụ thể", "khách", "luật nội bộ",
  ]) assert.ok(luat2.includes(cam), `luật 2 thiếu "${cam}"`);
  assert.ok(luat2.includes(`"${CAU_TU_CHOI}"`));
  assert.equal(CAU_TU_CHOI, "Mình chỉ hướng dẫn cách dùng app, không trả lời được câu này — hỏi Quản trị nếu cần.");
});

// ---------------------------------------------------------------- Đ6 tìm đoạn

const tong = (ds: readonly DoanTriThuc[]): number => ds.reduce((a, d) => a + uocToken(dinhDangDoan(d)), 0);

test("Đ6: 'Vì sao tôi không xác nhận được đơn?' ⇒ chọn đoạn Mốc 6 giờ và Đặt gấp + bước Xác nhận đơn của luồng chính; trong ngân sách", () => {
  const ds = chonDoan("Vì sao tôi không xác nhận được đơn?", ["SALES"]);
  const ten = ds.map((d) => d.ten);
  assert.ok(ten.includes("Cách app vận hành › Mốc 6 giờ và Đặt gấp"), ten.join(" | "));
  assert.ok(ten.includes("Cấu trúc app › Luồng chính, bước 2: Xác nhận đơn"), ten.join(" | "));
  assert.ok(tong(ds) <= NGAN_SACH_TOKEN);
});

test("Đ6: 'Nút Lưu nháp ở đâu?' ⇒ chọn bước Lập đơn (nút thật + thanh nút cuối trang Tạo đơn) và Sơ đồ trang › Tạo đơn", () => {
  const ds = chonDoan("Nút Lưu nháp ở đâu?", ["SALES"]);
  const ten = ds.map((d) => d.ten);
  const b1 = ds.find((d) => d.ten === "Cấu trúc app › Luồng chính, bước 1: Lập đơn và lưu nháp");
  assert.ok(b1, ten.join(" | "));
  assert.match(b1.chu, /Thanh nút cuối trang — nút: Lưu, chờ xác nhận/);
  assert.ok(ten.includes("Sơ đồ trang › Tạo đơn"), ten.join(" | "));
  assert.ok(tong(ds) <= NGAN_SACH_TOKEN);
});

test("Đ6: 'App dùng cơ sở dữ liệu gì?' ⇒ không đoạn kỹ thuật nào được chọn; lời nhắc có luật từ chối cơ sở dữ liệu", () => {
  const ds = chonDoan("App dùng cơ sở dữ liệu gì?", ["SUPER_ADMIN"]);
  for (const d of ds) assert.equal(viPhamKyThuat(`${d.ten}\n${d.chu}`), null, d.ten);
  assert.match(dungLoiNhac(["SUPER_ADMIN"], ds), /máy chủ, hạ tầng, cơ sở dữ liệu/);
});

test("Đ6: kho có (d) và (e); tổng kho lớn hơn ngân sách nhưng mỗi câu chỉ gửi ≤ 6.000 token", () => {
  const kho = chiaKho();
  assert.ok(kho.some((d) => d.ten.startsWith("Cấu trúc app › ")));
  assert.ok(tong(kho) > NGAN_SACH_TOKEN);
  assert.ok(tong(chonDoan("đơn hàng xác nhận phụ trách xếp xe thu tiền hoàn thành vai quyền", ["ADMIN"])) <= NGAN_SACH_TOKEN);
});
