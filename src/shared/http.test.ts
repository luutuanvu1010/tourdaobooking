import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { css, escapeLike, mauLikeChua } from "./http.ts";

test("css(): text/css utf-8, mặc định no-cache (hỏi lại theo ETag), giữ header thêm", async () => {
  const r = css(":root{}", 200, { etag: '"v3"' });
  assert.equal(r.headers.get("content-type"), "text/css; charset=utf-8");
  assert.equal(r.headers.get("cache-control"), "no-cache");
  assert.equal(r.headers.get("etag"), '"v3"');
  assert.equal(await r.text(), ":root{}");
});

// ---- mauLikeChua: mẫu `%…%` không bao giờ quá 50 BYTE (D1 từ chối mẫu LIKE dài hơn: "LIKE or GLOB pattern too complex" ⇒ 500) ----------------------------
const byte = (s: string) => new TextEncoder().encode(s).length;
/** Đọc mẫu từng cặp: `\%` `\_` `\\` → ký tự thật. Dấu `\` đứng cuối/đứng trước ký tự thường, hay `%` `_` trần giữa mẫu ⇒ mẫu hỏng (cắt giữa cặp thoát). */
function goThoat(mau: string): string {
  assert.ok(mau.startsWith("%") && mau.endsWith("%") && mau.length >= 2, `mẫu phải bọc %…%: ${mau}`);
  const trong = mau.slice(1, -1);
  let ra = "";
  for (let i = 0; i < trong.length; i++) {
    const c = trong[i]!;
    if (c === "\\") {
      const n = trong[i + 1];
      assert.ok(n !== undefined && "\\%_".includes(n), `dấu \\ lẻ ở vị trí ${i} (cắt giữa cặp thoát?)`);
      ra += n;
      i++;
    } else {
      assert.ok(c !== "%" && c !== "_", `ký tự đặc biệt "${c}" không được thoát ở vị trí ${i}`);
      ra += c;
    }
  }
  return ra;
}

test("mauLikeChua: chữ ngắn → đúng `%chữ%` đã thoát, như escapeLike cũ (không đổi hành vi)", () => {
  assert.equal(mauLikeChua("abc"), "%abc%");
  assert.equal(mauLikeChua("Nguyễn An"), "%Nguyễn An%");
  assert.equal(mauLikeChua("50%_off\\x"), `%${escapeLike("50%_off\\x")}%`);
  assert.equal(mauLikeChua("50%_off\\x"), "%50\\%\\_off\\\\x%");
});

test("mauLikeChua: ranh giới đúng 50 byte — vừa đủ thì giữ nguyên, thừa một byte thì cắt", () => {
  assert.equal(mauLikeChua("a".repeat(48)), `%${"a".repeat(48)}%`, "48 chữ + 2 dấu % = 50 byte, giữ nguyên");
  assert.equal(mauLikeChua("a".repeat(49)), `%${"a".repeat(48)}%`, "49 chữ → cắt còn 48");
  assert.equal(mauLikeChua("ệ".repeat(16)), `%${"ệ".repeat(16)}%`, "16 chữ 3 byte = 48 byte, giữ nguyên");
  assert.equal(mauLikeChua("ệ".repeat(17)), `%${"ệ".repeat(16)}%`, "17 chữ 3 byte → cắt còn 16, KHÔNG xé đôi chữ thứ 17");
});

test("mauLikeChua: mọi chữ tìm (ASCII, có dấu, emoji 4 byte, toàn ký tự cần thoát) đều cho mẫu ≤ 50 byte, hợp lệ UTF-8, không cắt giữa cặp thoát", () => {
  const mau = [
    "x".repeat(100),
    "Nguyễn Thị Phượng Hoàng Yến Nhi Thanh Tâm",
    "ệ".repeat(100),
    "😀".repeat(40), // 4 byte mỗi ký tự (cặp thay thế UTF-16)
    "a" + "😀".repeat(20), // lệch một byte: cắt theo đơn vị 16-bit sẽ để lọt nửa emoji (TextEncoder tính nửa cặp = 3 byte ⇒ vừa chạm 48)
    "%".repeat(100), // mỗi % thoát thành \% = 2 byte
    "_".repeat(60),
    "\\".repeat(60),
    "a%".repeat(40) + "ệ", // dấu thoát rơi đúng ranh giới
    "ệ%".repeat(30),
    String.fromCodePoint(0x65, 0x323, 0x302).repeat(30), // dạng tổ hợp (NFD): chữ + dấu rời, mỗi "ệ" là 3 điểm mã
  ];
  for (const q of mau) {
    const m = mauLikeChua(q);
    assert.ok(byte(m) <= 50, `${byte(m)} byte > 50 với "${q.slice(0, 20)}…"`);
    assert.ok(m.isWellFormed(), "không để lọt nửa cặp thay thế (nửa emoji)");
    assert.ok(!m.includes(String.fromCodePoint(0xfffd)), "không sinh ký tự lỗi");
    const trong = goThoat(m);
    assert.ok(q.startsWith(trong), `phần giữ lại phải là ĐOẠN ĐẦU của chữ tìm: "${trong.slice(0, 20)}…"`);
    assert.ok(trong.length > 0, "chữ tìm không rỗng thì mẫu không rỗng");
  }
});

test("mauLikeChua: cắt thì mẫu chỉ RỘNG hơn — mọi chuỗi khớp cả chữ tìm vẫn khớp mẫu đã cắt (SQLite thật, ESCAPE '\\')", () => {
  const db = new DatabaseSync(":memory:");
  const khop = (mau: string, giaTri: string) => (db.prepare("SELECT ?1 LIKE ?2 ESCAPE '\\' AS k").get(giaTri, mau) as { k: number }).k === 1;
  const dai = "Nguyễn Thị Phượng Hoàng Yến Nhi 50%_x";
  const m = mauLikeChua(dai);
  assert.ok(byte(m) <= 50 && byte(`%${escapeLike(dai)}%`) > 50, "ca thử phải thật sự bị cắt");
  assert.ok(khop(m, `Khách ${dai} (đã cọc)`), "chuỗi chứa cả chữ tìm vẫn khớp");
  assert.ok(!khop(m, "Trần Văn Bình"), "chuỗi không liên quan không khớp");
  // ký tự đặc biệt vẫn được hiểu theo nghĩa đen: "A_B" không khớp "AxB"
  assert.ok(khop(mauLikeChua("A_B"), "xA_By"));
  assert.ok(!khop(mauLikeChua("A_B"), "xAxBy"));
  assert.ok(!khop(mauLikeChua("100%"), "1000"));
});
