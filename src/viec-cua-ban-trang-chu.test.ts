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
  assert.match(home, /can_\.includes\("dieuChinh"\) \? api<Api\.YeuCauDieuChinhListResponse>\("\/api\/ledger\/adjustment-requests"\)\.then\(\(r\) => r\.choDuyetChoToi\)/);
  assert.match(home, /can_\.includes\("gopY"\) \? api<Api\.FeedbackBadgeResponse>\("\/api\/feedback\/badge"\)\.then\(\(r\) => r\.queue\)/);
  assert.match(home, /Promise\.allSettled\(\[\s*can_\.includes\("dieuChinh"\)/);
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

test("khối số máy tính chỉ còn ô Doanh thu; điện thoại vẫn đủ bốn ô", () => {
  const mt = home.slice(home.indexOf("function renderSoMayTinh"), home.indexOf('/**\n * Một dòng "Chuyến đón hôm nay"'));
  assert.equal((mt.match(/oSoMayTinh\(/g) ?? []).length, 1);
  assert.match(mt, /Doanh thu của tôi/);
  const dt = home.slice(home.indexOf("function renderSoDienThoai"), home.indexOf("const LOI_SO_LIEU"));
  for (const nhan of ["Còn thiếu", "Doanh thu của tôi", "Chờ xác nhận", "Chưa phụ trách"]) assert.ok(dt.includes(`"${nhan}"`), nhan);
});
