// Khung thử bắt chước giới hạn mẫu LIKE của D1 (tests/audit/harness.mjs, `kiemMauLike`): D1 thật từ chối mẫu LIKE/GLOB dài hơn 50 BYTE ("LIKE or GLOB pattern
// too complex"), `node:sqlite` thì không. Bài này ghim CHÍNH hàng rào đó (Hiến pháp P16: cơ chế kiểm chỉ đáng tin sau khi thấy nó chặn thật): bắt đúng các dạng
// tham số đứng sau LIKE/GLOB, không bắt nhầm tham số khác (mảng JSON dài, id…), và `fakeD1` ném lỗi thật trên mọi đường chạy câu lệnh.
import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { kiemMauLike, fakeD1, GIOI_HAN_MAU_LIKE_BYTE } from "../tests/audit/harness.mjs";

const VUA = `%${"a".repeat(GIOI_HAN_MAU_LIKE_BYTE - 2)}%`; // đúng 50 byte
const QUA = `%${"a".repeat(GIOI_HAN_MAU_LIKE_BYTE - 1)}%`; // 51 byte
const CHONG = /LIKE or GLOB pattern too complex/;

test("kiemMauLike: tham số trần sau LIKE — 50 byte qua, 51 byte ném", () => {
  assert.doesNotThrow(() => kiemMauLike("SELECT 1 FROM t WHERE c LIKE ? ESCAPE '\\'", [VUA]));
  assert.throws(() => kiemMauLike("SELECT 1 FROM t WHERE c LIKE ? ESCAPE '\\'", [QUA]), CHONG);
});

test("kiemMauLike: tính theo BYTE (chữ có dấu 3 byte), không theo số ký tự", () => {
  assert.doesNotThrow(() => kiemMauLike("SELECT 1 WHERE c LIKE ?", [`%${"ệ".repeat(16)}%`]), "16 chữ = 48 byte + 2");
  assert.throws(() => kiemMauLike("SELECT 1 WHERE c LIKE ?", [`%${"ệ".repeat(17)}%`]), CHONG);
});

test("kiemMauLike: tham số đánh số (?3) và GLOB; chỉ xét ĐÚNG tham số đứng sau LIKE", () => {
  const dai = "x".repeat(200);
  // ?1 là mảng JSON dài, ?2 là mẫu ngắn: không ném
  assert.doesNotThrow(() => kiemMauLike("SELECT 1 WHERE a IN (SELECT value FROM json_each(?1)) AND c LIKE ?2 ESCAPE '\\'", [dai, "%ab%"]));
  // đổi chỗ: ?2 là mẫu dài ⇒ ném
  assert.throws(() => kiemMauLike("SELECT 1 WHERE a IN (SELECT value FROM json_each(?1)) AND c LIKE ?2 ESCAPE '\\'", ["[]", dai]), CHONG);
  // đánh số lệch thứ tự: LIKE ?3 xuất hiện trước ?1
  assert.throws(() => kiemMauLike("SELECT 1 WHERE (?3 IS NULL OR c LIKE ?3 ESCAPE '\\') AND d = ?1 AND e = ?2", ["a", "b", dai]), CHONG);
  assert.throws(() => kiemMauLike("SELECT 1 WHERE c GLOB ?", [dai]), CHONG);
});

test("kiemMauLike: nhiều dấu ? trần — mẫu dài ở vị trí thứ N bị bắt đúng; chữ trong nháy đơn không làm lệch số thứ tự", () => {
  const dai = "y".repeat(80);
  const sql = "SELECT 1 FROM t WHERE x = ? AND note = 'có dấu ? trong chữ' AND (c LIKE ? ESCAPE '\\' OR d LIKE ? ESCAPE '\\')";
  assert.doesNotThrow(() => kiemMauLike(sql, ["a", "%ok%", "%ok%"]));
  assert.throws(() => kiemMauLike(sql, ["a", "%ok%", dai]), CHONG, "tham số thứ 3");
  assert.throws(() => kiemMauLike(sql, ["a", dai, "%ok%"]), CHONG, "tham số thứ 2");
  assert.doesNotThrow(() => kiemMauLike(sql, [dai, "%ok%", "%ok%"]), "tham số thứ 1 không phải mẫu LIKE");
});

test("kiemMauLike: dạng `LIKE '%' || ?N || '%'` cộng thêm 2 byte của hai dấu %", () => {
  const sql = "SELECT 1 WHERE (?1 = '' OR l.display_name LIKE '%' || ?1 || '%' ESCAPE '\\')";
  assert.doesNotThrow(() => kiemMauLike(sql, ["a".repeat(48)]), "48 + 2 = 50");
  assert.throws(() => kiemMauLike(sql, ["a".repeat(49)]), CHONG, "49 + 2 = 51");
});

test("kiemMauLike: tham số không phải chuỗi (số, null) thì bỏ qua", () => {
  assert.doesNotThrow(() => kiemMauLike("SELECT 1 WHERE c LIKE ?1 AND d LIKE ?2", [null, 5]));
});

test("fakeD1: câu LIKE quá giới hạn bị từ chối trên all / first / raw / run / batch như D1 thật; câu vừa giới hạn chạy bình thường", async () => {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("CREATE TABLE t (c TEXT); INSERT INTO t VALUES ('abc')");
  const d1 = fakeD1(sqlite);
  const sql = "SELECT c FROM t WHERE c LIKE ? ESCAPE '\\'";
  assert.deepEqual((await d1.prepare(sql).bind("%b%").all()).results, [{ c: "abc" }]);
  await assert.rejects(() => d1.prepare(sql).bind(QUA).all(), CHONG);
  await assert.rejects(() => d1.prepare(sql).bind(QUA).first(), CHONG);
  await assert.rejects(() => d1.prepare(sql).bind(QUA).raw(), CHONG);
  await assert.rejects(() => d1.prepare("DELETE FROM t WHERE c LIKE ?").bind(QUA).run(), CHONG);
  await assert.rejects(() => d1.batch([d1.prepare(sql).bind("%b%"), d1.prepare(sql).bind(QUA)]), CHONG, "trong lô: cả lô lùi lại");
  assert.equal((sqlite.prepare("SELECT count(*) AS n FROM t").get() as { n: number }).n, 1, "bảng nguyên vẹn");
});
