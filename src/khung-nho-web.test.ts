// Bài kiểm LOGIC THUẦN của "bản nhớ khung" (ADR-0035 điều 3, web/khung-nho.ts): chỉ lưu đúng các trường chủ dự án đã duyệt; đọc bản hỏng không ném lỗi.
import { test } from "node:test";
import assert from "node:assert/strict";
import { docKhungNho, ghiKhungNho } from "../web/khung-nho.ts";

const mau = { tat: "TV", admin: true, seesAll: true, office: true, canCreate: false };

test("ghi rồi đọc lại đúng nguyên bản", () => {
  assert.deepEqual(docKhungNho(ghiKhungNho(mau)), mau);
});

test("chỉ lưu đúng 5 trường đã duyệt — không lọt tên đầy đủ, SĐT hay trường lạ", () => {
  const coThem = { ...mau, fullName: "Lưu Tuấn Vũ", phone: "0900000000", permissions: ["ADMIN"] } as unknown as typeof mau;
  assert.deepEqual(Object.keys(JSON.parse(ghiKhungNho(coThem))).sort(), ["admin", "canCreate", "office", "seesAll", "tat"]);
  assert.equal(JSON.parse(ghiKhungNho({ ...mau, tat: "ABCDEF" })).tat, "AB", "chữ cái đầu tối đa 2 ký tự");
});

test("bản hỏng, thiếu trường hay sai kiểu thì coi như không có (null), không ném lỗi", () => {
  for (const raw of [null, "", "{", "null", "[]", '{"tat":"TV"}', '{"tat":"TVX","admin":true,"seesAll":true,"office":true,"canCreate":true}', '{"tat":1,"admin":true,"seesAll":true,"office":true,"canCreate":true}', '{"tat":"TV","admin":"true","seesAll":true,"office":true,"canCreate":true}']) {
    assert.equal(docKhungNho(raw), null, String(raw));
  }
});
