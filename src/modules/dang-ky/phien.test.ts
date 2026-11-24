// Phiên đăng ký (ADR-0206 Đ5): cookie ký bằng khoá dẫn xuất riêng, không dùng lẫn với phiên Nền tảng.
import { test } from "node:test";
import assert from "node:assert/strict";
import { DK_COOKIE, dkEmailKey, dkIpKey, dkTepIpKey, dkXacNhanIpKey, docPhienDangKy, khoaBam, taoPhienDangKy } from "./phien.ts";
import { createSessionToken, verifySessionToken } from "../auth/session.ts";

const SECRET = "bi-mat-thu-nghiem-dai-du-dung";
const env = { SESSION_SECRET: SECRET } as unknown as Env;
const POLICY = { idleMin: 30, maxHours: 12 };
const T0 = Date.parse("2026-11-15T03:00:00.000Z");
const MIN = 60_000;
const yeuCau = (cookie: string | null): Request => new Request("https://booking.tourdao.vn/api/dang-ky/phieu", { headers: cookie ? { cookie } : {} });

test("cookie đúng đọc ra mã phiếu và danh tính", async () => {
  const t = await taoPhienDangKy(SECRET, "DK_ABCDEFGH", "id-1", T0);
  assert.deepEqual(await docPhienDangKy(yeuCau(`${DK_COOKIE}=${t}`), env, T0 + 5 * MIN, POLICY), { registrationId: "DK_ABCDEFGH", identityId: "id-1", startMs: T0 });
});

test("không cookie, sai chữ ký, bị sửa nội dung: null", async () => {
  const t = await taoPhienDangKy(SECRET, "DK_ABCDEFGH", "id-1", T0);
  assert.equal(await docPhienDangKy(yeuCau(null), env, T0, POLICY), null);
  assert.equal(await docPhienDangKy(yeuCau(`${DK_COOKIE}=${t.slice(0, -2)}xx`), env, T0, POLICY), null);
  assert.equal(await docPhienDangKy(yeuCau(`${DK_COOKIE}=${t.replace("DK_ABCDEFGH", "DK_ZZZZZZZZ")}`), env, T0, POLICY), null);
  const khac = await taoPhienDangKy("bi-mat-khac-hoan-toan-khac", "DK_ABCDEFGH", "id-1", T0);
  assert.equal(await docPhienDangKy(yeuCau(`${DK_COOKIE}=${khac}`), env, T0, POLICY), null);
});

test("quá idleMin không thao tác ⇒ null; đồng hồ lạ (phát hành ở tương lai) ⇒ null", async () => {
  const t = await taoPhienDangKy(SECRET, "DK_ABCDEFGH", "id-1", T0);
  const c = yeuCau(`${DK_COOKIE}=${t}`);
  assert.notEqual(await docPhienDangKy(c, env, T0 + 29 * MIN, POLICY), null);
  assert.equal(await docPhienDangKy(c, env, T0 + 31 * MIN, POLICY), null);
  assert.equal(await docPhienDangKy(c, env, T0 - 5 * MIN, POLICY), null);
});

test("cấp lại cookie (giữ mốc bắt đầu) kéo dài phiên tới maxHours rồi dừng", async () => {
  let t = await taoPhienDangKy(SECRET, "DK_ABCDEFGH", "id-1", T0);
  let now = T0;
  for (let i = 0; i < 40; i++) {
    now += 25 * MIN;
    const p = await docPhienDangKy(yeuCau(`${DK_COOKIE}=${t}`), env, now, POLICY);
    if (now - T0 >= 12 * 60 * MIN) { assert.equal(p, null, "quá 12 giờ phải hết"); return; }
    assert.notEqual(p, null);
    t = await taoPhienDangKy(SECRET, "DK_ABCDEFGH", "id-1", now, T0);
  }
  assert.fail("không chạm trần 12 giờ");
});

test("tách khoá: verifySessionToken từ chối cookie đăng ký; docPhienDangKy từ chối td_session", async () => {
  const dk = await taoPhienDangKy(SECRET, "DK_ABCDEFGH", "id-1", T0);
  assert.equal(await verifySessionToken(SECRET, dk, T0), null);
  const phien = await createSessionToken(SECRET, "staff-1", "sess-1", T0);
  assert.equal(await docPhienDangKy(yeuCau(`${DK_COOKIE}=${phien}`), env, T0, POLICY), null);
  assert.equal(await docPhienDangKy(yeuCau(`td_session=${phien}`), env, T0, POLICY), null);
  // chữ ký đăng ký ghép vào dữ liệu kiểu phiên Nền tảng cũng không qua
  const chuKy = dk.split(".").pop()!;
  assert.equal(await verifySessionToken(SECRET, `staff-1.${T0}.sess-1.${chuKy}`, T0), null);
});

test("mã chứa dấu chấm không ký được (tránh nhập nhằng phân tách)", async () => {
  await assert.rejects(() => taoPhienDangKy(SECRET, "DK_A.B", "id-1", T0));
  await assert.rejects(() => taoPhienDangKy(SECRET, "DK_ABCDEFGH", "i.d", T0));
});

test("khoá bộ đếm có không gian tên dk: gồm cả IP", () => {
  assert.equal(dkEmailKey("a@b.vn"), "dk:email:a@b.vn");
  assert.equal(dkIpKey("1.2.3.4"), "dk:ip:1.2.3.4");
});

test("taoPhienDangKy từ chối mốc bắt đầu SAU mốc hiện tại (cookie không ký được phiên «từ tương lai»)", async () => {
  await assert.rejects(() => taoPhienDangKy(SECRET, "DK_ABCDEFGH", "id-1", T0, T0 + 1), /Mốc bắt đầu/);
  await assert.rejects(() => taoPhienDangKy(SECRET, "DK_ABCDEFGH", "id-1", Number.NaN), /Mốc bắt đầu/);
  assert.ok(await taoPhienDangKy(SECRET, "DK_ABCDEFGH", "id-1", T0, T0), "bằng nhau thì được");
  assert.ok(await taoPhienDangKy(SECRET, "DK_ABCDEFGH", "id-1", T0 + MIN, T0), "cấp lại sau thao tác (bắt đầu cũ hơn) thì được");
});

test("khoá bộ đếm `dk:` không bao giờ chung tiền tố với phone:, mfa:, mfa-mail:, ip: của đăng nhập (ADR-0206 Đ8) — kiểm cả hai chiều", async () => {
  const cua = ["phone:", "mfa:", "mfa-mail:", "ip:"];
  const dk = [dkEmailKey("x"), dkIpKey("1.2.3.4"), dkTepIpKey("1.2.3.4"), dkXacNhanIpKey("1.2.3.4")];
  for (const k of dk) {
    assert.ok(k.startsWith("dk:"), k);
    for (const c of cua) {
      assert.equal(k.startsWith(c), false, `${k} chung tiền tố ${c}`);
      assert.equal(c.startsWith(k.split(":")[0] + ":"), false, `${c} chung tiền tố với ${k}`);
    }
  }
});

test("khoaBam: cùng đầu vào ra cùng khoá, khác loại hay khác bí mật ra khoá khác, không chứa đầu vào", async () => {
  const a = await khoaBam(SECRET, "email", "an@gmail.com");
  assert.equal(a, await khoaBam(SECRET, "email", "an@gmail.com"));
  assert.notEqual(a, await khoaBam(SECRET, "ip", "an@gmail.com"));
  assert.notEqual(a, await khoaBam("bi-mat-khac-hoan-toan-khac", "email", "an@gmail.com"));
  assert.match(a, /^[0-9a-f]{64}$/);
});
