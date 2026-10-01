import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAINTENANCE_CONTACT_PHONE, MAX_MAINTENANCE_MS, checkMaintenanceInput, formatCountdown, isAllowedPhone, isBlocked, maintenanceMessage, maintenanceMessageParts, parseAllowedPhones, phoneChangeProblem,
  stateFromRow, type MaintenanceState,
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
  assert.equal(formatCountdown(23 * 3600_000 + 59 * 60_000 + 59_000), "23 giờ 59 phút 59 giây");
});

test("formatCountdown: từ 1 ngày trở lên đếm theo ngày-giờ-phút, bỏ giây, làm tròn lên phút (chủ dự án 2026-10-01)", () => {
  assert.equal(formatCountdown(3 * 86400_000 + 5 * 3600_000 + 10 * 60_000), "3 ngày 5 giờ 10 phút");
  assert.equal(formatCountdown(49 * 3600_000 + 60_000), "2 ngày 1 giờ 1 phút");
  assert.equal(formatCountdown(86400_000), "1 ngày 0 giờ 0 phút");
  assert.equal(formatCountdown(86400_000 + 1), "1 ngày 0 giờ 1 phút");
  assert.equal(formatCountdown(86400_000 - 1), "1 ngày 0 giờ 0 phút");
  assert.equal(formatCountdown(7 * 86400_000), "7 ngày 0 giờ 0 phút");
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

test("thông điệp hết giờ dự kiến: 'sắp hoàn tất', không có đếm ngược (giao diện hiện lúc đồng hồ về 0)", () => {
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

test("checkMaintenanceInput: chỉ nhận mốc ISO UTC có 'Z' (không múi giờ = mơ hồ giờ VN/UTC) và ngày phải có thật (không lăn sang tháng sau)", () => {
  const bad = (endsAt: unknown) => {
    const r = checkMaintenanceInput({ on: true, endsAt }, NOW);
    assert.equal(r.ok, false, String(endsAt));
    return r.ok ? "" : r.message;
  };
  assert.match(bad("2026-09-22T10:00"), /giờ dự kiến/); // không múi giờ: 10:00 giờ VN hay UTC?
  assert.match(bad("2026-09-22T10:00:00"), /giờ dự kiến/);
  assert.match(bad("2026-09-22T10:00:00+07:00"), /giờ dự kiến/); // giao diện luôn gửi toISOString() (Z); múi giờ khác không nhận
  assert.match(bad("2026-02-30T10:00:00Z"), /giờ dự kiến/); // 30/02 không có
  assert.match(bad("2026-09-31T10:00:00Z"), /giờ dự kiến/);
  assert.match(bad("2026-09-22T24:00:00Z"), /giờ dự kiến/);
  assert.deepEqual(checkMaintenanceInput({ on: true, endsAt: "2026-09-22T10:00:00Z" }, NOW), { ok: true, on: true, endsAt: "2026-09-22T10:00:00.000Z" });
  assert.deepEqual(checkMaintenanceInput({ on: true, endsAt: "2026-09-22T10:00Z" }, NOW), { ok: true, on: true, endsAt: "2026-09-22T10:00:00.000Z" });
  assert.deepEqual(checkMaintenanceInput({ on: true, endsAt: "2026-09-22T10:00:00.5Z" }, NOW), { ok: true, on: true, endsAt: "2026-09-22T10:00:00.500Z" });
});

test("phoneChangeProblem: không cho đổi SĐT của tài khoản đang là người được phép (danh sách nhận diện theo SĐT — đổi là mất/chuyển quyền dùng chế độ bảo trì)", () => {
  assert.match(phoneChangeProblem(OFF, "0989929373", "0912345678") ?? "", /chủ dự án/);
  assert.match(phoneChangeProblem(ON, "0989 929 373", "0912345678") ?? "", /chủ dự án/); // cả khi đang bật lẫn tắt
  assert.equal(phoneChangeProblem(OFF, "0989929373", "0989929373"), null); // không đổi gì
  assert.equal(phoneChangeProblem(OFF, "0989929373", "+84 989 929 373"), null); // cùng số, chỉ khác cách gõ
  assert.equal(phoneChangeProblem(OFF, "0900000001", "0912345678"), null); // tài khoản thường đổi SĐT như cũ
});

test("TỰ TẮT khi hết giờ dự kiến: dòng còn bật nhưng giờ đã qua thì không chặn ai; chưa tới giờ vẫn chặn; bật không có giờ thì giữ bật", () => {
  const row = (endsAt: string | null) => ({ enabled: 1, ends_at: endsAt, allowed_phones: MAINTENANCE_CONTACT_PHONE });
  const hetGio = stateFromRow(row(new Date(NOW - 1).toISOString()), NOW);
  assert.deepEqual(hetGio, { on: false, endsAt: null, allowedPhones: [MAINTENANCE_CONTACT_PHONE] }, "hết giờ: tắt, danh sách được phép vẫn còn cho nút bật/tắt của chủ");
  assert.equal(isBlocked(hetGio, "0900000001"), false);
  assert.equal(stateFromRow(row(new Date(NOW).toISOString()), NOW).on, false, "đúng giờ hẹn là mở lại");
  const dangBat = stateFromRow(row("2026-09-22T05:00:00.000Z"), NOW);
  assert.deepEqual(dangBat, ON);
  assert.equal(isBlocked(dangBat, "0900000001"), true);
  assert.equal(stateFromRow(row(null), NOW).on, true, "bật tay bằng SQL không kèm giờ: không có gì để hết hạn, giữ bật");
  assert.deepEqual(stateFromRow({ enabled: 0, ends_at: "2026-09-22T05:00:00.000Z", allowed_phones: "" }, NOW), { on: false, endsAt: null, allowedPhones: [] });
  assert.deepEqual(stateFromRow(null, NOW), { on: false, endsAt: null, allowedPhones: [] });
});
