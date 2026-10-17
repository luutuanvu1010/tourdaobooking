import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { FEEDBACK_KINDS, FEEDBACK_KIND_NAME, FEEDBACK_STATUSES, FEEDBACK_STATUS_NAME } from "../../shared/feedback-catalog.ts";
import { LAM_MOI_TRAN } from "../../shared/ve-ho-tro-hien-thi.ts";
import {
  BODY_MAX, CAU_DON_LIEN_QUAN_SAI, MESSAGES_SINCE_LIMIT, TITLE_MAX, parseContext, parseSince, sanitizeContext, validateMemberRole, validateMessageInput, validatePatchInput, validateTeamInput, validateTeamPatch, validateTicketInput, windowStart,
} from "./rules.ts";

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

test("validateTeamInput: mã HOA/số/gạch dưới ≤ 40, tên 1–60 sau trim, mô tả ≤ 300, nhạy cảm boolean", () => {
  const ok = validateTeamInput({ code: "BAN_HANG", name: "  Bán hàng  ", description: "Hỏi đáp", sensitive: true });
  assert.deepEqual(ok, { ok: true, value: { code: "BAN_HANG", name: "Bán hàng", description: "Hỏi đáp", sensitive: true } });
  assert.deepEqual(validateTeamInput({ code: "MOI", name: "Mới" }), { ok: true, value: { code: "MOI", name: "Mới", description: "", sensitive: false } });
  for (const code of ["ban_hang", "BAN HANG", "", "A".repeat(41), 5]) assert.equal(validateTeamInput({ code, name: "X", sensitive: false }).ok, false, String(code));
  assert.equal(validateTeamInput({ code: "A", name: "   ", sensitive: false }).ok, false);
  assert.equal(validateTeamInput({ code: "A", name: "x".repeat(61), sensitive: false }).ok, false);
  assert.equal(validateTeamInput({ code: "A", name: "X", description: "x".repeat(301), sensitive: false }).ok, false);
  assert.equal(validateTeamInput({ code: "A", name: "X", sensitive: "có" }).ok, false);
});

test("validateTeamPatch: ít nhất một trường; từng trường đúng kiểu", () => {
  assert.equal(validateTeamPatch({}).ok, false);
  assert.equal(validateTeamPatch({ code: "MOI" }).ok, false, "mã nhóm không sửa được");
  assert.deepEqual(validateTeamPatch({ active: false }), { ok: true, value: { active: false } });
  assert.deepEqual(validateTeamPatch({ name: " Kế toán ", sensitive: true }), { ok: true, value: { name: "Kế toán", sensitive: true } });
  assert.equal(validateTeamPatch({ active: 0 }).ok, false);
  assert.equal(validateTeamPatch({ name: "" }).ok, false);
  assert.equal(validateTeamPatch({ description: 1 }).ok, false);
});

test("validateMemberRole: chỉ LEAD hoặc MEMBER", () => {
  assert.deepEqual(validateMemberRole({ role: "LEAD" }), { ok: true, value: "LEAD" });
  assert.deepEqual(validateMemberRole({ role: "MEMBER" }), { ok: true, value: "MEMBER" });
  for (const role of ["BOSS", "lead", undefined, 1]) assert.equal(validateMemberRole({ role }).ok, false, String(role));
});

// ---- Đợt 2a (ADR-0127 quyết định 2): mức ưu tiên ---------------------------------------------------------------------------
test("validatePatchInput: thân chỉ có priority hợp lệ là đủ để lưu; giá trị lạ / null / không phải chữ ⇒ từ chối", () => {
  for (const p of ["NORMAL", "HIGH", "URGENT"]) assert.deepEqual(validatePatchInput({ priority: p }), { ok: true, value: { priority: p } });
  for (const p of ["LOW", "urgent", "", null, 2, {}]) {
    const r = validatePatchInput({ priority: p });
    assert.equal(r.ok, false, `priority=${JSON.stringify(p)}`);
    if (!r.ok) assert.equal(r.message, "Mức ưu tiên không hợp lệ.");
  }
  assert.deepEqual(validatePatchInput({ status: "ACK", priority: "URGENT" }), { ok: true, value: { status: "ACK", priority: "URGENT" } });
});

test("validateTicketInput: người gửi kèm priority ⇒ bị bỏ qua (không có trong giá trị trả về)", () => {
  const r = validateTicketInput({ ...ok, priority: "URGENT" });
  assert.ok(r.ok);
  assert.equal("priority" in r.value, false);
});

test("validateTicketInput: orderId tuỳ chọn — vắng / null ⇒ không gắn; UUID ⇒ giữ đúng; sai dạng ⇒ CÙNG câu với đơn không tồn tại / không phải của mình", () => {
  const vang = validateTicketInput(ok);
  assert.ok(vang.ok);
  assert.equal("orderId" in vang.value, false);
  const rong = validateTicketInput({ ...ok, orderId: null });
  assert.ok(rong.ok);
  assert.equal("orderId" in rong.value, false);
  const id = "d0000000-0000-4000-8000-000000000007";
  const co = validateTicketInput({ ...ok, orderId: id });
  assert.ok(co.ok);
  assert.equal(co.value.orderId, id);
  for (const x of ["", "abc", 123, true, {}, [], "D0000000-0000-4000-8000-000000000007", `${id} `]) {
    const r = validateTicketInput({ ...ok, orderId: x });
    assert.equal(r.ok, false, `orderId=${JSON.stringify(x)}`);
    if (!r.ok) assert.equal(r.message, CAU_DON_LIEN_QUAN_SAI);
  }
  assert.equal(CAU_DON_LIEN_QUAN_SAI, "Không gắn được đơn này: chỉ gắn được đơn do chính bạn lập.");
  const kem = validateTicketInput({ ...ok, orderId: id, priority: "URGENT" });
  assert.ok(kem.ok);
  assert.equal("priority" in kem.value, false, "kèm orderId vẫn bỏ qua priority");
});

test("parseSince (tuyến làm mới, ADR-0127 quyết định 1): chỉ nhận ISO UTC đủ ngày giờ có Z; chuẩn hoá về toISOString để so chuỗi với created_at", () => {
  assert.equal(MESSAGES_SINCE_LIMIT, 100);
  assert.equal(parseSince("2026-10-17T03:04:05.678Z"), "2026-10-17T03:04:05.678Z");
  // Thiếu phần nghìn giây ⇒ bổ sung «.000»: không chuẩn hoá thì «…:05Z» lớn hơn «…:05.500Z» khi so chuỗi (Z > .) ⇒ mất tin.
  assert.equal(parseSince("2026-10-17T03:04:05Z"), "2026-10-17T03:04:05.000Z");
  assert.equal(parseSince("2026-10-17T03:04:05.5Z"), "2026-10-17T03:04:05.500Z");
  for (const sai of [null, "", "abc", "2026-10-17", "2026-10-17T03:04:05", "2026-10-17T03:04:05+07:00", "2026-10-17 03:04:05Z", "2026-13-01T00:00:00Z",
    "2026-02-30T00:00:00Z", "2026-10-17T24:00:00Z", "2026-10-17T03:04:05.1234Z", " 2026-10-17T03:04:05Z", "1e12"]) {
    assert.equal(parseSince(sai), null, String(sai));
  }
});

test("trần trang của tuyến làm mới: hằng phía khách (LAM_MOI_TRAN) bằng đúng MESSAGES_SINCE_LIMIT của máy chủ — lệch thì khách không biết khi nào phải gọi tiếp ngay", () => {
  assert.equal(LAM_MOI_TRAN, MESSAGES_SINCE_LIMIT);
});
