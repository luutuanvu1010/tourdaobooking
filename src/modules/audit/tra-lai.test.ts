// Cờ «được trả lại» (ADR-0030 điều 3, kế hoạch 2026-10-20 T5/TC-8): hàm công bố `donDuocTraLai` của audit trên SQLite thật — đơn mà, trong ba hành động
// đổi người phụ trách (`order_claimed`, `order_handler_changed`, `order_handler_refused`), dòng MỚI NHẤT là `order_handler_refused`. Dựng theo MÃ hành
// động, không đọc chữ `detail`; chỉ trả tập id (không tên, không lý do — ADR-0131).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { fakeD1, openDb } from "../../../tests/audit/harness.mjs";
import * as esbuild from "esbuild";

const HERE = new URL("./", import.meta.url).pathname;
const built = await esbuild.build({
  stdin: { contents: 'export { donDuocTraLai } from "./index";', resolveDir: HERE, loader: "ts" },
  bundle: true, format: "esm", platform: "neutral", target: "es2022", write: false, logLevel: "silent",
});
const { donDuocTraLai } = (await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0]!.text).toString("base64")}`)) as typeof import("./index.ts");

/** Schema thật; khoá ngoại tắt để gieo nhật ký của đơn không có thật — bài chỉ ĐỌC (hàm công bố là câu đọc). */
function moDb() {
  const sqlite = openDb();
  sqlite.exec("PRAGMA foreign_keys = OFF");
  return sqlite;
}
function dung(chuoi: Record<string, string[]>) {
  const sqlite = moDb();
  const ghi = sqlite.prepare("INSERT INTO audit_log (id, order_id, staff_id, action, target_type, target_id, detail, created_at) VALUES (?, ?, NULL, ?, 'order', ?, ?, ?)");
  let n = 0;
  for (const [don, hanhDong] of Object.entries(chuoi)) {
    hanhDong.forEach((a, i) => ghi.run(`id-${++n}`, don, a, don, "Bận lịch khác", `2026-10-2${i}T00:00:00.000Z`));
  }
  return fakeD1(sqlite) as D1Database;
}

test("donDuocTraLai: nhận→từ chối = có; nhận→từ chối→nhận = không; đổi người = không; giao→từ chối = có; chưa từng = không; hành động khác sau Từ chối không xoá cờ", async () => {
  const db = dung({
    a: ["created", "order_claimed", "order_handler_refused"],
    b: ["order_claimed", "order_handler_refused", "order_claimed"],
    c: ["order_handler_changed"],
    d: ["order_handler_changed", "order_handler_refused", "updated", "trip_updated"],
    e: ["created"],
    f: ["order_handler_refused", "order_handler_changed"],
  });
  const kq = await donDuocTraLai(db, ["a", "b", "c", "d", "e", "f", "khong-co"]);
  assert.deepEqual([...kq].sort(), ["a", "d"]);
});

test("donDuocTraLai: chỉ xét đơn được hỏi; mảng rỗng → tập rỗng (không truy vấn)", async () => {
  const db = dung({ a: ["order_claimed", "order_handler_refused"], b: ["order_claimed", "order_handler_refused"] });
  assert.deepEqual([...(await donDuocTraLai(db, ["b"]))], ["b"]);
  assert.equal((await donDuocTraLai({ prepare: () => { throw new Error("không được truy vấn"); } } as unknown as D1Database, [])).size, 0);
});

test("donDuocTraLai: hai dòng cùng mốc — dòng ghi sau (rowid lớn hơn) là mới nhất", async () => {
  const sqlite = moDb();
  const ghi = sqlite.prepare("INSERT INTO audit_log (id, order_id, action, target_type, target_id, created_at) VALUES (?, 'x', ?, 'order', 'x', '2026-10-20T00:00:00.000Z')");
  ghi.run("1", "order_handler_refused");
  ghi.run("2", "order_claimed");
  assert.equal((await donDuocTraLai(fakeD1(sqlite) as D1Database, ["x"])).size, 0);
});
