import { test } from "node:test";
import assert from "node:assert/strict";
import { CAU_HET_PHIEN, DAU_KHONG_BAO, LY_DO_BI_THAY, cauTuDauNho, dauHetPhien, parseSessionEnded, sessionEndedMessage } from "./session-ended.ts";

test("parseSessionEnded: chỉ nhận thân có lý do chữ", () => {
  assert.equal(parseSessionEnded(null), null);
  assert.equal(parseSessionEnded({ reason: null, endedAt: null }), null);
  assert.equal(parseSessionEnded({ reason: "", endedAt: null }), null);
  assert.deepEqual(parseSessionEnded({ reason: "Đã đăng xuất", endedAt: 5 }), { reason: "Đã đăng xuất", endedAt: null });
  assert.deepEqual(parseSessionEnded({ reason: LY_DO_BI_THAY, endedAt: "2026-10-01T03:05:00.000Z" }), { reason: LY_DO_BI_THAY, endedAt: "2026-10-01T03:05:00.000Z" });
});

test("sessionEndedMessage: 'bị thay' có giờ Việt Nam; lý do khác có chữ lý do", () => {
  assert.equal(sessionEndedMessage({ reason: LY_DO_BI_THAY, endedAt: "2026-10-01T03:05:00.000Z" }), "Tài khoản vừa đăng nhập trên máy khác lúc 10:05");
  assert.equal(sessionEndedMessage({ reason: LY_DO_BI_THAY, endedAt: "2026-10-01T18:30:00.000Z" }), "Tài khoản vừa đăng nhập trên máy khác lúc 01:30", "qua nửa đêm theo giờ VN");
  assert.equal(sessionEndedMessage({ reason: LY_DO_BI_THAY, endedAt: null }), "Tài khoản vừa đăng nhập trên máy khác.");
  assert.equal(sessionEndedMessage({ reason: "Bị đặt lại PIN", endedAt: "2026-10-01T03:05:00.000Z" }), "Máy này đã bị đăng xuất. Lý do: Bị đặt lại PIN.");
});

test("dauHetPhien: khi nào ghi dấu — có lý do thì ghi lý do; không lý do thì chỉ ghi chuỗi rỗng nếu máy có bản nhớ khung", () => {
  const n = { reason: "Bị đặt lại PIN", endedAt: null };
  assert.equal(dauHetPhien({ reason: "", endedAt: null }, true), "", "thân không có lý do thật = như null");
  assert.equal(dauHetPhien(n, false), JSON.stringify(n), "có lý do: giữ hành vi cũ, dù có hay không bản nhớ khung");
  assert.equal(dauHetPhien(n, true), JSON.stringify(n));
  assert.equal(dauHetPhien(null, true), "", "không lý do + máy từng có người đăng nhập: chuỗi rỗng");
  assert.equal(dauHetPhien(null, false), DAU_KHONG_BAO, "không lý do + máy chưa từng đăng nhập (liên kết sâu): không ghi gì");
});

test("cauTuDauNho: chuỗi rỗng ra câu hết phiên; lý do ra câu cũ; sai dạng ra null", () => {
  assert.equal(cauTuDauNho(""), CAU_HET_PHIEN);
  assert.equal(CAU_HET_PHIEN, "Phiên đăng nhập đã hết. Đăng nhập lại để tiếp tục.");
  assert.equal(cauTuDauNho(JSON.stringify({ reason: "Bị đặt lại PIN", endedAt: null })), "Máy này đã bị đăng xuất. Lý do: Bị đặt lại PIN.");
  assert.equal(cauTuDauNho("{hỏng"), null);
  assert.equal(cauTuDauNho(DAU_KHONG_BAO), null, "máy chưa từng đăng nhập: không câu nào");
});

test("goLogin (web/api.ts) chặn gọi lặp: hai lời gọi 401 đồng thời dùng chung MỘT lượt, không để lượt sau ghi đè dấu của lượt đầu", async () => {
  const { readFileSync } = await import("node:fs");
  const src = readFileSync(new URL("../../web/api.ts", import.meta.url), "utf8");
  const m = src.match(/export (?:async )?function goLogin\(\)[^{]*\{([\s\S]*?)\n\}/);
  assert.ok(m, "tìm thấy goLogin");
  assert.match(m[1], /if \(dangDi\+\+\) return[^\n]*\n\s*await ghiNhoLyDoDangXuat/, "goLogin phải đặt cờ cấp module (dangDi++) TRƯỚC khi await, để lời gọi sau không chạy lại");
  assert.equal((src.match(/await ghiNhoLyDoDangXuat\(\)/g) ?? []).length, 1, "ghiNhoLyDoDangXuat chỉ được gọi từ một chỗ");
});
