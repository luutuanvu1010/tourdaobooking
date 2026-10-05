// Ghim mapper của dieu-phoi-doc.ts (kế hoạch Đợt 3 Task 3): giờ XẢY RA xuất bến (`departed_ms`) và hai con số giờ lái của chính sách — `xuatBenMs` là khoá
// TUỲ CHỌN nên typecheck không bắt được khi mapper quên. Tệp import không đuôi ⇒ gói bằng esbuild rồi nạp (khuôn chinh-sach.test.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import * as esbuild from "esbuild";
import { readFileSync } from "node:fs";

const built = await esbuild.build({ entryPoints: [new URL("./dieu-phoi-doc.ts", import.meta.url).pathname], bundle: true, format: "esm", platform: "neutral", target: "es2022", write: false, logLevel: "silent" });
const doc = (await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0]!.text).toString("base64")}`)) as any;
const ROW = { id: "t1", code: "CX-1", vehicle_id: "xe1", carrier_party_id: "p", service_date: "2026-10-05", planned_start_ms: 1, planned_end_ms: 2, earliest_start_ms: 1,
  rest_minutes_snapshot: 30, rest_override_reason_code: null, status: "ENDED", departed_at: "x", departed_ms: 123, ended_at: "y", ended_ms: 456, cancel_reason_code: null,
  end_reason_code: null, version: 3, last_cmd_id: "c", updated_at: "u", driver_party_id: "tx1", rented: 0, route_code: null, co_nguon_gia: 0,
  commitment_override_reason_code: null, commitment_override_key: null };

test("mapper chuyến mang giờ XẢY RA xuất bến (departed_ms) — gioLaiTaiXe cần nó cho chuyến đã chạy", () => {
  assert.equal(doc.khungChuyen(ROW).xuatBenMs, 123);
  assert.equal(doc.chuyenVao(ROW, { id: "xe1" }, null).xuatBenMs, 123);
  assert.equal(doc.khungChuyen({ ...ROW, departed_ms: null }).xuatBenMs, null);
});
test("Đợt 7 (ADR-0056 VK3-A): chuyenVao mang khoá phá lệ cam kết (commitment_override_key → camKetPhaLeKhoa, null giữ null); changVao chép xeRieng / choToiThieu từ lichChungChang", () => {
  assert.equal(doc.chuyenVao(ROW, { id: "xe1" }, null).camKetPhaLeKhoa, null);
  assert.equal(doc.chuyenVao({ ...ROW, commitment_override_reason_code: "PL1", commitment_override_key: "xe:xe1|l1:CX:0:15" }, { id: "xe1" }, null).camKetPhaLeKhoa, "xe:xe1|l1:CX:0:15");
  const lich = { legId: "l1", orderId: "o1", orderCode: "ĐH-1", direction: "OUT", pickupDate: "2026-10-05", pickupTime: "06:00", noiTra: null, soNguoi: 2, nguoiCuaDon: ["p1"],
    datGap: false, khoaNoiDon: "L:x", khoaNoiTra: null };
  const xr = doc.changVao({ ...lich, xeRieng: true, choToiThieu: 15 });
  assert.equal(xr.xeRieng, true);
  assert.equal(xr.choToiThieu, 15);
  const khong = doc.changVao({ ...lich, xeRieng: false, choToiThieu: null });
  assert.equal(khong.xeRieng, false);
  assert.equal(khong.choToiThieu, null);
});
test("mapper chính sách mang hai con số giờ lái", () => {
  const cs = doc.chinhSachVao({ id: "p", min_lead_minutes: 360, warn_lead_minutes: 120, rest_minutes: 30, require_manifest: 1, require_contract: 0, proxy_backdate_max_minutes: 180,
    duty_day_max_minutes: 500, trip_no_break_max_minutes: 200, valid_from_at: "a", created_at: "a", created_by: null });
  assert.equal(cs.dutyDayMaxMinutes, 500);
  assert.equal(cs.tripNoBreakMaxMinutes, 200);
});

test("khungBanVao: dòng khung bận của xe → VEHICLE, nhãn lý do, không tài xế", () => {
  assert.deepEqual(doc.khungBanVao({ id: "kb", vehicle_id: "xe1", start_ms: 1, end_ms: 2, reason_code: "BAN_XE_KHAC", reason_label: "Khác", withdrawn_at: null, version: 1, created_at: "a", updated_at: "a" }),
    { id: "kb", doiTuong: "VEHICLE", xeId: "xe1", taiXePartyId: null, batDauMs: 1, ketThucMs: 2, lyDoNhan: "Khác" });
});
test("Review Focus 4: mọi câu ĐỌC khung bận của Đợt 3 lọc subject = 'VEHICLE' tường minh (Kế toán có trip.view không thấy dòng DRIVER khi Đợt 6 mở)", () => {
  const src = readFileSync(new URL("./khung-ban-repo.ts", import.meta.url), "utf8");
  const cau = [...src.matchAll(/defineSql\("van-chuyen", "(khung_ban_[a-z_]+)",\s*`([^`]+)`/g)];
  assert.ok(cau.length >= 5, `chỉ thấy ${cau.length} câu`);
  for (const [, ten, sql] of cau) if (!/^\s*INSERT/i.test(sql!)) assert.match(sql!, /subject = 'VEHICLE'/, ten);
});
