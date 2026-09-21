import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAINTENANCE_CONTACT_PHONE, MAX_MAINTENANCE_MS, checkMaintenanceInput, formatCountdown, isAllowedPhone, isBlocked, maintenanceMessage, maintenanceMessageParts, parseAllowedPhones,
  type MaintenanceState,
} from "./maintenance.ts";

const NOW = Date.parse("2026-09-22T03:00:00.000Z");
const ON: MaintenanceState = { on: true, endsAt: "2026-09-22T05:00:00.000Z", allowedPhones: [MAINTENANCE_CONTACT_PHONE] };
const OFF: MaintenanceState = { ...ON, on: false };

test("SĐT liên hệ của chủ dự án là 0989929373 và là dạng chuẩn hoá (khoá nhầm số = khoá chính người mở khoá)", () => {
  assert.equal(MAINTENANCE_CONTACT_PHONE, "0989929373");
  assert.deepEqual(parseAllowedPhones(MAINTENANCE_CONTACT_PHONE), ["0989929373"]);
});

test("parseAllowedPhones: chuẩn hoá, bỏ mục hỏng/trùng/rỗng, chịu được null", () => {
  assert.deepEqual(parseAllowedPhones("0989 929 373, +84989929373 ,abc,,0912345678"), ["0989929373", "0912345678"]);
  assert.deepEqual(parseAllowedPhones(null), []);
  assert.deepEqual(parseAllowedPhones(""), []);
  assert.deepEqual(parseAllowedPhones("hỏng"), []);
});

test("isBlocked: TẮT thì không chặn ai; BẬT thì chặn mọi SĐT ngoài danh sách (kể cả SĐT không tồn tại/không chuẩn hoá được)", () => {
  assert.equal(isBlocked(OFF, "0900000001"), false);
  assert.equal(isBlocked(OFF, "0989929373"), false);
  assert.equal(isBlocked(ON, "0900000001"), true);
  assert.equal(isBlocked(ON, "hỏng"), true);
  assert.equal(isBlocked(ON, ""), true);
});

test("isBlocked: chủ được qua dù gõ SĐT kiểu khác (chuẩn hoá giống lúc đăng nhập)", () => {
  assert.equal(isBlocked(ON, "0989929373"), false);
  assert.equal(isBlocked(ON, "0989 929 373"), false);
  assert.equal(isBlocked(ON, "+84 989 929 373"), false);
  assert.equal(isBlocked(ON, "84989929373"), false);
});

test("isBlocked: danh sách được phép rỗng khi BẬT = chặn tất cả (không mở toang do cấu hình rỗng)", () => {
  assert.equal(isBlocked({ ...ON, allowedPhones: [] }, "0989929373"), true);
});

test("formatCountdown: giờ/phút/giây, bỏ đơn vị lớn đang bằng 0, làm tròn lên giây", () => {
  assert.equal(formatCountdown(3 * 3600_000 + 5 * 60_000 + 9_000), "3 giờ 05 phút 09 giây");
  assert.equal(formatCountdown(23 * 60_000 + 10_000), "23 phút 10 giây");
  assert.equal(formatCountdown(42_000), "42 giây");
  assert.equal(formatCountdown(1), "1 giây");
  assert.equal(formatCountdown(3600_000), "1 giờ 00 phút 00 giây");
  assert.equal(formatCountdown(49 * 3600_000 + 60_000), "49 giờ 01 phút 00 giây");
});

test("thông điệp còn giờ: đúng chữ chủ dự án đã chốt, đếm ngược nằm trong câu", () => {
  const parts = maintenanceMessageParts("2026-09-22T04:23:10.000Z", NOW);
  assert.equal(parts.countdown, "1 giờ 23 phút 10 giây");
  assert.equal(
    parts.before + parts.countdown + parts.after,
    "Hệ thống đang tạm đóng để bảo trì. Thời gian dự kiến hoàn tất là 1 giờ 23 phút 10 giây, liên hệ quản trị viên khi cần hỗ trợ thêm (0989929373).",
  );
  assert.equal(maintenanceMessage("2026-09-22T04:23:10.000Z", NOW), parts.before + parts.countdown + parts.after);
});

test("thông điệp hết giờ dự kiến: 'sắp hoàn tất', không có đếm ngược (vẫn chặn tới khi chủ tắt)", () => {
  for (const at of [NOW, NOW - 1, NOW - 3600_000]) {
    const parts = maintenanceMessageParts(new Date(at).toISOString(), NOW);
    assert.equal(parts.countdown, null);
    assert.equal(parts.after, "");
    assert.equal(parts.before, "Hệ thống đang tạm đóng để bảo trì và sắp hoàn tất, liên hệ quản trị viên khi cần hỗ trợ thêm (0989929373).");
  }
});

test("thông điệp không có giờ dự kiến (null / hỏng): không bịa đồng hồ", () => {
  for (const endsAt of [null, "", "không phải ngày"]) {
    const parts = maintenanceMessageParts(endsAt, NOW);
    assert.equal(parts.countdown, null);
    assert.equal(parts.before, "Hệ thống đang tạm đóng để bảo trì, liên hệ quản trị viên khi cần hỗ trợ thêm (0989929373).");
  }
});

test("checkMaintenanceInput: bật cần giờ hợp lệ ở tương lai, tối đa 7 ngày; tắt không cần giờ", () => {
  const ok = checkMaintenanceInput({ on: true, endsAt: "2026-09-22T04:00:00Z" }, NOW);
  assert.deepEqual(ok, { ok: true, on: true, endsAt: "2026-09-22T04:00:00.000Z" });
  assert.deepEqual(checkMaintenanceInput({ on: false }, NOW), { ok: true, on: false, endsAt: null });
  assert.deepEqual(checkMaintenanceInput({ on: false, endsAt: "rác" }, NOW), { ok: true, on: false, endsAt: null });
  const bad = (body: Record<string, unknown> | null) => {
    const r = checkMaintenanceInput(body, NOW);
    assert.equal(r.ok, false, JSON.stringify(body));
    return r.ok ? "" : r.message;
  };
  assert.match(bad(null), /bật hay tắt/);
  assert.match(bad({}), /bật hay tắt/);
  assert.match(bad({ on: "true" }), /bật hay tắt/);
  assert.match(bad({ on: true }), /giờ dự kiến/);
  assert.match(bad({ on: true, endsAt: 12345 }), /giờ dự kiến/);
  assert.match(bad({ on: true, endsAt: "không phải ngày" }), /giờ dự kiến/);
  assert.match(bad({ on: true, endsAt: "2026-09-22T03:00:00Z" }), /tương lai/);
  assert.match(bad({ on: true, endsAt: "2026-09-21T03:00:00Z" }), /tương lai/);
  assert.match(bad({ on: true, endsAt: new Date(NOW + MAX_MAINTENANCE_MS + 1000).toISOString() }), /7 ngày/);
  assert.equal(checkMaintenanceInput({ on: true, endsAt: new Date(NOW + MAX_MAINTENANCE_MS).toISOString() }, NOW).ok, true);
});

test("isAllowedPhone: ai được BẬT/TẮT — độc lập với việc đang bật hay tắt; SĐT hỏng/không có trong danh sách thì không", () => {
  assert.equal(isAllowedPhone(OFF, "0989929373"), true);
  assert.equal(isAllowedPhone(OFF, "+84 989 929 373"), true);
  assert.equal(isAllowedPhone(OFF, "0900000001"), false);
  assert.equal(isAllowedPhone(OFF, "hỏng"), false);
  assert.equal(isAllowedPhone({ ...OFF, allowedPhones: [] }, "0989929373"), false);
});
