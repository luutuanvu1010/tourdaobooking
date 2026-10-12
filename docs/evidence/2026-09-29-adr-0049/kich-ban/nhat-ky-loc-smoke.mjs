// Trang Nhật ký — bộ lọc có nhóm MỚI "Điều phối xe" (ADR-0049 lát 1.1: nhóm `trip` trong `src/shared/audit-actions.ts`, sáu hành động chính sách / lý do).
// `dot-a-smoke.mjs` không tới được phần này: nó mở /audit bằng Quản trị, mà từ ADR-0038 trang Nhật ký chỉ Toàn quyền xem được → đỏ sẵn ở
// "nhat-ky: thẻ đã dựng xong" (cả trên main). Kịch bản này mở bằng tài khoản CHỈ Toàn quyền (tạo trên D1 tạm, khuôn t2b-danh-ba-smoke).
// Dùng lại đúng cơ chế CDP của A2: startEnv()/ok từ ../../2026-09-20-a2/kich-ban/a2-cdp.mjs. Không cần mạng ngoài.
// Chạy từ GỐC repo, sau `npm run build:web`:
//   AXE_JS=<…/axe/package/axe.min.js> CHROME_BIN=<…/kich-ban/chrome-wrap.sh> node docs/evidence/2026-09-29-adr-0049/kich-ban/nhat-ky-loc-smoke.mjs
// Ghi ảnh vào $OUT/anh/ (mặc định docs/evidence/2026-09-29-adr-0049/anh/).
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ok, startEnv } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";
import { insertStaffSql } from "../../../../scripts/staff-lib.mjs";

const OUT = process.env.OUT ?? "docs/evidence/2026-09-29-adr-0049";
const AXE = readFileSync(process.env.AXE_JS, "utf8");
mkdirSync(join(OUT, "anh"), { recursive: true });
const DESK = { width: 1040, height: 800, mobile: false };
const MOB = { width: 390, height: 844, mobile: true };
const CHU = { name: "Chủ Chrome", phone: "0900000299", pin: "135791", permissions: ["SUPER_ADMIN"] };
const NHOM = "Điều phối xe";
// ADR-0050 VK1-B thêm hành động thứ bảy "Cập nhật điểm theo đơn" (trip_stops_synced — route ở A13). Từ A13 nhóm `trip` có thêm mọi lệnh chuyến (`trip_*`) mà
// danh sách cứng bảy nhãn không theo kịp — đỏ sẵn (39 nhãn ở 09f79a21). ADR-0104 Đ2 (2026-10-08): danh sách CỨNG đủ 47 nhãn (40 + bảy nhãn chuyển khách của gói A5, 9/10) đúng thứ tự khai ở
// src/shared/audit-actions.ts (gồm "Máy cập nhật chuyến theo đơn" — trip_order_synced). Thêm / đổi / bỏ nhãn nhóm này ⇒ sửa danh sách cùng commit (bài cố ý cứng).
const SAU_HANH_DONG = [
  "Đổi chính sách điều phối",
  "Thêm điều kiện xuất bến",
  "Đóng điều kiện xuất bến",
  "Đổi số khách theo hạng bằng",
  "Thêm lý do điều phối",
  "Sửa lý do điều phối",
  "Đổi mẫu đưa đón của dịch vụ",
  "Cập nhật khách theo đơn",
  "Cập nhật điểm theo đơn",
  "Máy cập nhật chuyến theo đơn",
  "Tạo chuyến xe",
  "Sửa chuyến xe",
  "Huỷ chuyến xe",
  "Xếp khách lên xe",
  "Rút khách khỏi xe",
  "Dời khách sang chuyến khác",
  "Xuất bến",
  "Xe đã tới điểm",
  "Đã đón khách",
  "Khách vắng",
  "Khách đã huỷ tại điểm",
  "Đã trả khách",
  "Đổi thứ tự điểm khi đang chạy",
  "Kết thúc chuyến",
  "Kết thúc chuyến gián đoạn",
  "Thêm điểm khi xe đang chạy",
  "Văn phòng báo huỷ khách",
  "Tài xế bổ sung tên khách",
  "Văn phòng điều chỉnh kết quả khách",
  "Văn phòng thu hồi xuất bến",
  "Gửi đề nghị chuyển khách", // gói A5 (ADR-0111): bảy nhãn nhật ký chuyển khách, đúng thứ tự khai ở src/shared/audit-actions.ts
  "Rút đề nghị chuyển khách",
  "Xe nhận không nhận khách",
  "Đề nghị chuyển khách hết giờ chờ",
  "Đề nghị chuyển khách chờ văn phòng duyệt",
  "Chuyển khách sang xe khác",
  "Văn phòng không duyệt đề nghị chuyển khách",
  "Đã gọi báo khách giờ hẹn mới",
  "Bỏ đánh dấu đã gọi báo",
  "Điều chỉnh chi phí xe thuê",
  "Đảo dòng chi phí xe thuê",
  "Lấy lại giá bảng cho chuyến xe thuê",
  "Nhập giá thoả thuận chuyến xe thuê",
  "Thêm giá thuê xe",
  "Kết thúc giá thuê xe",
  "Lưu tuyến (bảng giá xe)",
  "Lưu cỡ xe (bảng giá xe)",
];

const env = await startEnv();
try {
  for (const cau of (await insertStaffSql(CHU)).split("\n")) env.sql(cau);
  // Một dòng nhật ký nhóm mới bằng ĐƯỜNG THẬT (route chính sách, chỉ Toàn quyền).
  const c = await env.login(CHU);
  const r = await fetch(env.base + "/api/van-chuyen/chinh-sach-dieu-phoi", {
    method: "POST",
    headers: { "content-type": "application/json", origin: env.base, cookie: `${c.name}=${c.value}` },
    body: JSON.stringify({ minLeadMinutes: 240, warnLeadMinutes: 60, restMinutes: 45, requireManifest: true, proxyBackdateMaxMinutes: 180, dutyDayMaxMinutes: 480, tripNoBreakMaxMinutes: 240, departureWindowMinutes: 2880, refuseLeadMinutes: 720, officePhone: null, acceptWaitMinutes: 10, autoConfirmTransfer: true }),
  });
  assert.equal(r.status, 201, await r.text());

  const write = (name, x) => writeFileSync(join(OUT, "anh", name), Buffer.from(x.result.data, "base64"));
  const axe = async (p, label) => {
    if (!(await p.ev("typeof axe !== 'undefined'"))) await p.ev(`${AXE}\n;true`);
    const v = await p.ev(`axe.run(document).then((r) => r.violations.map((x) => ({ id: x.id, impact: x.impact, nodes: x.nodes.length, help: x.help })))`);
    const bad = v.filter((x) => x.impact === "critical" || x.impact === "serious");
    assert.deepEqual(bad, [], `axe (${label}): ${JSON.stringify(bad)}`);
  };

  for (const [kho, vp] of [["may-tinh", DESK], ["dien-thoai", MOB]]) {
    const p = await env.as(CHU, "/audit", vp);
    await p.waitFor(`[...document.querySelectorAll('#action optgroup')].some((g) => g.label === ${JSON.stringify(NHOM)})`, `${kho}: bộ lọc có nhóm "${NHOM}"`);
    const nhom = await p.ev(`(() => {
      const g = [...document.querySelectorAll('#action optgroup')].find((x) => x.label === ${JSON.stringify(NHOM)});
      return { options: [...g.querySelectorAll('option')].map((o) => o.textContent), values: [...g.querySelectorAll('option')].map((o) => o.value) };
    })()`);
    assert.deepEqual(nhom.options, SAU_HANH_DONG, `${kho}: đúng ${SAU_HANH_DONG.length} hành động nhóm "Điều phối xe", nhãn tiếng Việt`);
    assert.ok(nhom.values.every((v) => /^[a-z_]+$/.test(v)), `${kho}: giá trị là mã hành động`);
    // Chọn "Đổi chính sách điều phối" → danh sách chỉ còn dòng đó, chi tiết đúng câu máy chủ ghi.
    await p.ev(`(() => { const s = document.querySelector('#action'); s.value = 'dispatch_policy_changed'; s.dispatchEvent(new Event('change')); return true; })()`);
    const chon = vp.mobile ? "#list-cards" : "#list";
    await p.waitFor(`(document.querySelector(${JSON.stringify(chon)})?.textContent ?? '').includes('mốc tối thiểu 360 → 240 phút')`, `${kho}: dòng nhật ký chính sách hiện sau khi lọc`);
    const text = await p.ev(`document.querySelector(${JSON.stringify(chon)}).textContent`);
    assert.match(text, /Đổi chính sách điều phối/);
    assert.doesNotMatch(text, /dispatch_policy_changed|trip/, `${kho}: không lộ mã kỹ thuật`);
    write(`nhat-ky-loc-${kho}.png`, await p.send("Page.captureScreenshot", { format: "png" }));
    if (vp.mobile) await axe(p, `nhat-ky ${kho}`);
    assert.deepEqual(p.consoleErrors, [], `lỗi console (${kho}): ${p.consoleErrors}`);
    p.close();
    ok(`${kho}: bộ lọc Nhật ký có nhóm "${NHOM}" (${SAU_HANH_DONG.length} hành động); lọc "Đổi chính sách điều phối" ra đúng dòng, không lộ mã${vp.mobile ? ", axe không vi phạm critical/serious" : ""}`);
  }
} finally {
  await env.stop();
}
console.log("NHAT KY LOC SMOKE OK");
