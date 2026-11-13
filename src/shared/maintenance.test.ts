import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAINTENANCE_CONTENT_DEFAULT, MAX_MAINTENANCE_MS, checkMaintenanceContent, contentFromStored, checkMaintenanceInput, countdownBoxes, formatCountdown, phoneVnText, isBlocked, maintenanceMessage, maintenanceMessageParts, stateFromRow, type MaintenanceState,
} from "./maintenance.ts";

const NOW = Date.parse("2026-09-22T03:00:00.000Z");
const ON: MaintenanceState = { on: true, endsAt: "2026-09-22T05:00:00.000Z" };
const OFF: MaintenanceState = { ...ON, on: false };

const SDT = "0989929373";

test("isBlocked (ADR-0071 điều 3a): TẮT thì không chặn ai; BẬT thì chặn MỌI tài khoản không giữ Toàn quyền, kể cả Quản trị, kể cả người không có tài khoản (null)", () => {
  for (const perms of [["SALES"], ["ADMIN"], ["HR"], ["ADMIN", "HR"], [], null] as const) {
    assert.equal(isBlocked(OFF, perms), false, `TẮT: ${JSON.stringify(perms)}`);
    assert.equal(isBlocked(ON, perms), true, `BẬT: ${JSON.stringify(perms)}`);
  }
  for (const perms of [["SUPER_ADMIN"], ["ADMIN", "SUPER_ADMIN"], ["SALES", "SUPER_ADMIN"]] as const) assert.equal(isBlocked(ON, perms), false, `Toàn quyền: ${perms}`);
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
  const parts = maintenanceMessageParts("2026-09-22T04:23:10.000Z", NOW, SDT);
  assert.equal(parts.countdown, "1 giờ 23 phút 10 giây");
  assert.equal(
    parts.before + parts.countdown + parts.after,
    "Hệ thống đang tạm đóng để bảo trì. Thời gian dự kiến hoàn tất là 1 giờ 23 phút 10 giây, liên hệ quản trị viên khi cần hỗ trợ thêm (0989929373).",
  );
  assert.equal(maintenanceMessage("2026-09-22T04:23:10.000Z", NOW, SDT), parts.before + parts.countdown + parts.after);
});

test("thông điệp hết giờ dự kiến: 'sắp hoàn tất', không có đếm ngược (giao diện hiện lúc đồng hồ về 0)", () => {
  for (const at of [NOW, NOW - 1, NOW - 3600_000]) {
    const parts = maintenanceMessageParts(new Date(at).toISOString(), NOW, SDT);
    assert.equal(parts.countdown, null);
    assert.equal(parts.after, "");
    assert.equal(parts.before, "Hệ thống đang tạm đóng để bảo trì và sắp hoàn tất, liên hệ quản trị viên khi cần hỗ trợ thêm (0989929373).");
  }
});

test("thông điệp không có giờ dự kiến (null / hỏng): không bịa đồng hồ", () => {
  for (const endsAt of [null, "", "không phải ngày"]) {
    const parts = maintenanceMessageParts(endsAt, NOW, SDT);
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


test("TỰ TẮT khi hết giờ dự kiến: dòng còn bật nhưng giờ đã qua thì không chặn ai; chưa tới giờ vẫn chặn; bật không có giờ thì giữ bật", () => {
  const row = (endsAt: string | null) => ({ enabled: 1, ends_at: endsAt });
  const hetGio = stateFromRow(row(new Date(NOW - 1).toISOString()), NOW);
  assert.deepEqual(hetGio, { on: false, endsAt: null }, "hết giờ: tắt");
  assert.equal(isBlocked(hetGio, ["SALES"]), false);
  assert.equal(stateFromRow(row(new Date(NOW).toISOString()), NOW).on, false, "đúng giờ hẹn là mở lại");
  const dangBat = stateFromRow(row("2026-09-22T05:00:00.000Z"), NOW);
  assert.deepEqual(dangBat, ON);
  assert.equal(isBlocked(dangBat, ["SALES"]), true);
  assert.equal(stateFromRow(row(null), NOW).on, true, "bật tay bằng SQL không kèm giờ: không có gì để hết hạn, giữ bật");
  assert.deepEqual(stateFromRow({ enabled: 0, ends_at: "2026-09-22T05:00:00.000Z" }, NOW), { on: false, endsAt: null });
  assert.deepEqual(stateFromRow(null, NOW), { on: false, endsAt: null });
});

test("countdownBoxes (màn bảo trì mới, bản mẫu 2a): ba ô giờ/phút/giây có số 0 đứng đầu; từ 1 ngày là ngày/giờ/phút, làm tròn lên phút", () => {
  const s = 1000;
  assert.deepEqual(countdownBoxes((2 * 3600 + 5 * 60 + 9) * s), [{ so: "02", nhan: "giờ" }, { so: "05", nhan: "phút" }, { so: "09", nhan: "giây" }]);
  assert.deepEqual(countdownBoxes(42 * s), [{ so: "00", nhan: "giờ" }, { so: "00", nhan: "phút" }, { so: "42", nhan: "giây" }]);
  assert.deepEqual(countdownBoxes(1), [{ so: "00", nhan: "giờ" }, { so: "00", nhan: "phút" }, { so: "01", nhan: "giây" }], "còn chút ít không hiện 00 giây");
  assert.deepEqual(countdownBoxes((3 * 86400 + 5 * 3600 + 9 * 60) * s + 1), [{ so: "3", nhan: "ngày" }, { so: "05", nhan: "giờ" }, { so: "10", nhan: "phút" }]);
});

test("phoneVnText: SĐT 10 số tách 4-3-3 để dễ đọc; số khác giữ nguyên", () => {
  assert.equal(phoneVnText("0989929373"), "0989 929 373");
  assert.equal(phoneVnText("12345"), "12345");
});

test("thông điệp dùng SĐT hỗ trợ chủ đã lưu, không gắn cứng", () => {
  assert.match(maintenanceMessage(null, NOW, "0905123456"), /\(0905123456\)\.$/);
  assert.equal(maintenanceMessage(null, NOW, ""), "Hệ thống đang tạm đóng để bảo trì, liên hệ quản trị viên khi cần hỗ trợ thêm.");
});

const HOP_LE = {
  tieuDe: "Hệ thống đang bảo trì", loiNhan: "Đang nâng cấp.", lyDo: "", sdt: "0905 123 456", zalo: "https://zalo.me/0905123456", website: "https://tourdao.vn", camOn: "",
  hienLyDo: true, hienGoi: true, hienZalo: false, hienWeb: true, hienCamOn: false,
};

test("nội dung mặc định = bản mẫu 2c của chủ dự án (chỉ dùng khi chủ chưa lưu nội dung, hoặc khi bấm Khôi phục mặc định)", () => {
  assert.deepEqual(MAINTENANCE_CONTENT_DEFAULT, {
    tieuDe: "Hệ thống đang bảo trì",
    loiNhan: "Tour Đảo Booking đang được nâng cấp để chạy nhanh và ổn định hơn. Trong lúc này chưa lập hay sửa đơn được.",
    lyDo: "", sdt: "0989929373", zalo: "https://zalo.me/0989929373", website: "https://tourdao.vn",
    camOn: "Cảm ơn bạn đã kiên nhẫn chờ. Hệ thống sẽ sớm quay lại.",
    hienLyDo: true, hienGoi: true, hienZalo: true, hienWeb: true, hienCamOn: true,
  });
  assert.deepEqual(checkMaintenanceContent({ ...MAINTENANCE_CONTENT_DEFAULT }), { ok: true, content: MAINTENANCE_CONTENT_DEFAULT }, "mặc định phải tự qua được bộ kiểm");
});

test("checkMaintenanceContent: nhận nội dung hợp lệ, cắt khoảng trắng hai đầu, SĐT bỏ dấu cách/chấm", () => {
  const r = checkMaintenanceContent({ ...HOP_LE, tieuDe: "  Bảo trì  " });
  assert.deepEqual(r, { ok: true, content: { ...HOP_LE, tieuDe: "Bảo trì", sdt: "0905123456" } });
});

test("checkMaintenanceContent: ô tuỳ chọn để trống được (khối đó ẩn)", () => {
  const r = checkMaintenanceContent({ ...HOP_LE, zalo: "", website: " ", lyDo: "", camOn: "" });
  assert.equal(r.ok, true);
  if (r.ok) assert.deepEqual([r.content.zalo, r.content.website], ["", ""]);
});

test("checkMaintenanceContent: từ chối thiếu ô bắt buộc, SĐT sai, đường dẫn không an toàn, chữ quá dài, kiểu sai", () => {
  const sai: [string, unknown][] = [
    ["thân rỗng", null],
    ["thiếu tiêu đề", { ...HOP_LE, tieuDe: "  " }],
    ["thiếu lời nhắn", { ...HOP_LE, loiNhan: "" }],
    ["thiếu SĐT", { ...HOP_LE, sdt: "" }],
    ["SĐT 9 số", { ...HOP_LE, sdt: "090512345" }],
    ["SĐT có chữ", { ...HOP_LE, sdt: "0905abc456" }],
    ["Zalo javascript:", { ...HOP_LE, zalo: "javascript:alert(1)" }],
    ["Zalo không phải zalo.me", { ...HOP_LE, zalo: "https://evil.example/zalo.me" }],
    ["Zalo http", { ...HOP_LE, zalo: "http://zalo.me/0905123456" }],
    ["website http", { ...HOP_LE, website: "http://tourdao.vn" }],
    ["website javascript:", { ...HOP_LE, website: "javascript:alert(1)" }],
    ["website có dấu cách", { ...HOP_LE, website: "https://tour dao.vn" }],
    ["tiêu đề quá dài", { ...HOP_LE, tieuDe: "a".repeat(81) }],
    ["lời nhắn quá dài", { ...HOP_LE, loiNhan: "a".repeat(301) }],
    ["công tắc không phải đúng/sai", { ...HOP_LE, hienGoi: "true" }],
    ["chữ không phải chuỗi", { ...HOP_LE, camOn: 5 }],
  ];
  for (const [ten, body] of sai) assert.equal(checkMaintenanceContent(body as Record<string, unknown> | null).ok, false, ten);
});

test("contentFromStored: chưa lưu / hỏng / không qua bộ kiểm → mặc định; hợp lệ → đúng nội dung đã lưu", () => {
  assert.deepEqual(contentFromStored(null), MAINTENANCE_CONTENT_DEFAULT);
  assert.deepEqual(contentFromStored("{không phải json"), MAINTENANCE_CONTENT_DEFAULT);
  assert.deepEqual(contentFromStored(JSON.stringify({ ...HOP_LE, zalo: "javascript:x" })), MAINTENANCE_CONTENT_DEFAULT);
  assert.deepEqual(contentFromStored(JSON.stringify({ ...HOP_LE, sdt: "0905123456" })), { ...HOP_LE, sdt: "0905123456" });
});
