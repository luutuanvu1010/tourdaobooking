// Luật thuần sổ phiên (ADR-0075) + token phiên 4 phần mang mã phiên (điều 1).
import { test } from "node:test";
import assert from "node:assert/strict";
import { END_REASON_LABEL, isSingleDevice, sessionDeviceLabel, sessionStatus, trimUserAgent } from "./session-ledger.ts";
import { createSessionToken, verifySessionToken } from "./session.ts";

const S = "x".repeat(40);

test("token mới mang mã phiên; token kiểu cũ (3 phần) bị từ chối", async () => {
  const t = await createSessionToken(S, "staff-1", "phien-1", 1_000);
  assert.deepEqual(await verifySessionToken(S, t, 2_000), { staffId: "staff-1", sessionId: "phien-1", issuedAt: 1_000 });
  const [a, b, , d] = t.split(".");
  assert.equal(await verifySessionToken(S, `${a}.${b}.${d}`, 2_000), null);
  assert.equal(await verifySessionToken(S, t.replace("phien-1", "phien-2"), 2_000), null, "đổi mã phiên làm hỏng chữ ký");
});

test("miễn một máy: giữ SUPER_ADMIN hoặc vai IT", () => {
  assert.equal(isSingleDevice(["SUPER_ADMIN"], []), false);
  assert.equal(isSingleDevice(["ADMIN"], ["IT"]), false);
  assert.equal(isSingleDevice(["ADMIN"], ["DIRECTOR"]), true);
  assert.equal(isSingleDevice(["PARTNER"], []), true);
  assert.equal(isSingleDevice(["HR"], ["HR_STAFF"]), true);
});

test("tên máy: loại máy + trình duyệt / ứng dụng đã cài, không SĐT", () => {
  const iosApp = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148";
  const iosSafari = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
  const winChrome = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36";
  assert.equal(sessionDeviceLabel(iosApp), "iPhone · Ứng dụng đã cài");
  assert.equal(sessionDeviceLabel(iosSafari), "iPhone · Safari");
  assert.equal(sessionDeviceLabel(winChrome), "Máy Windows · Chrome");
  assert.equal(sessionDeviceLabel(null), "Thiết bị khác");
});

test("User-Agent cắt còn 200 ký tự", () => {
  assert.equal(trimUserAgent("a".repeat(500))!.length, 200);
  assert.equal(trimUserAgent(null), null);
});

test("trạng thái hiển thị: kết thúc theo dòng, theo hạn, theo lưới credentials_changed_at", () => {
  const base = { ended_at: null, end_reason: null, expires_at: "2026-10-09T00:00:00.000Z", created_at: "2026-10-02T00:00:00.000Z" } as const;
  assert.deepEqual(sessionStatus(base, null, "2026-10-03T00:00:00.000Z"), { live: true, label: "Đang hiệu lực" });
  assert.deepEqual(sessionStatus(base, null, "2026-10-10T00:00:00.000Z"), { live: false, label: END_REASON_LABEL.het_han });
  assert.deepEqual(sessionStatus(base, Date.parse("2026-10-02T05:00:00.000Z"), "2026-10-03T00:00:00.000Z"), { live: false, label: "Đã đổi thông tin đăng nhập" });
  assert.deepEqual(sessionStatus({ ...base, ended_at: "2026-10-02T01:00:00.000Z", end_reason: "bi_thay" }, null, "2026-10-03T00:00:00.000Z"), { live: false, label: "Bị thay bởi máy khác" });
});
