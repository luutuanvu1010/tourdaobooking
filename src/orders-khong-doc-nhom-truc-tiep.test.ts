// HÀNG RÀO ADR-0118 (Đợt 2 lượt 1, Task 3; Ruling R-C/R-T; ghi ở docs/SO-HANG-RAO.md):
//  (A) `orders` KHÔNG đọc bảng của `catalog` (`ctl_group`, `ctl_service_group`) — cờ «Có đưa đón» chỉ đi qua view công bố `v_ctl_service_transfer` (ADR Đ2). Tên view có `ctl_` nhưng
//      `_` là ký tự chữ nên `\\bctl_group\\b` KHÔNG khớp `v_ctl_service_group`; quét bỏ chú thích để lời giải thích trong mã không làm đỏ oan.
//  (B) Chốt chặn «nhóm tắt đưa đón» còn đủ ở MỌI cửa ghi chặng: các hàm lập kế hoạch ghi chặng của service.ts đều gọi `kiemNhomChoPhepDuaDon`, hàm ĐÓNG chặng thì KHÔNG (đường thoát);
//      mọi route trong orders/index.ts có lời gọi ghi chặng (createOrder, updateDraftOrder, updateTrip, addLeg, soanSuaChang, soanThayChang) phải đi qua một cửa có chốt; route xác nhận
//      đơn gọi `kiemNhomChoPhepDuaDon`. Đây là lưới VĂN BẢN rẻ — hành vi thật do src/modules/orders/dua-don-nhom-tat.test.ts canh; lưới này bắt một CỬA MỚI thêm sau mà quên chốt.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("../", import.meta.url).pathname;
/** Bỏ chú thích `/* … *\/` và `//` (không đụng `//` trong chuỗi URL kiểu `https://`). */
const boChuThich = (s: string): string => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1");
const doc = (rel: string): string => boChuThich(readFileSync(join(ROOT, rel), "utf8"));

function tepOrders(dir = join(ROOT, "src/modules/orders")): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? tepOrders(p) : f.endsWith(".ts") && !f.endsWith(".test.ts") ? [p] : [];
  });
}

test("(A) orders không đọc bảng ctl_group / ctl_service_group — chỉ view công bố v_ctl_* (ADR-0118 Đ2)", () => {
  const sai: string[] = [];
  for (const p of tepOrders()) {
    const src = boChuThich(readFileSync(p, "utf8"));
    for (const m of src.matchAll(/\b(ctl_group|ctl_service_group)\b/g)) sai.push(`${p.slice(ROOT.length)}: ${m[1]}`);
  }
  assert.deepEqual(sai, [], `orders đọc thẳng bảng của catalog: ${sai.join("; ")}`);
});

test("(A) tự kiểm bộ quét: bắt tên bảng trần, bỏ qua view v_ctl_service_group, bỏ qua chú thích", () => {
  const quet = (s: string) => [...boChuThich(s).matchAll(/\b(ctl_group|ctl_service_group)\b/g)].map((m) => m[1]);
  assert.deepEqual(quet("SELECT 1 FROM ctl_group g"), ["ctl_group"]);
  assert.deepEqual(quet("JOIN ctl_service_group s ON 1"), ["ctl_service_group"]);
  assert.deepEqual(quet("SELECT group_code FROM v_ctl_service_group WHERE 1"), [], "v_ctl_* là view công bố — được đọc");
  assert.deepEqual(quet("SELECT 1 FROM v_ctl_service_transfer"), []);
  assert.deepEqual(quet("// không đọc ctl_group\n/* ctl_service_group */ const x = 1;"), []);
});

/** Thân hàm `name` (đến `export` kế tiếp hoặc hết tệp). */
function thanHam(src: string, name: string): string {
  const i = src.search(new RegExp(`export (async )?function ${name}\\b`));
  assert.ok(i >= 0, `không thấy hàm ${name}`);
  const j = src.indexOf("\nexport ", i + 10);
  return src.slice(i, j < 0 ? undefined : j);
}

test("(B) service.ts: mọi hàm lập kế hoạch GHI chặng gọi kiemNhomChoPhepDuaDon; hàm ĐÓNG chặng thì không (đường thoát)", () => {
  const svc = doc("src/modules/orders/service.ts");
  for (const ten of ["planAddLeg", "planEditLeg", "planPaxOverrideNhap", "planReplaceLeg", "resolveLegPlaces"]) {
    assert.match(thanHam(svc, ten), /kiemNhomChoPhepDuaDon\(/, `${ten} mất chốt chặn «nhóm tắt đưa đón»`);
  }
  assert.doesNotMatch(thanHam(svc, "planCloseLeg"), /kiemNhomChoPhepDuaDon\(/, "đóng chặng phải vẫn được khi nhóm tắt đưa đón (ADR-0118 Đ3(c))");
});

/** Cắt orders/index.ts thành từng route theo `route("METHOD", "path"`. */
function cacRoute(src: string): { ten: string; than: string }[] {
  const mau = /route\("(GET|POST|PUT|PATCH|DELETE)", "([^"]+)"/g;
  const dau = [...src.matchAll(mau)];
  return dau.map((m, i) => ({ ten: `${m[1]} ${m[2]}`, than: src.slice(m.index!, dau[i + 1]?.index ?? src.length) }));
}
const GHI_CHANG = /\b(createOrder|updateDraftOrder|updateTrip|addLeg|soanSuaChang|soanThayChang)\(/;
const CUA_CO_CHOT = /\b(resolveLegPlaces|kiemNhomChoPhepDuaDon|planAddLeg|planReplaceLeg|lenhSuaChang|lenhSoNguoiVeNhap)\(/;

test("(B) orders/index.ts: mọi route có lời gọi ghi chặng đi qua một cửa có chốt (trừ route ĐÓNG chặng); route xác nhận gọi chốt", () => {
  const routes = cacRoute(doc("src/modules/orders/index.ts"));
  const ghi = routes.filter((r) => GHI_CHANG.test(r.than));
  assert.ok(ghi.length >= 6, `phải thấy ≥ 6 route ghi chặng (lập, lưu nháp, sửa chuyến, thêm, sửa, thay, đóng), thấy ${ghi.length}: ${ghi.map((r) => r.ten).join(" | ")}`);
  const thieu = ghi.filter((r) => !/planCloseLeg\(/.test(r.than) && !CUA_CO_CHOT.test(r.than)).map((r) => r.ten);
  assert.deepEqual(thieu, [], `route ghi chặng không qua cửa có chốt «nhóm tắt đưa đón»: ${thieu.join(" | ")}`);
  const xacNhan = routes.find((r) => r.ten === "POST /api/orders/:id/status");
  assert.ok(xacNhan, "không thấy route trạng thái");
  // Dựng lại trên main 28/10: cửa xác nhận đi qua cổng chung `kiemCongXacNhan` (Task 3.2b, ADR-0136) — chốt nằm trong cổng đó (bài kế tiếp).
  assert.match(xacNhan!.than, /kiemCongXacNhan\(/, "route xác nhận không còn đi qua cổng chung có chốt «nhóm tắt đưa đón»");
  const trip = routes.find((r) => r.ten === "PUT /api/orders/:id/trip");
  assert.match(trip!.than, /kiemNhomChoPhepDuaDon\(/, "route sửa chuyến (cửa thứ sáu, Ruling R-T) mất chốt chặn");
});

test("(C) mọi cửa XÁC NHẬN ra đời sau 14/10 có chốt «nhóm tắt đưa đón» đứng TRƯỚC cổng chọn đón (ADR-0118 Đ3 (b) × ADR-0134 Đ2; dựng lại trên main 28/10)", () => {
  const chung = doc("src/modules/orders/xac-nhan-chung.ts");
  const cong = thanHam(chung, "kiemCongXacNhan");
  const iChot = cong.search(/congNhomTatDuaDon\(/);
  const iChon = cong.search(/thieuChonDon\(/);
  assert.ok(iChot > 0 && iChon > 0 && iChot < iChon, "kiemCongXacNhan: chốt nhóm tắt phải có và đứng trước cổng chọn đón");
  assert.match(thanHam(chung, "congNhomTatDuaDon"), /kiemNhomChoPhepDuaDon\(/, "congNhomTatDuaDon phải gọi hàm chốt một nguồn");
  const routes = cacRoute(doc("src/modules/orders/xac-nhan-route.ts"));
  const gxn = routes.find((r) => r.ten === "POST /api/orders/:id/gui-xac-nhan");
  assert.ok(gxn, "không thấy route Gửi xác nhận");
  const a = gxn!.than.search(/congNhomTatDuaDon\(/);
  const b = gxn!.than.search(/thieuChonDon\(/);
  assert.ok(a > 0 && b > 0 && a < b, "Gửi xác nhận (không qua kiemCongXacNhan): phải gọi congNhomTatDuaDon trước cổng chọn đón");
  for (const ten of ["POST /api/orders/:id/quyet-dinh", "POST /api/orders/:id/gui-don"]) {
    const r = routes.find((x) => x.ten === ten);
    assert.ok(r, `không thấy route ${ten}`);
    assert.match(r!.than, /kiemCongXacNhan\(/, `${ten} phải đi qua cổng chung có chốt`);
  }
});
