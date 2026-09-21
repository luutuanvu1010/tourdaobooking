// Cloudflare Turnstile phía máy chủ: verifyTurnstile (fetch GIẢ tiêm vào — không gọi mạng thật) + quyết định bật/tắt theo cấu hình.
import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_TOKEN_LENGTH, TURNSTILE_TIMEOUT_MS, TURNSTILE_VERIFY_URL, turnstileGate, turnstileLog, turnstileSecret, turnstileSiteKey, verifyTurnstile } from "./turnstile.ts";

interface Call { url: string; init: RequestInit }

/** fetch giả: ghi lại mọi lời gọi, trả về theo `respond`. */
function fakeFetch(respond: (call: Call) => Response | Promise<Response>) {
  const calls: Call[] = [];
  const fn = (async (input: string | URL | Request, init?: RequestInit) => {
    const call = { url: String(input), init: init ?? {} };
    calls.push(call);
    return respond(call);
  }) as typeof fetch;
  return { fn, calls };
}

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const base = { secret: "s3cret-key", token: "tok-abc", ip: "203.0.113.9" };

test("hằng số: siteverify chính thức, hết giờ 5 giây, token dài tối đa 2048 ký tự", () => {
  assert.equal(TURNSTILE_VERIFY_URL, "https://challenges.cloudflare.com/turnstile/v0/siteverify");
  assert.equal(TURNSTILE_TIMEOUT_MS, 5000);
  assert.equal(MAX_TOKEN_LENGTH, 2048);
});

test("đạt: success:true → ok; gửi POST dạng form với secret, response, remoteip", async () => {
  const f = fakeFetch(() => jsonResponse({ success: true, "error-codes": [] }));
  assert.deepEqual(await verifyTurnstile(base, f.fn), { ok: true });
  assert.equal(f.calls.length, 1);
  const [call] = f.calls;
  assert.equal(call!.url, TURNSTILE_VERIFY_URL);
  assert.equal(call!.init.method, "POST");
  const body = new URLSearchParams(String(call!.init.body));
  assert.deepEqual([...body.keys()].sort(), ["remoteip", "response", "secret"]);
  assert.equal(body.get("secret"), "s3cret-key");
  assert.equal(body.get("response"), "tok-abc");
  assert.equal(body.get("remoteip"), "203.0.113.9");
  assert.ok(call!.init.signal instanceof AbortSignal, "lời gọi phải mang tín hiệu huỷ để có hạn chót");
});

test("remoteip chỉ gửi khi là địa chỉ IP hợp lệ (IPv4 hoặc IPv6); thiếu/lạ thì bỏ hẳn trường", async () => {
  for (const [ip, expected] of [
    ["203.0.113.9", "203.0.113.9"],
    ["2001:db8::1", "2001:db8::1"],
    [null, null],
    ["", null],
    ["unknown", null],
    ["10.1.2", null],
    ["999.1.1.1", null],
    ["không-phải-ip", null],
  ] as const) {
    const f = fakeFetch(() => jsonResponse({ success: true }));
    assert.equal((await verifyTurnstile({ ...base, ip }, f.fn)).ok, true, String(ip));
    const body = new URLSearchParams(String(f.calls[0]!.init.body));
    assert.equal(body.get("remoteip"), expected, `ip=${JSON.stringify(ip)}`);
    assert.equal(body.has("remoteip"), expected !== null, `ip=${JSON.stringify(ip)}: trường remoteip phải vắng mặt khi không có IP hợp lệ`);
  }
});

test("success:false → failed (token sai, hết hạn hoặc đã dùng); mang mã lỗi của Cloudflare", async () => {
  for (const code of ["invalid-input-response", "timeout-or-duplicate", "missing-input-response", "bad-request"]) {
    const f = fakeFetch(() => jsonResponse({ success: false, "error-codes": [code] }));
    assert.deepEqual(await verifyTurnstile(base, f.fn), { ok: false, reason: "failed", detail: code });
  }
  const noCodes = fakeFetch(() => jsonResponse({ success: false }));
  assert.deepEqual(await verifyTurnstile(base, noCodes.fn), { ok: false, reason: "failed", detail: "rejected" });
});

test("success:false do lỗi của phía Cloudflare hoặc cấu hình secret → unavailable (đóng khi lỗi, nhưng không đổ lỗi cho người dùng)", async () => {
  for (const code of ["internal-error", "invalid-input-secret", "missing-input-secret"]) {
    const f = fakeFetch(() => jsonResponse({ success: false, "error-codes": ["invalid-input-response", code] }));
    assert.deepEqual(await verifyTurnstile(base, f.fn), { ok: false, reason: "unavailable", detail: code });
  }
});

test("secret sai: siteverify thật trả HTTP 400 kèm `invalid-input-secret` (đã đo bằng curl) → unavailable mang đúng mã đó, không phải http_400", async () => {
  const f = fakeFetch(() => jsonResponse({ "error-codes": ["invalid-input-secret"], success: false, messages: [] }, 400));
  assert.deepEqual(await verifyTurnstile(base, f.fn), { ok: false, reason: "unavailable", detail: "invalid-input-secret" });
});

test("mã lỗi không an toàn để ghi nhật ký (chữ hoa, dấu cách, quá dài) bị lọc bỏ; success:false không mã → failed/rejected", async () => {
  const f = fakeFetch(() => jsonResponse({ success: false, "error-codes": ["Có Dấu Cách", "x".repeat(200), 7, null] }));
  assert.deepEqual(await verifyTurnstile(base, f.fn), { ok: false, reason: "failed", detail: "rejected" });
});

test("HTTP lỗi (4xx/5xx) → unavailable, kể cả khi thân có success:true", async () => {
  for (const status of [400, 403, 429, 500, 502, 503]) {
    const f = fakeFetch(() => jsonResponse({ success: true }, status));
    assert.deepEqual(await verifyTurnstile(base, f.fn), { ok: false, reason: "unavailable", detail: `http_${status}` }, String(status));
  }
});

test("thân trả về không đọc được hoặc sai hình dạng → unavailable (không bao giờ coi là đạt)", async () => {
  const bodies: [string, Response][] = [
    ["html", new Response("<html>lỗi cổng</html>", { status: 200 })],
    ["rỗng", new Response("", { status: 200 })],
    ["mảng", jsonResponse([true])],
    ["thiếu success", jsonResponse({ "error-codes": [] })],
    ["success không phải boolean", jsonResponse({ success: "true" })],
    ["success = 1", jsonResponse({ success: 1 })],
    ["null", jsonResponse(null)],
  ];
  for (const [what, response] of bodies) {
    const f = fakeFetch(() => response);
    assert.deepEqual(await verifyTurnstile(base, f.fn), { ok: false, reason: "unavailable", detail: "bad_response" }, what);
  }
});

test("lỗi mạng (fetch ném lỗi) → unavailable; lỗi không rò secret/token ra kết quả", async () => {
  const f = fakeFetch(() => {
    throw new TypeError("fetch failed: s3cret-key tok-abc");
  });
  const r = await verifyTurnstile(base, f.fn);
  assert.deepEqual(r, { ok: false, reason: "unavailable", detail: "network" });
  assert.doesNotMatch(JSON.stringify(r), /s3cret|tok-abc/);
  const rejected = fakeFetch(() => Promise.reject(new Error("ECONNRESET")));
  assert.deepEqual(await verifyTurnstile(base, rejected.fn), { ok: false, reason: "unavailable", detail: "network" });
});

test("hết giờ: fetch chỉ kết thúc khi bị huỷ → unavailable/timeout, và trả về đúng hạn (không đợi 5 giây)", async () => {
  const f = fakeFetch(
    ({ init }) =>
      new Promise<Response>((_resolve, reject) => {
        init.signal!.addEventListener("abort", () => reject(new DOMException("đã huỷ", "AbortError")));
      }),
  );
  const started = Date.now();
  const r = await verifyTurnstile({ ...base, timeoutMs: 30 }, f.fn);
  assert.deepEqual(r, { ok: false, reason: "unavailable", detail: "timeout" });
  assert.ok(Date.now() - started < 2000, "phải trả về sát hạn chót đã đặt");
  assert.equal(f.calls[0]!.init.signal!.aborted, true, "kết nối treo phải bị huỷ chứ không bỏ lửng");
});

/**
 * Chạy `body` với `setTimeout`/`clearTimeout` toàn cục được bọc để ĐẾM: mỗi bộ đếm giờ tạo ra (kèm độ trễ) và số bộ còn sống. Chỉ để chứng minh hai điều mà
 * kiểm hằng số (`TURNSTILE_TIMEOUT_MS === 5000`) không chứng minh được: hằng số ĐƯỢC NỐI vào dây mặc định, và bộ đếm giờ luôn được dọn.
 */
async function withTimerSpy(body: () => Promise<void>): Promise<{ delays: number[]; live: number }> {
  const realSet = globalThis.setTimeout;
  const realClear = globalThis.clearTimeout;
  const delays: number[] = [];
  const live = new Set<unknown>();
  globalThis.setTimeout = ((fn: () => void, ms?: number, ...rest: unknown[]) => {
    const id = realSet(fn, ms, ...rest);
    delays.push(Number(ms));
    live.add(id);
    return id;
  }) as unknown as typeof setTimeout;
  globalThis.clearTimeout = ((id: Parameters<typeof clearTimeout>[0]) => {
    live.delete(id);
    realClear(id);
  }) as typeof clearTimeout;
  try {
    await body();
  } finally {
    globalThis.setTimeout = realSet;
    globalThis.clearTimeout = realClear;
    for (const id of live) realClear(id as Parameters<typeof clearTimeout>[0]); // dù test đỏ cũng không để bộ đếm treo giữ tiến trình
  }
  return { delays, live: live.size };
}

test("hạn chót MẶC ĐỊNH đúng là TURNSTILE_TIMEOUT_MS (kể cả qua turnstileGate) và bộ đếm giờ luôn được dọn — đạt, bị bác hay lỗi mạng", async () => {
  const ok = fakeFetch(() => jsonResponse({ success: true }));
  const rejected = fakeFetch(() => jsonResponse({ success: false, "error-codes": ["invalid-input-response"] }));
  const broken = fakeFetch(() => {
    throw new TypeError("fetch failed");
  });
  const spy = await withTimerSpy(async () => {
    assert.equal((await verifyTurnstile(base, ok.fn)).ok, true);
    assert.equal((await verifyTurnstile(base, rejected.fn)).ok, false);
    assert.equal((await verifyTurnstile(base, broken.fn)).ok, false);
    assert.equal((await turnstileGate(ON, "tok-abc", null, ok.fn)).pass, true, "cổng không truyền hạn chót → cũng phải dùng mặc định");
  });
  assert.deepEqual(spy.delays, [TURNSTILE_TIMEOUT_MS, TURNSTILE_TIMEOUT_MS, TURNSTILE_TIMEOUT_MS, TURNSTILE_TIMEOUT_MS], "mỗi lần gọi đúng MỘT bộ đếm, đặt đúng hằng số mặc định");
  assert.equal(spy.live, 0, "mọi bộ đếm giờ phải bị clearTimeout (không rò một bộ đếm 5 giây sau mỗi lần đăng nhập)");
  // Khi thiếu token thì KHÔNG gọi mạng và cũng không tạo bộ đếm nào.
  const idle = await withTimerSpy(async () => void (await verifyTurnstile({ ...base, token: "" }, ok.fn)));
  assert.deepEqual(idle, { delays: [], live: 0 });
});

test("hết giờ: kể cả fetch phớt lờ tín hiệu huỷ và treo vĩnh viễn → vẫn unavailable/timeout", async () => {
  const f = fakeFetch(() => new Promise<Response>(() => {}));
  assert.deepEqual(await verifyTurnstile({ ...base, timeoutMs: 30 }, f.fn), { ok: false, reason: "unavailable", detail: "timeout" });
});

test("hết giờ tính cả lúc đọc thân: thân trả về chậm hơn hạn chót → unavailable/timeout", async () => {
  const slowBody = { ok: true, status: 200, json: () => new Promise(() => {}) } as unknown as Response;
  const f = fakeFetch(() => slowBody);
  assert.deepEqual(await verifyTurnstile({ ...base, timeoutMs: 30 }, f.fn), { ok: false, reason: "unavailable", detail: "timeout" });
});

test("thiếu token → failed và KHÔNG gọi mạng (mọi dạng: vắng, null, rỗng, khoảng trắng, không phải chuỗi, quá dài)", async () => {
  const tooLong = "x".repeat(MAX_TOKEN_LENGTH + 1);
  for (const token of [undefined, null, "", "   ", 0, 123, true, {}, ["a"], tooLong]) {
    const f = fakeFetch(() => jsonResponse({ success: true }));
    const r = await verifyTurnstile({ ...base, token }, f.fn);
    assert.deepEqual(r, { ok: false, reason: "failed", detail: "missing_token" }, JSON.stringify(token)?.slice(0, 30));
    assert.equal(f.calls.length, 0, `không được gọi Cloudflare khi token = ${JSON.stringify(token)?.slice(0, 30)}`);
  }
  const exact = fakeFetch(() => jsonResponse({ success: true }));
  assert.equal((await verifyTurnstile({ ...base, token: "x".repeat(MAX_TOKEN_LENGTH) }, exact.fn)).ok, true, "đúng 2048 ký tự vẫn được gửi đi");
});

test("token được gửi nguyên văn (không cắt, không đổi) — kể cả ký tự đặc biệt", async () => {
  const token = "0.abc-DEF_123=+/&?x";
  const f = fakeFetch(() => jsonResponse({ success: true }));
  await verifyTurnstile({ ...base, token }, f.fn);
  assert.equal(new URLSearchParams(String(f.calls[0]!.init.body)).get("response"), token);
});

test("turnstileSecret: chỉ chuỗi không rỗng (sau khi bỏ khoảng trắng đầu/cuối) mới là đã cấu hình; ngược lại null = bỏ qua kiểm", () => {
  assert.equal(turnstileSecret({ TURNSTILE_SECRET_KEY: "abc" }), "abc");
  assert.equal(turnstileSecret({ TURNSTILE_SECRET_KEY: "  abc\n" }), "abc", "secret dán từ `echo … | wrangler secret put` hay dính xuống dòng");
  for (const env of [{}, { TURNSTILE_SECRET_KEY: "" }, { TURNSTILE_SECRET_KEY: "   " }, { TURNSTILE_SECRET_KEY: undefined }, { TURNSTILE_SITE_KEY: "site" }]) {
    assert.equal(turnstileSecret(env), null, JSON.stringify(env));
  }
});

test("turnstileSiteKey: chỉ trả khoá site khi có CẢ secret lẫn khoá site; còn lại null (trang không dựng widget)", () => {
  assert.equal(turnstileSiteKey({ TURNSTILE_SECRET_KEY: "s", TURNSTILE_SITE_KEY: "site" }), "site", "có cả hai → dựng widget");
  assert.equal(turnstileSiteKey({ TURNSTILE_SECRET_KEY: "s", TURNSTILE_SITE_KEY: " site \n" }), "site");
  for (const env of [
    {},
    { TURNSTILE_SITE_KEY: "site" }, // có khoá site mà thiếu secret: không kiểm nên cũng không hiện widget
    { TURNSTILE_SECRET_KEY: "s" }, // có secret mà thiếu khoá site: không có gì để dựng
    { TURNSTILE_SECRET_KEY: "", TURNSTILE_SITE_KEY: "site" },
    { TURNSTILE_SECRET_KEY: "s", TURNSTILE_SITE_KEY: "" },
    { TURNSTILE_SECRET_KEY: "s", TURNSTILE_SITE_KEY: "  " },
  ]) {
    assert.equal(turnstileSiteKey(env), null, JSON.stringify(env));
  }
});

// ---- turnstileGate: quyết định của route đăng nhập (bật/tắt theo cấu hình, ánh xạ kết quả → 403/503) -------------------

const ON = { TURNSTILE_SECRET_KEY: "s3cret-key", TURNSTILE_SITE_KEY: "site-key" };
const FAILED_MESSAGE = "Chưa xác minh được bạn là người thật. Hãy thử lại.";
const UNAVAILABLE_MESSAGE = "Chưa kết nối được dịch vụ xác minh. Hãy thử lại sau ít phút.";

test("cổng: CHƯA cấu hình secret → cho qua, cảnh báo `disabled`, và KHÔNG gọi mạng (kể cả khi thiếu token)", async () => {
  for (const env of [{}, { TURNSTILE_SECRET_KEY: "" }, { TURNSTILE_SECRET_KEY: "  \n" }, { TURNSTILE_SITE_KEY: "site-key" }]) {
    for (const token of [undefined, "", "XXXX.DUMMY.TOKEN.XXXX"]) {
      const f = fakeFetch(() => jsonResponse({ success: false }));
      assert.deepEqual(await turnstileGate(env, token, "203.0.113.9", f.fn), { pass: true, warn: "disabled" }, JSON.stringify({ env, token }));
      assert.equal(f.calls.length, 0, "không có secret thì không có gì để hỏi Cloudflare");
    }
  }
});

test("cổng: đã cấu hình + token đạt → cho qua, không cảnh báo; secret/token/IP được chuyển đúng cho siteverify", async () => {
  const f = fakeFetch(() => jsonResponse({ success: true }));
  assert.deepEqual(await turnstileGate(ON, "tok-abc", "203.0.113.9", f.fn), { pass: true, warn: null });
  const body = new URLSearchParams(String(f.calls[0]!.init.body));
  assert.deepEqual([body.get("secret"), body.get("response"), body.get("remoteip")], ["s3cret-key", "tok-abc", "203.0.113.9"]);
});

test("cổng: thiếu/hỏng token → 403 `turnstile_failed` đúng chữ của đặc tả, không gọi mạng", async () => {
  const f = fakeFetch(() => jsonResponse({ success: true }));
  for (const token of [undefined, null, "", 42]) {
    assert.deepEqual(await turnstileGate(ON, token, null, f.fn), { pass: false, warn: null, status: 403, code: "turnstile_failed", message: FAILED_MESSAGE, detail: "missing_token" });
  }
  assert.equal(f.calls.length, 0);
});

test("cổng: Cloudflare bác token → 403 `turnstile_failed`", async () => {
  const f = fakeFetch(() => jsonResponse({ success: false, "error-codes": ["timeout-or-duplicate"] }));
  assert.deepEqual(await turnstileGate(ON, "tok-abc", null, f.fn), { pass: false, warn: null, status: 403, code: "turnstile_failed", message: FAILED_MESSAGE, detail: "timeout-or-duplicate" });
});

test("cổng: Cloudflare không trả lời được (mạng/HTTP lỗi/hết giờ/secret sai) → 503 `turnstile_unavailable`, đóng khi lỗi", async () => {
  const cases: [string, typeof fetch, string][] = [
    ["mạng", fakeFetch(() => Promise.reject(new TypeError("fetch failed"))).fn, "network"],
    ["HTTP 502", fakeFetch(() => new Response("bad gateway", { status: 502 })).fn, "http_502"],
    ["hết giờ", fakeFetch(() => new Promise<Response>(() => {})).fn, "timeout"],
    ["secret sai", fakeFetch(() => jsonResponse({ success: false, "error-codes": ["invalid-input-secret"] }, 400)).fn, "invalid-input-secret"],
  ];
  for (const [what, fn, detail] of cases) {
    const gate = await turnstileGate(ON, "tok-abc", null, fn, 30);
    assert.deepEqual(gate, { pass: false, warn: null, status: 503, code: "turnstile_unavailable", message: UNAVAILABLE_MESSAGE, detail }, what);
  }
});

test("cổng: có secret mà thiếu khoá site → VẪN kiểm (đóng khi lỗi), kèm cảnh báo `no_site_key` để sửa cấu hình", async () => {
  const env = { TURNSTILE_SECRET_KEY: "s3cret-key" };
  const f = fakeFetch(() => jsonResponse({ success: true }));
  assert.deepEqual(await turnstileGate(env, undefined, null, f.fn), { pass: false, warn: "no_site_key", status: 403, code: "turnstile_failed", message: FAILED_MESSAGE, detail: "missing_token" });
  assert.deepEqual(await turnstileGate(env, "tok-abc", null, f.fn), { pass: true, warn: "no_site_key" });
});

// ---- turnstileLog: dòng nhật ký vận hành của cổng (route chỉ việc in ra) -------------------------------------------------------

test("nhật ký cổng: 403 turnstile_failed có MỘT dòng ngắn (warn) chỉ mang mã lý do đã lọc — để vận hành thấy 403 hàng loạt; không kèm token/secret/IP", async () => {
  const secretLike = { TURNSTILE_SECRET_KEY: "s3cret-key-XYZ", TURNSTILE_SITE_KEY: "site-key" };
  const cases: [string, unknown, typeof fetch | undefined, string][] = [
    ["thiếu token", undefined, undefined, "missing_token"],
    ["Cloudflare bác", "tok-SECRET-abc", fakeFetch(() => jsonResponse({ success: false, "error-codes": ["timeout-or-duplicate"] })).fn, "timeout-or-duplicate"],
    ["bác không kèm mã", "tok-SECRET-abc", fakeFetch(() => jsonResponse({ success: false })).fn, "rejected"],
  ];
  for (const [what, token, fn, detail] of cases) {
    const entries = turnstileLog(await turnstileGate(secretLike, token, "203.0.113.9", fn));
    assert.deepEqual(entries, [{ level: "warn", event: "turnstile_failed", detail }], what);
    assert.doesNotMatch(JSON.stringify(entries), /s3cret|tok-SECRET|203\.0\.113/i, `${what}: không được lộ secret, token hay IP`);
  }
});

test("nhật ký cổng: 503 → error `turnstile_unavailable` kèm mã; tắt → warn `turnstile_disabled`; thiếu khoá site → error `turnstile_misconfigured`; đạt bình thường → không in gì", async () => {
  const down = fakeFetch(() => new Response("bad gateway", { status: 502 })).fn;
  assert.deepEqual(turnstileLog(await turnstileGate(ON, "tok-abc", null, down)), [{ level: "error", event: "turnstile_unavailable", detail: "http_502" }]);

  const off = turnstileLog(await turnstileGate({}, "tok-abc", null));
  assert.equal(off.length, 1);
  assert.deepEqual([off[0]!.level, off[0]!.event], ["warn", "turnstile_disabled"]);
  assert.match(off[0]!.message ?? "", /TURNSTILE_SECRET_KEY/);

  const ok = fakeFetch(() => jsonResponse({ success: true })).fn;
  const noSite = turnstileLog(await turnstileGate({ TURNSTILE_SECRET_KEY: "s3cret-key" }, undefined, null, ok));
  assert.deepEqual(noSite.map((e) => [e.level, e.event, e.detail]), [["error", "turnstile_misconfigured", undefined], ["warn", "turnstile_failed", "missing_token"]], "cấu hình sai VÀ bị từ chối → cả hai dòng");
  assert.match(noSite[0]!.message ?? "", /TURNSTILE_SITE_KEY/);

  assert.deepEqual(turnstileLog(await turnstileGate(ON, "tok-abc", null, ok)), [], "đạt + cấu hình đủ: không nhiễu nhật ký");
});
