// Bài đọc mã tĩnh cho thẻ «Đang chờ bạn» (trước 31/10: khối "Việc của bạn") và dải việc gấp của Trang chủ máy tính: DOM thật cần Chrome (kịch bản Task 7), ở đây khoá những điều đọc mã là thấy được.
// Phương án A (31/10) đổi cấu trúc: bốn thẻ lớn → danh sách dòng trong một thẻ; các bất biến I-1…I-5 giữ nguyên ý, chỉ đổi tên hàm / mã neo.
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

test("thẻ «Đang chờ bạn» có chỗ trong cột phụ, đủ neo cuộn, điện thoại ẩn, chỉ ≥641px hiện; dải việc gấp đứng trước lưới", () => {
  assert.match(html, /<section id="dash-dang-cho" class="dash-dang-cho" aria-labelledby="dash-dang-cho-h" hidden>/);
  assert.match(html, /<section id="dash-gap" class="dash-gap" aria-label="Việc gấp" hidden><\/section>/);
  assert.match(html, /id="dash-today"/);
  assert.match(html, /id="dash-review"/);
  assert.ok(html.indexOf('id="dash-gap"') < html.indexOf('id="dash-grid"'), "#dash-gap phải đứng trước #dash-grid");
  assert.ok(html.indexOf('id="dash-dang-cho"') > html.indexOf('id="dash-grid"'), "#dash-dang-cho nằm TRONG #dash-grid (cột phụ)");
  assert.ok(html.indexOf('id="dash-review"') < html.indexOf('id="dash-today"'), "DOM: Cần xem lại trước Chuyến đón (thứ tự đọc điện thoại); máy tính đảo bằng column-reverse");
  assert.doesNotMatch(html, /id="dash-viec"|dash-xuong-viec|id="dash-tl"/, "bốn thẻ «Việc của bạn» và dòng thời gian trang trí đã bỏ");
  assert.match(css, /\.dash-dai, \.dash-gap, \.dash-so-mt, \.dash-xuong-mt, \.dash-sap-toi, \.dash-loi-tat, \.dash-dang-cho \{ display: none; \}/, "mặc định (điện thoại) ẩn");
  assert.match(css, /\.dash-cot-chinh, \.dash-cot-phu \{ display: contents; \}/, "điện thoại: hai vỏ cột không đổi thứ tự đọc");
  assert.match(css, /@media \(min-width: 641px\) \{[\s\S]*\n  \.dash-dang-cho \{ display: flex;/, "chỉ ≥641px mới hiện");
  assert.match(css, /@media \(min-width: 641px\) \{[\s\S]*\n  \.dash-gap \{ display: flex;/, "dải gấp chỉ ≥641px");
  assert.match(css, /@media \(min-width: 1100px\) \{\n  \.dash-grid, \.dash-xuong-mt \{ grid-template-columns: minmax\(0, 1fr\) var\(--w-home-side-sm\);/, "hai cột từ 1100px (luật khung 3)");
  assert.match(home, /prefers-reduced-motion: reduce/);
  assert.doesNotMatch(home, /href: "\/order-form" \}, "Tạo đơn"/, "nút «Tạo đơn» san hô của trạng thái rỗng đã bỏ");
});

test("luật khung 7: nút san hô (btn-accent) duy nhất của Trang chủ máy tính là «Xác nhận ngay» của dải việc gấp", () => {
  assert.equal([...home.matchAll(/btn btn-accent/g)].length, 1);
  assert.match(home, /h\("a", \{ class: "btn btn-accent", href: "\/cho-xac-nhan" \}, "Xác nhận ngay"\)/);
});

test("dải việc gấp: luật ở viec-gap.ts, dựng cùng lúc với lưới (không nhảy bố cục), cập nhật theo đồng hồ phút, không giật tiêu điểm", () => {
  assert.match(home, /viecGap\(staff, ds, Date\.now\(\)\)/);
  assert.match(home, /datDaiGap\(staff, dsDonCho\);/);
  assert.ok(home.indexOf("datDaiGap(staff, dsDonCho);") < home.indexOf('byId("dash-grid").hidden = false;'), "dải dựng TRƯỚC khi hiện lưới, cùng một lượt chạy");
  assert.match(home, /!byId\("dash-gap"\)\.contains\(document\.activeElement\)\) datDaiGap\(nguoiXem, dsDonChoGanNhat\)/);
  assert.match(home, /api<Api\.DonChoXacNhanResponse>\("\/api\/orders\/cho-xac-nhan"\)\.then\(\(r\) => r\.don, \(\) => null\)/, "giữ cả danh sách (ngayDi, guiLuc) cho dải; lỗi → null, không phải rỗng");
  assert.equal((home.match(/\/api\/orders\/cho-xac-nhan/g) ?? []).length, 1, "một lời gọi cho cả thẻ, dải điện thoại và dải gấp");
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

test("I-4: dòng «Đang chờ bạn» mang viên nhãn phạm vi từ bảng chung, cùng kiểu .dash-pham-vi của ô số", () => {
  const tv = home.slice(home.indexOf("function dongDangCho"), home.indexOf("function renderDangCho"));
  assert.match(tv, /PHAM_VI_O_TRANG_CHU\[KHOA_PHAM_VI\[t\.khoa\]\]/);
  assert.match(tv, /dash-pham-vi is-/);
  assert.match(tv, /NHAN_PHAM_VI\[/);
});

test("I-5: cuộn tới khối không làm đồng hồ phút ngừng vẽ lại (tiêu điểm vào tiêu đề, chỉ nút ngày / dòng chuyến mới chặn)", () => {
  assert.doesNotMatch(home, /byId\("dash-today"\)\.contains\(document\.activeElement\)/);
  assert.match(home, /byId\("dash-today-days"\)\.contains\(document\.activeElement\) \|\| byId\("dash-today-list"\)\.contains\(document\.activeElement\)/);
});

test("«Đang chờ bạn» là danh sách: không cắt bốn dòng (gồm cả phần dồn), ẩn cả thẻ khi không dòng nào, cột phụ ẩn khi cả hai thẻ ẩn", () => {
  assert.match(home, /return \[\.\.\.r\.the, \.\.\.r\.conLaiThe\];/);
  const rd = home.slice(home.indexOf("function renderDangCho"), home.indexOf("/** Dải việc gấp đầu trang"));
  assert.match(rd, /if \(dong\.length === 0\) \{\s*sec\.hidden = true;/);
  assert.match(home, /byId\("dash-cot-phu"\)\.hidden = byId\("dash-dang-cho"\)\.hidden && byId\("dash-so-mt"\)\.hidden;/);
  assert.doesNotMatch(home, /xem ở các mục bên dưới/);
  assert.doesNotMatch(home, /chuyenHomNay: data\.today\.length/, "«Đơn đi hôm nay» không còn là dòng chờ — chính thẻ Chuyến đón");
});

test("«Chờ đối chiếu» / «Thu trước đơn huỷ»: khối chi tiết cũ còn nguyên (nút «Bên kia đã nhận»), hàm tải trả SỐ cho dòng, lỗi → null; làm mới lặng lẽ giữ số cũ", () => {
  assert.match(html, /id="dash-doi-chieu"/);
  assert.match(html, /id="dash-thu-truoc"/);
  assert.match(home, /async function taiDoiChieu\(staff: Staff, lamMoi = false\): Promise<number \| null \| undefined>/);
  assert.match(home, /async function taiThuTruoc\(staff: Staff, lamMoi = false\): Promise<number \| null \| undefined>/);
  assert.match(home, /return lamMoi && typeof soDoiChieuGanNhat === "number" \? soDoiChieuGanNhat : null;/);
  assert.match(home, /return lamMoi && typeof soThuTruocGanNhat === "number" \? soThuTruocGanNhat : null;/);
  assert.match(home, /taiDoiChieu\(staff, lamMoi\),/);
  assert.match(home, /taiThuTruoc\(staff, lamMoi\),/);
  assert.match(home, /doiChieu: soDoiChieu, thuTruoc: soThuTruoc/);
  assert.match(home, /data-action": "ben-kia-da-nhan"/, "nút «Bên kia đã nhận» vẫn ở khối chi tiết của Trang chủ");
});

test("biểu đồ doanh thu giãn theo thẻ: chiều cao theo token tối thiểu / tối đa, không còn cố định bằng --h-chart ở thẻ máy tính; cột đặt tuyệt đối trong ô", () => {
  assert.match(css, /\.dash-smt-o \.dash-chart-bars \{[^}]*flex: 1 1 var\(--h-chart-min\)[^}]*min-height: var\(--h-chart-min\)[^}]*max-height: var\(--h-chart-max\)/);
  assert.doesNotMatch(css, /\.dash-smt-o \.dash-chart-bars \{[^}]*height: var\(--h-chart\)/, "thẻ máy tính không còn cố định chiều cao biểu đồ");
  assert.match(css, /\.dash-smt-o \.dash-chart-bar \{ position: absolute;/);
  assert.match(home, /h\("span", \{ class: "dash-chart-cot", "aria-hidden": "true" \}/);
  for (const t of ["--h-chart-min", "--h-chart-max"]) assert.match(css, new RegExp(`\\n  ${t}: \\d+px;`), `${t} khai ở :root`);
});

test("bảng Chuyến đón thẳng cột (luật khung 3, 6): ba cột, nơi đón ở cột giữa, không cắt tên / số khách / tiền, không dòng thời gian trang trí", () => {
  assert.match(css, /\.dash-today-row \{ display: grid; grid-template-columns: var\(--w-trip-gio\) minmax\(0, 1fr\) var\(--w-trip-tien\);/);
  const rows = home.slice(home.indexOf("function todayRow"), home.indexOf("/** Ba ngày của khối"));
  assert.match(rows, /const noiDon: Child = o\.trip\.pickupPlace \? h\("span", \{ class: "dash-today-place icon-label" \}/);
  assert.match(rows, /noiDon,\s*\n\s*h\("span", \{ class: "muted dash-today-sub" \}/, "nơi đón nằm giữa tên khách và dòng dịch vụ (hai dòng riêng)");
  assert.doesNotMatch(home, /veDongThoiGian|dash-tl/);
  const mt = css.slice(css.indexOf("  /* Bảng Chuyến đón (Phương án A"), css.indexOf("  /* Thẻ Doanh thu tuần này"));
  assert.ok(mt.length > 500, "tìm được khối CSS chuyến đón máy tính");
  assert.doesNotMatch(mt, /text-overflow: ellipsis|-webkit-line-clamp/, "chuyến đón máy tính không rút «…» bất kỳ chữ nào");
  assert.match(css, /\.dash-today-time \{[^}]*white-space: nowrap/);
});

test("khối số máy tính chỉ còn ô Doanh thu; điện thoại vẫn đủ bốn ô", () => {
  const mt = home.slice(home.indexOf("function renderSoMayTinh"), home.indexOf('/**\n * Một dòng "Chuyến đón hôm nay"'));
  assert.equal((mt.match(/oSoMayTinh\(/g) ?? []).length, 1);
  assert.match(mt, /Doanh thu của tôi/);
  const dt = home.slice(home.indexOf("function renderSoDienThoai"), home.indexOf("const LOI_SO_LIEU"));
  for (const nhan of ["Còn thiếu", "Doanh thu của tôi", "Đơn nháp", "Chưa phụ trách"]) assert.ok(dt.includes(`"${nhan}"`), nhan);
});
