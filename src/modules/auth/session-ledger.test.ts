// Luật thuần sổ phiên (ADR-0075) + token phiên 4 phần mang mã phiên (điều 1).
import { test } from "node:test";
import assert from "node:assert/strict";
import { END_REASON_LABEL, isSingleDevice, sessionDeviceLabel, sessionStatus, toSessionDto, trimIp, trimUserAgent } from "./session-ledger.ts";
import { SESSION_TTL_SECONDS, createSessionToken, verifySessionToken } from "./session.ts";

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
  const base = { ended_at: null, end_reason: null, expires_at: "2026-10-09T00:00:00.000Z", created_at: "2026-10-02T00:00:00.000Z", last_seen_at: "2026-10-02T00:00:00.000Z" } as const;
  assert.deepEqual(sessionStatus(base, null, "2026-10-03T00:00:00.000Z"), { live: true, label: "Đang hiệu lực" });
  assert.deepEqual(sessionStatus(base, null, "2026-10-10T00:00:00.000Z"), { live: false, label: END_REASON_LABEL.het_han });
  assert.deepEqual(sessionStatus(base, Date.parse("2026-10-02T05:00:00.000Z"), "2026-10-03T00:00:00.000Z"), { live: false, label: "Đã đổi thông tin đăng nhập" });
  assert.deepEqual(sessionStatus({ ...base, ended_at: "2026-10-02T01:00:00.000Z", end_reason: "bi_thay" }, null, "2026-10-03T00:00:00.000Z"), { live: false, label: "Bị thay bởi máy khác" });
});

test("trạng thái: phiên được giữ và cấp lại khi đổi PIN/gỡ Face ID (last_seen_at = mốc đổi) vẫn 'Đang hiệu lực'; phiên chạm lần cuối TRƯỚC mốc đổi thì chết", () => {
  const doi = Date.parse("2026-10-02T05:00:00.123Z");
  const now = "2026-10-03T00:00:00.000Z";
  const base = { ended_at: null, end_reason: null, expires_at: "2026-10-09T00:00:00.000Z", created_at: "2026-10-02T00:00:00.000Z" } as const;
  // markSessionReissuedStatement đặt last_seen_at = ISO của ĐÚNG mốc ms ghi vào credentials_changed_at → so bằng, không lệch 1 ms
  assert.deepEqual(sessionStatus({ ...base, last_seen_at: new Date(doi).toISOString() }, doi, now), { live: true, label: "Đang hiệu lực" });
  assert.deepEqual(sessionStatus({ ...base, last_seen_at: "2026-10-02T06:00:00.000Z" }, doi, now), { live: true, label: "Đang hiệu lực" });
  assert.deepEqual(sessionStatus({ ...base, last_seen_at: "2026-10-02T05:00:00.122Z" }, doi, now), { live: false, label: "Đã đổi thông tin đăng nhập" });
  // last_seen_at hỏng (không parse được) → coi như created_at, KHÔNG được mở cửa (NaN làm mọi phép so sai)
  assert.deepEqual(sessionStatus({ ...base, last_seen_at: "rac" }, doi, now), { live: false, label: "Đã đổi thông tin đăng nhập" });
});

test("verifySessionToken ignoreExpiry: vẫn kiểm chữ ký; hết hạn chỉ qua khi có cờ; iat ở tương lai vẫn bị từ chối", async () => {
  const t = await createSessionToken(S, "staff-1", "phien-1", 1_000);
  const sauHan = 1_000 + SESSION_TTL_SECONDS * 1000 + 5_000;
  assert.equal(await verifySessionToken(S, t, sauHan), null, "không cờ: hết hạn bị từ chối");
  assert.deepEqual(await verifySessionToken(S, t, sauHan, { ignoreExpiry: true }), { staffId: "staff-1", sessionId: "phien-1", issuedAt: 1_000 });
  assert.equal(await verifySessionToken(S, t.replace("phien-1", "phien-2"), sauHan, { ignoreExpiry: true }), null, "chữ ký sai vẫn bị từ chối dù có cờ");
  assert.equal(await verifySessionToken("y".repeat(40), t, sauHan, { ignoreExpiry: true }), null, "khoá khác vẫn bị từ chối");
  const tuongLai = await createSessionToken(S, "staff-1", "phien-1", 10_000_000);
  assert.equal(await verifySessionToken(S, tuongLai, 1_000, { ignoreExpiry: true }), null, "iat ở tương lai vẫn bị từ chối");
});

test("trimIp: tối đa 64 ký tự (CHECK của aut_session), rỗng hoặc thiếu → null", () => {
  assert.equal(trimIp(null), null);
  assert.equal(trimIp(""), null);
  assert.equal(trimIp("10.0.0.1"), "10.0.0.1");
  assert.equal(trimIp("x".repeat(500))?.length, 64);
});

test("toSessionDto (ADR-0075 điều 7): không có User-Agent; nhãn cách đăng nhập; mã lạ không bị đoán thành trạng thái sống", () => {
  const now = "2026-10-01T10:00:00.000Z";
  const base = {
    id: "p1", method: "PIN_TRUSTED", device_label: "iPhone · Safari", ip: "1.2.3.4", user_agent: "Mozilla/5.0 BI-MAT", created_at: "2026-10-01T09:00:00.000Z",
    last_seen_at: "2026-10-01T09:30:00.000Z", expires_at: "2026-10-08T09:00:00.000Z", ended_at: null as string | null, end_reason: null as string | null,
  };
  const d = toSessionDto(base, null, now, "p1");
  assert.equal(d.methodLabel, "PIN máy tin");
  assert.equal(d.thisDevice, true);
  assert.equal(d.live, true);
  assert.ok(!JSON.stringify(d).includes("BI-MAT"), "không lộ User-Agent thô");
  assert.equal(toSessionDto({ ...base, method: "LA" }, null, now, null).methodLabel, "Không rõ");
  const la = toSessionDto({ ...base, ended_at: "2026-10-01T09:40:00.000Z", end_reason: "ly_do_la" }, null, now, null);
  assert.deepEqual([la.live, la.statusLabel], [false, "Đã kết thúc"], "đã kết thúc với lý do lạ không được hiện Đang hiệu lực");
  assert.equal(toSessionDto(base, Date.parse("2026-10-01T09:45:00.000Z"), now, null).statusLabel, "Đã đổi thông tin đăng nhập");
});
