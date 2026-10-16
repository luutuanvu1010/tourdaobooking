// Mã email của bảo mật hai lớp (ADR-0074 điều 4; kế hoạch Phần C Task 1): che / chuẩn hoá địa chỉ, nội dung thư, sinh mã, gửi thư qua binding EMAIL.
// Gửi thư: thiếu binding / thiếu người gửi / nhà cung cấp ném lỗi → false, KHÔNG ném; log không chứa địa chỉ, mã hay câu lỗi của nhà cung cấp.
import { test } from "node:test";
import assert from "node:assert/strict";
import { EMAIL_CODE_TTL_MS, MAIL_LIMIT, emailBody, emailCodeHash, emailHash, mailKey, maskEmail, newEmailCode, normalizeEmail, sendMfaEmail } from "./mfa-email.ts";
import { sha256Hex } from "./mfa-crypto.ts";

test("maskEmail: chữ đầu + *** + @tên miền; không phải email → null", () => {
  assert.equal(maskEmail("tuan@gmail.com"), "t***@gmail.com");
  assert.equal(maskEmail("a@b.vn"), "a***@b.vn");
  assert.equal(maskEmail(null), null);
  assert.equal(maskEmail(""), null);
  assert.equal(maskEmail("@gmail.com"), null);
  assert.equal(maskEmail("tuan@"), null);
  assert.equal(maskEmail("khong-co-a-cong"), null);
});

test("normalizeEmail: cắt khoảng trắng, chữ thường, đúng khuôn, ≤ 254 ký tự; còn lại → null", () => {
  assert.equal(normalizeEmail("  Tuan.Bao@Gmail.COM "), "tuan.bao@gmail.com");
  assert.equal(normalizeEmail("a@b.vn"), "a@b.vn");
  for (const x of ["", "   ", "tuan", "tuan@gmail", "tuan @gmail.com", "@gmail.com", "tuan@@gmail.com", "a@b.", 42, null, undefined, {}])
    assert.equal(normalizeEmail(x), null, JSON.stringify(x));
  const dai = `${"a".repeat(64)}@${"b".repeat(185)}.com`; // 64 + 1 + 185 + 4 = 254
  assert.equal(dai.length, 254);
  assert.equal(normalizeEmail(dai), dai);
  assert.equal(normalizeEmail(`a${dai}`), null, "255 ký tự");
});

test("emailBody: tiếng Việt có dấu, có mã + câu cảnh báo; KHÔNG liên kết / http / tên miền bấm được; chủ đề không chứa mã", () => {
  const { subject, text } = emailBody("482913");
  assert.match(text, /482913/);
  assert.ok(text.includes("Nếu không phải bạn, đổi PIN ngay và báo IT."), text);
  assert.match(text, /10 phút/);
  assert.doesNotMatch(subject, /482913/, "mã không nằm ở chủ đề (hiện trên màn hình khoá)");
  assert.match(subject, /[ăâđêôơưáàảãạ]/i, "chủ đề tiếng Việt có dấu");
  for (const s of [subject, text]) {
    assert.doesNotMatch(s, /https?|:\/\/|www\.|<a\b|href/i);
    assert.doesNotMatch(s, /\b[a-z0-9-]+\.(vn|com|net|org)\b/i, "không có tên miền (ứng dụng thư tự biến thành liên kết)");
  }
});

test("newEmailCode: 6 chữ số, giữ số 0 đầu, không lặp một giá trị", () => {
  const seen = new Set<string>();
  for (let i = 0; i < 300; i++) {
    const c = newEmailCode();
    assert.match(c, /^\d{6}$/);
    seen.add(c);
  }
  assert.ok(seen.size > 250, "phân bố quá hẹp");
});

test("băm: mã = SHA-256(\"<staffId>:<id>:<mã>\"); địa chỉ băm theo dạng chuẩn hoá", async () => {
  assert.equal(await emailCodeHash("s1", "id1", "123456"), await sha256Hex("s1:id1:123456"));
  assert.equal(await emailHash(" Tuan@Gmail.com"), await sha256Hex("tuan@gmail.com"));
  assert.equal(EMAIL_CODE_TTL_MS, 600_000);
  assert.equal(MAIL_LIMIT, 3);
  assert.equal(mailKey("s1"), "mfa-mail:s1");
});

/** Bắt mọi dòng log trong lúc chạy `f`. */
async function batLog<T>(f: () => Promise<T>): Promise<{ kq: T; log: string }> {
  const goc = { log: console.log, warn: console.warn, error: console.error };
  let log = "";
  const ghi = (...a: unknown[]) => void (log += a.map(String).join(" ") + "\n");
  console.log = ghi; console.warn = ghi; console.error = ghi;
  try {
    return { kq: await f(), log };
  } finally {
    Object.assign(console, goc);
  }
}

test("sendMfaEmail: gửi đúng người nhận, người gửi = FEEDBACK_MAIL_FROM, nội dung emailBody → true", async () => {
  const thu: unknown[] = [];
  const env = { EMAIL: { send: async (m: unknown) => void thu.push(m) }, FEEDBACK_MAIL_FROM: "no-reply@tourdao.vn" };
  assert.equal(await sendMfaEmail(env, "tuan@gmail.com", "482913"), true);
  assert.deepEqual(thu, [{ to: "tuan@gmail.com", from: "no-reply@tourdao.vn", ...emailBody("482913") }]);
});

test("sendMfaEmail: thiếu binding / thiếu người gửi / nhà cung cấp ném lỗi → false, không ném; log không có địa chỉ, mã, câu lỗi nhà cung cấp", async () => {
  const LOI = "E_PROVIDER_SECRET_DETAIL tuan@gmail.com";
  const ca: Record<string, unknown>[] = [
    { FEEDBACK_MAIL_FROM: "no-reply@tourdao.vn" },
    { EMAIL: { send: async () => undefined } },
    { EMAIL: { send: async () => undefined }, FEEDBACK_MAIL_FROM: "" },
    { EMAIL: { send: async () => { throw new Error(LOI); } }, FEEDBACK_MAIL_FROM: "no-reply@tourdao.vn" },
    { EMAIL: { send: () => { throw new Error(LOI); } }, FEEDBACK_MAIL_FROM: "no-reply@tourdao.vn" },
  ];
  for (const env of ca) {
    const { kq, log } = await batLog(() => sendMfaEmail(env, "tuan@gmail.com", "482913"));
    assert.equal(kq, false);
    assert.match(log, /mfa_mail_failed/);
    for (const lo of ["tuan@gmail.com", "482913", "E_PROVIDER_SECRET_DETAIL"]) assert.ok(!log.includes(lo), `log chứa "${lo}"`);
  }
});
