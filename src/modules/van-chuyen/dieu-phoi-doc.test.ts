// Ghim mapper của dieu-phoi-doc.ts (kế hoạch Đợt 3 Task 3): giờ XẢY RA xuất bến (`departed_ms`) và hai con số giờ lái của chính sách — `xuatBenMs` là khoá
// TUỲ CHỌN nên typecheck không bắt được khi mapper quên. Tệp import không đuôi ⇒ gói bằng esbuild rồi nạp (khuôn chinh-sach.test.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import * as esbuild from "esbuild";

const built = await esbuild.build({ entryPoints: [new URL("./dieu-phoi-doc.ts", import.meta.url).pathname], bundle: true, format: "esm", platform: "neutral", target: "es2022", write: false, logLevel: "silent" });
const doc = (await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0]!.text).toString("base64")}`)) as any;
const ROW = { id: "t1", code: "CX-1", vehicle_id: "xe1", carrier_party_id: "p", service_date: "2026-10-05", planned_start_ms: 1, planned_end_ms: 2, earliest_start_ms: 1,
  rest_minutes_snapshot: 30, rest_override_reason_code: null, status: "ENDED", departed_at: "x", departed_ms: 123, ended_at: "y", ended_ms: 456, cancel_reason_code: null,
  end_reason_code: null, version: 3, last_cmd_id: "c", updated_at: "u", driver_party_id: "tx1" };

test("mapper chuyến mang giờ XẢY RA xuất bến (departed_ms) — gioLaiTaiXe cần nó cho chuyến đã chạy", () => {
  assert.equal(doc.khungChuyen(ROW).xuatBenMs, 123);
  assert.equal(doc.chuyenVao(ROW, { id: "xe1" }, null).xuatBenMs, 123);
  assert.equal(doc.khungChuyen({ ...ROW, departed_ms: null }).xuatBenMs, null);
});
test("mapper chính sách mang hai con số giờ lái", () => {
  const cs = doc.chinhSachVao({ id: "p", min_lead_minutes: 360, warn_lead_minutes: 120, rest_minutes: 30, require_manifest: 1, require_contract: 0, proxy_backdate_max_minutes: 180,
    duty_day_max_minutes: 500, trip_no_break_max_minutes: 200, valid_from_at: "a", created_at: "a", created_by: null });
  assert.equal(cs.dutyDayMaxMinutes, 500);
  assert.equal(cs.tripNoBreakMaxMinutes, 200);
});
