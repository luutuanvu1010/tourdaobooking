import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { FEEDBACK_KINDS, FEEDBACK_KIND_NAME, FEEDBACK_STATUSES, FEEDBACK_STATUS_NAME } from "../../shared/feedback-catalog.ts";
import { BODY_MAX, TITLE_MAX, parseContext, sanitizeContext, validateMessageInput, validatePatchInput, validateTicketInput, windowStart } from "./rules.ts";

const REQ = "0b8f6f2e-3c1a-4f6e-9a55-2b6f4d1c7e10";
const ok = { kind: "BUG", title: "  Nút lưu   không bấm được ", body: "Mô tả\r\nchi tiết", clientRequestId: REQ };

test("validateTicketInput: nhận đầu vào hợp lệ, chuẩn hoá tiêu đề và xuống dòng", () => {
  const r = validateTicketInput(ok);
  assert.ok(r.ok);
  assert.equal(r.value.title, "Nút lưu không bấm được");
  assert.equal(r.value.body, "Mô tả\nchi tiết");
  assert.equal(r.value.kind, "BUG");
  assert.equal(r.value.context, "{}");
});

test("validateTicketInput: từ chối loại lạ, tiêu đề/nội dung rỗng hoặc quá dài, id yêu cầu sai", () => {
  const bad = (patch: Record<string, unknown>) => assert.equal(validateTicketInput({ ...ok, ...patch }).ok, false, JSON.stringify(patch));
  bad({ kind: "bug" });
  bad({ kind: undefined });
  bad({ title: "   " });
  bad({ title: "x".repeat(TITLE_MAX + 1) });
  bad({ body: "" });
  bad({ body: "y".repeat(BODY_MAX + 1) });
  bad({ clientRequestId: "abc" });
  bad({ clientRequestId: undefined });
  assert.equal(validateTicketInput({ ...ok, title: "x".repeat(TITLE_MAX) }).ok, true);
  assert.equal(validateTicketInput({ ...ok, body: "y".repeat(BODY_MAX) }).ok, true);
});

test("sanitizeContext: chỉ giữ khoá cho phép, cắt độ dài, bỏ ký tự điều khiển, bỏ khoá lạ", () => {
  const raw = { path: "/order", orderCode: "TD-0007", device: "iPhone\u0000 Safari", standalone: true, appVersion: "20260921", evil: "<script>", nested: { a: 1 } };
  assert.deepEqual(parseContext(sanitizeContext(raw)), { path: "/order", orderCode: "TD-0007", device: "iPhone  Safari", standalone: true, appVersion: "20260921" });
  assert.equal(sanitizeContext(undefined), "{}");
  assert.equal(sanitizeContext("chuỗi"), "{}");
  assert.equal(sanitizeContext([1, 2]), "{}");
  assert.deepEqual(parseContext(sanitizeContext({ path: "order" })), {}, "path phải bắt đầu bằng /");
  assert.deepEqual(parseContext(sanitizeContext({ orderCode: "a b" })), {}, "orderCode chỉ gồm chữ số . _ -");
  assert.equal(parseContext(sanitizeContext({ device: "d".repeat(500) })).device?.length, 120);
  assert.deepEqual(parseContext("không phải JSON"), {});
});

test("validateMessageInput: nội dung 1..4000, internal mặc định false", () => {
  assert.deepEqual(validateMessageInput({ body: " Đã nhận " }), { ok: true, value: { body: "Đã nhận", internal: false } });
  assert.deepEqual(validateMessageInput({ body: "x", internal: true }), { ok: true, value: { body: "x", internal: true } });
  assert.equal(validateMessageInput({ body: "  " }).ok, false);
  assert.equal(validateMessageInput({ body: "y".repeat(BODY_MAX + 1) }).ok, false);
  assert.equal(validateMessageInput({ body: "x", internal: "có" }).ok, false);
});

test("validatePatchInput: cần ít nhất một trường; status hợp lệ; resolvedIn chỉ đi cùng DONE", () => {
  assert.equal(validatePatchInput({}).ok, false);
  assert.equal(validatePatchInput({ status: "CLOSED" }).ok, false);
  assert.deepEqual(validatePatchInput({ status: "ACK" }), { ok: true, value: { status: "ACK" } });
  assert.deepEqual(validatePatchInput({ assigneeId: null }), { ok: true, value: { assignee: { value: null } } });
  assert.deepEqual(validatePatchInput({ status: "DONE", resolvedIn: "20260921120000" }), { ok: true, value: { status: "DONE", resolvedIn: { value: "20260921120000" } } });
  assert.equal(validatePatchInput({ status: "ACK", resolvedIn: "x" }).ok, false);
  assert.equal(validatePatchInput({ resolvedIn: "x" }).ok, false);
  assert.equal(validatePatchInput({ assigneeId: 5 }).ok, false);
});

test("windowStart: lùi đúng 1 giờ, ISO UTC", () => {
  assert.equal(windowStart(new Date("2026-09-21T10:00:00.000Z")), "2026-09-21T09:00:00.000Z");
});

test("bảng tra cứu trong migration phản chiếu danh mục ở code", () => {
  const dir = join(import.meta.dirname, "..", "..", "..", "migrations");
  const file = readdirSync(dir).find((f) => f.endsWith("_feedback.sql"));
  assert.ok(file, "chưa có migration *_feedback.sql");
  const sql = readFileSync(join(dir, file), "utf8");
  for (const k of FEEDBACK_KINDS) assert.ok(sql.includes(`('${k}', '${FEEDBACK_KIND_NAME[k]}'`), `thiếu loại ${k} trong migration`);
  for (const s of FEEDBACK_STATUSES) assert.ok(sql.includes(`('${s}', '${FEEDBACK_STATUS_NAME[s]}'`), `thiếu trạng thái ${s} trong migration`);
});
