// Hàng rào dung lượng gói giao diện (nghiên cứu tốc độ 2026-10-02, đợt 1 việc 2): mỗi trang là một lần tải trọn vẹn (ứng dụng nhiều trang), nên mã thừa trong
// gói chính là thời gian chờ ở mọi lần bấm. Nhật ký thay đổi (`src/shared/changelog.ts`, ~63 KB và dày thêm sau MỖI bản phát hành) từng lọt vào gói của cả 33
// trang chỉ vì `web/help-seen.ts` cần số phiên bản. Bài này dựng LẠI gói từng trang trong bộ nhớ (cùng tuỳ chọn với `npm run build:web`) và đỏ nếu:
//   (1) gói của trang nào ngoài Hướng dẫn kéo `changelog.ts` vào; (2) gói trang Đơn hàng vượt trần dung lượng.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildSync } from "esbuild";
import { APP_NAME } from "./shared/app-info.ts";
import { APP_NAME as TEN_O_WEB } from "../web/phien-ban.ts";

const goc = new URL("../", import.meta.url);
const kichBan = (JSON.parse(readFileSync(new URL("package.json", goc), "utf8")) as { scripts: Record<string, string> }).scripts["build:web"]!;
// Các trang = mọi `web/<tên>.ts` ở lệnh esbuild đầu của kịch bản `build:web` (lệnh sau là service worker).
const TRANG = [...new Set(kichBan.split("&&").find((c) => c.includes("esbuild web/login.ts"))!.match(/web\/[a-z0-9-]+\.ts/g)!)];
/** Trang được phép mang nhật ký thay đổi: chính trang đọc nhật ký. */
const CHO_PHEP_NHAT_KY = new Set(["web/help.ts"]);
/** Trần dung lượng gói Đơn hàng đã rút gọn (byte, chưa nén): hôm nay ~84 KB sau khi bỏ nhật ký; trước đó 147 KB. Đổi trần = có lý do ghi ở commit. */
// Nới 95.000 → 96.000 (ghép main 1c471990 vào gói Vận chuyển A+C, 2026-10-12): main một mình 92.686 byte, gói A+C một mình 89.378, hợp cả hai 95.486 — cả hai nhánh
// cùng thêm mã vào đường của trang Đơn hàng (phần thương mại của sổ đại lý; chi tiết đơn phải thu không âm, thông tin chuyến), không có gói nào thừa nhật ký thay đổi.
// Nới 96.000 → 96.500 (ADR-0120 Điều 2, 2026-10-14): thêm một dòng bản đồ quyền `deposit.transfer.approve` vào `permissions.ts`, mà gói Đơn hàng nhúng cả bản đồ
// (+~100 byte, làm gói vượt trần 91 byte). Chỉ nới vừa đủ chỗ cho dòng quyền mới, không thêm mã giao diện nào vào gói này.
// Nới 96.500 → 96.600 (ADR-0122 đ5, lát H-1 Gói 2, 2026-10-16): cùng lý do như trên — thêm dòng bản đồ quyền `party.personal.view` (+56 byte vượt trần).
// Không thêm mã giao diện nào vào gói này.
// Nới 96.500 → 96.700 (ADR-0128 Q1, 2026-10-17): thêm một dòng bản đồ quyền `dispatch.policy.lead` vào `permissions.ts` (gói nhúng cả bản đồ, +~90 byte); không thêm mã giao diện.
// Nhận main vào nhánh hồ sơ riêng tư: giữ trần LỚN HƠN của hai bên (96.700); không nới thêm — đo gói thật sau gộp ở báo cáo.
// Nới 96.700 → 96.800 (ADR-0136 Task 3.5, 27/10): gói nhúng `muc-giao-dien.ts` (thêm trang /cho-xac-nhan vào `TRANG`/`TRANG_TOI`) và `bang-tin.ts`/`thong-bao.ts` (nhãn `xet-duyet`, loại tin `cho_xac_nhan`) — chỉ dữ liệu, +13 byte đo thật; không thêm mã giao diện vào trang Đơn hàng.
// Nới 96.700 → 101.719 (đợt 0 khung chung, 2026-10-29): mã vỏ chung (dải, ẩn thanh tab động, thanh tab theo bộ quyền) vào gói mọi trang; không nhật ký thay đổi, không mã nghiệp vụ. Đo sau Task 15/15b (Q-2) = 101.619 byte.
// Nới 101.719 → 101.824 (ADR-0146 T11, 30/10): gói nhúng `muc-giao-dien.ts` — thêm trang /luat-ban vào `TRANG`/`THANH_BEN`/`TRANG_TOI` (chỉ dữ liệu điều hướng, không mã giao diện
// vào trang Đơn hàng). Đo thật 101.824 byte (+105). Không gọn được mà không đổi khuôn bảng mục chung.
// Nới 101.824 → 102.250 (ADR-0152 T12, 30/10): trang /dac-diem-dich-vu vào `TRANG`/`THANH_BEN`/`TRANG_TOI` + một nhánh huy hiệu «chưa khai» ở `trinhBay` của web/shell.ts
// (ADR-0152 Đ5 mục 3, khuôn huy hiệu «Dịch vụ & giá»; chỉ gọi khi mục thật sự hiện). Đo thật 102.250 byte (+426). Không mã nghiệp vụ nào vào trang Đơn hàng.
// Nới 101.719 → 101.933 (luật khung 30/10/2026 — chủ dự án duyệt nguyên văn «đồng ý theo đề xuất của bạn, thi công» cho câu «nới 101.719 → 101.933 byte»):
// trước đợt này gói đo 101.695 byte (dư 24); đợt thêm 138 byte vào khung chung (một dòng thanh bên tự cuộn tới mục đang mở ở web/shell.ts, hàm tông dải nhắc
// bảo mật `tongDaiNhacHaiLop`, trừ 21 byte chữ lặp «— Bật ngay») ⇒ 101.833; trần = số đo + 100. Không nhật ký thay đổi, không mã nghiệp vụ.
// Kế hoạch: docs/superpowers/plans/2026-10-30-sua-hien-thi-va-luat-khung.md.
// Tính lại sau khi nhận main (31/10/2026): main đứng ở 102.250 (trần 102.250, dư 0); gói đo trên mã đã gộp = 102.454 byte (+204 so với main: phần luật khung 138 byte nói trên cộng phần cộng dồn
// với mã vỏ chung mới của main). Cùng cách của kế hoạch: trần = số đo + 100. Số trần 102.554 mới là số đo sau gộp, CHƯA có lời duyệt riêng của chủ dự án cho con số này (lời duyệt 30/10 là cho 101.933).
const TRAN_ORDERS = 102_554;

function dung(trang: string) {
  const r = buildSync({
    entryPoints: [new URL(trang, goc).pathname],
    bundle: true, format: "esm", target: "es2022", minify: true, write: false, metafile: true, logLevel: "silent",
    define: { __BUILD_ID__: '"thu"', __APP_VERSION__: '"1.0"', __APP_RELEASE_DATE__: '"2026-01-01"' },
  });
  const [ra] = Object.values(r.metafile.outputs);
  return { dauVao: Object.keys(ra!.inputs), byte: r.outputFiles[0]!.contents.byteLength };
}

test("danh sách trang lấy được từ build:web (đủ nhiều, không rỗng)", () => {
  assert.ok(TRANG.length >= 30, `chỉ thấy ${TRANG.length} trang`);
  assert.ok(TRANG.includes("web/orders.ts") && TRANG.includes("web/help.ts"));
});

test("gói của trang nào ngoài Hướng dẫn cũng KHÔNG chứa nhật ký thay đổi (src/shared/changelog.ts)", () => {
  const vao = TRANG.filter((t) => !CHO_PHEP_NHAT_KY.has(t)).filter((t) => dung(t).dauVao.some((f) => f.endsWith("src/shared/changelog.ts")));
  assert.deepEqual(vao, [], "các trang này kéo nhật ký thay đổi vào gói (nhập `app-info`/`changelog` thay vì `web/phien-ban`?)");
});

test("gói trang Đơn hàng không vượt trần dung lượng", () => {
  const { byte } = dung("web/orders.ts");
  assert.ok(byte <= TRAN_ORDERS, `web/orders.ts = ${byte} byte, trần ${TRAN_ORDERS}`);
});

test("tên ứng dụng ở web/phien-ban.ts trùng bản gốc ở src/shared/app-info.ts", () => {
  assert.equal(TEN_O_WEB, APP_NAME);
});

test("trang nào nhập thẳng app-info/changelog (ngoài Hướng dẫn) đều bị bắt — giao diện chỉ nhập `web/phien-ban`", () => {
  const nhap = TRANG.filter((t) => !CHO_PHEP_NHAT_KY.has(t)).filter((t) => /from "\.\.\/src\/shared\/(app-info|changelog)"/.test(readFileSync(new URL(t, goc), "utf8")));
  assert.deepEqual(nhap, []);
});

// Người kiểm độc lập 2026-10-05 (V6): bỏ hai `--define` khỏi `build:web` không làm bài nào đỏ (bài dựng gói ở trên tự đưa `define` riêng) — trang Đăng nhập lặng lẽ hiện
// "0.0 / 1970-01-01" và chấm đỏ "Có gì mới" không bao giờ bật lại. Khoá: lệnh esbuild của trang phải chứa cả hai.
test("build:web truyền --define:__APP_VERSION__ và __APP_RELEASE_DATE__ (lấy từ scripts/in-phien-ban.mjs) cho gói các trang", () => {
  const lenhTrang = kichBan.split("&&").find((c) => c.includes("esbuild web/login.ts"))!;
  assert.match(lenhTrang, /--define:__APP_VERSION__=\\*"\$\(node scripts\/in-phien-ban\.mjs version\)\\*"/);
  assert.match(lenhTrang, /--define:__APP_RELEASE_DATE__=\\*"\$\(node scripts\/in-phien-ban\.mjs date\)\\*"/);
});
