// Bài đọc mã tĩnh cho khối "Việc của bạn" của Trang chủ máy tính (Task 6): DOM thật cần Chrome (kịch bản Task 7), ở đây khoá những điều đọc mã là thấy được.
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";

const doc = (p: string): string => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const home = doc("web/home.ts");
const html = doc("public/index.html");
const css = doc("public/app.css");

test("chỉ web/home.ts import viec-cua-ban (gói web/orders.ts sát trần byte)", () => {
  const ai: string[] = [];
  for (const dir of ["web/", "src/shared/"]) {
    for (const f of readdirSync(new URL(`../${dir}`, import.meta.url))) {
      if (!f.endsWith(".ts") || f.endsWith(".test.ts") || f === "viec-cua-ban.ts") continue;
      if (/from\s+["'][^"']*viec-cua-ban(?:\.ts)?["']/.test(doc(dir + f))) ai.push(dir + f);
    }
  }
  assert.deepEqual(ai, ["web/home.ts"]);
});

test("nguồn ngoài chỉ gọi khi nguonCanTai đòi; gopY lấy trường queue; unpaid-summary gọi một lần", () => {
  assert.match(home, /const canTai = nguonCanTai\(staff\);/, "taiDashboard phải hỏi nguonCanTai(staff)");
  assert.match(home, /canTai\.includes\("dieuChinh"\) \? api<Api\.YeuCauDieuChinhListResponse>\("\/api\/ledger\/adjustment-requests"\)\.then\(\(r\) => r\.choDuyetChoToi\)/);
  assert.match(home, /canTai\.includes\("gopY"\) \? api<Api\.FeedbackBadgeResponse>\("\/api\/feedback\/badge"\)\.then\(\(r\) => r\.queue\)/);
  assert.match(home, /Promise\.allSettled\(\[\s*canTai\.includes\("dieuChinh"\)/);
  assert.match(home, /soTuKetQua\(ngoai\[0\]\)/);
  assert.match(home, /soTuKetQua\(ngoai\[1\]\)/);
  assert.doesNotMatch(home, /status === "fulfilled" \? r\.value : null\)/, "đổi kết quả allSettled → số qua soTuKetQua (có bài), không tự viết lại trong trang");
  assert.equal((home.match(/\/api\/ledger\/unpaid-summary/g) ?? []).length, 1);
  assert.doesNotMatch(home, /hasPermission/);
});

test("khối có chỗ trong trang, đủ neo cuộn, điện thoại ẩn, chỉ ≥641px hiện", () => {
  assert.match(html, /<section id="dash-viec" class="dash-viec" aria-labelledby="dash-viec-h" hidden><\/section>/);
  assert.match(html, /id="dash-today"/);
  assert.match(html, /id="dash-review"/);
  assert.ok(html.indexOf('id="dash-viec"') < html.indexOf('id="dash-grid"'), "#dash-viec phải đứng trước #dash-grid");
  assert.match(css, /\.dash-loi-tat, \.dash-viec \{ display: none; \}/, "mặc định (điện thoại) ẩn");
  assert.match(css, /@media \(min-width: 641px\) \{[\s\S]*\n  \.dash-viec \{ display: flex;/, "chỉ ≥641px mới hiện");
  assert.match(home, /prefers-reduced-motion: reduce/);
  assert.match(home, /can\(staff, "order\.create"\) \? h\("a", \{ class: "btn btn-accent", href: "\/order-form" \}, "Tạo đơn"\)/);
});

test("I-1: nguồn lỗi của 'Cần xem lại' → xemLai null, không nuốt thành 0", () => {
  const lr = home.slice(home.indexOf("async function loadReview"), home.indexOf("function reviewRow"));
  assert.match(lr, /layDanhSachSapHet\(\)\.then\(\(r\) => r\.count\)/, "đọc giấy tờ qua lời gọi biết lỗi (demSapHetHan nuốt lỗi thành 0 và nằm trong gói orders — không đổi)");
  assert.match(lr, /catalogRes\.status === "rejected"/);
  assert.match(home, /soXemLaiGanNhat = soXemLai\(review\.alerts, review\.loi\)/);
});

test("I-1 vòng 2: 'Thử lại' tải giấy tờ MỚI (bỏ lời hứa lỗi đã nhớ của vc-dem), không sửa vc-dem", () => {
  const lr = home.slice(home.indexOf("async function loadReview"), home.indexOf("function reviewRow"));
  assert.match(lr, /staff: Staff, taiMoi: boolean/);
  assert.match(lr, /taiMoi \? api<Api\.ExpiringListResponse>\("\/api\/van-chuyen\/sap-het-han"\)\.then\(\(r\) => r\.count\) : layDanhSachSapHet\(\)\.then\(\(r\) => r\.count\)/);
  assert.match(home, /lamMoi \? undefined : loadReview\(staff, taiMoi \|\| soXemLaiGanNhat === null\)/);
  assert.match(home, /async function taiDashboard\(staff: Staff, lamMoi = false, taiMoi = false\)/);
  assert.match(home, /void taiDashboard\(staff, false, true\)\.finally/, "Thử lại của thẻ");
  assert.match(home, /void taiDashboard\(nguoiXem, false, true\)/, "Thử lại của dải lỗi chung");
});

test("I-2: hai nguồn ngoài chỉ tải khi khối thật sự hiện, tải lại khi cửa sổ rộng ra, làm mới lặng lẽ dùng lại số cũ", () => {
  assert.match(home, /byId\("dash-dai"\)\.offsetParent !== null/);
  assert.match(home, /addEventListener\("resize"/);
  assert.match(home, /!ngoaiDaTai && khoiHien\(\)/);
  assert.match(home, /ngoaiDaTai = /);
});

test("I-4: thẻ mang viên nhãn phạm vi từ bảng chung, cùng kiểu .dash-pham-vi của ô số", () => {
  const tv = home.slice(home.indexOf("function theViec"), home.indexOf("function renderViec"));
  assert.match(tv, /PHAM_VI_O_TRANG_CHU\[KHOA_PHAM_VI\[t\.khoa\]\]/);
  assert.match(tv, /dash-pham-vi is-/);
  assert.match(tv, /NHAN_PHAM_VI\[/);
});

test("I-5: cuộn tới khối không làm đồng hồ phút ngừng vẽ lại (tiêu điểm vào tiêu đề, chỉ nút ngày / dòng chuyến mới chặn)", () => {
  assert.doesNotMatch(home, /byId\("dash-today"\)\.contains\(document\.activeElement\)/);
  assert.match(home, /byId\("dash-today-days"\)\.contains\(document\.activeElement\) \|\| byId\("dash-today-list"\)\.contains\(document\.activeElement\)/);
});

test("câu 'Còn N việc nữa' nói việc bị dồn, không trỏ 'các mục bên dưới'", () => {
  assert.match(home, /cauConLai\(conLai, conLaiThe\)/);
  assert.doesNotMatch(home, /xem ở các mục bên dưới/);
});

test("khối số máy tính chỉ còn ô Doanh thu; điện thoại vẫn đủ bốn ô", () => {
  const mt = home.slice(home.indexOf("function renderSoMayTinh"), home.indexOf('/**\n * Một dòng "Chuyến đón hôm nay"'));
  assert.equal((mt.match(/oSoMayTinh\(/g) ?? []).length, 1);
  assert.match(mt, /Doanh thu của tôi/);
  const dt = home.slice(home.indexOf("function renderSoDienThoai"), home.indexOf("const LOI_SO_LIEU"));
  for (const nhan of ["Còn thiếu", "Doanh thu của tôi", "Chờ xác nhận", "Chưa phụ trách"]) assert.ok(dt.includes(`"${nhan}"`), nhan);
});
