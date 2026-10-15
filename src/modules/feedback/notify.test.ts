// src/modules/feedback/notify.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildMail, notifyAdmins, type MailDeps, type NotifyEvent } from "./notify.ts";

const ev: NotifyEvent = { type: "created", code: "YC-0007", kindName: "Báo lỗi", title: "Lỗi <b>lưu</b>\r\nBcc: x@y.z", submitterName: "An & Bình", excerpt: "<script>alert(1)</script>", teamName: "Kỹ thuật", sensitive: false, url: "https://booking.tourdao.vn/feedback?id=abc" };

function deps(over: Partial<MailDeps> = {}): { d: MailDeps; notified: (string | null)[]; logs: string[] } {
  const notified: (string | null)[] = [];
  const logs: string[] = [];
  const d: MailDeps = {
    mailer: { send: async () => ({}) },
    to: "admin@example.com",
    from: "hotro@example.com",
    setNotified: async (at) => void notified.push(at),
    now: () => "2026-09-21T10:00:00.000Z",
    log: (m) => void logs.push(m),
    ...over,
  };
  return { d, notified, logs };
}

test("buildMail: tiêu đề một dòng, nội dung HTML được thoát", () => {
  const m = buildMail(ev);
  assert.ok(!/[\r\n]/.test(m.subject), "tiêu đề không được chứa xuống dòng (chèn header)");
  assert.ok(m.subject.includes("YC-0007"));
  assert.ok(!m.html.includes("<script>") && !m.html.includes("<b>lưu</b>"));
  assert.ok(m.html.includes("&lt;script&gt;") && m.html.includes("An &amp; Bình"));
  assert.ok(m.html.includes(ev.url));
});

test("gửi được → đặt notified_at", async () => {
  const { d, notified } = deps();
  assert.equal(await notifyAdmins(d, ev), "sent");
  assert.deepEqual(notified, ["2026-09-21T10:00:00.000Z"]);
});

test("gửi lỗi → không ném, notified_at về NULL, có ghi log", async () => {
  const { d, notified, logs } = deps({ mailer: { send: async () => Promise.reject(new Error("beta hỏng")) } });
  assert.equal(await notifyAdmins(d, ev), "failed");
  assert.deepEqual(notified, [null]);
  assert.equal(logs.length, 1);
});

test("thiếu cấu hình (binding/địa chỉ nhận/địa chỉ gửi) → bỏ qua, notified_at NULL", async () => {
  for (const over of [{ mailer: undefined }, { to: undefined }, { from: undefined }] as Partial<MailDeps>[]) {
    const { d, notified } = deps(over);
    assert.equal(await notifyAdmins(d, ev), "skipped");
    assert.deepEqual(notified, [null]);
  }
});

test("setNotified ném lỗi cũng không làm hỏng luồng", async () => {
  const { d } = deps({ setNotified: async () => Promise.reject(new Error("D1 lỗi")) });
  assert.equal(await notifyAdmins(d, ev), "sent");
});

test("buildMail: có tên nhóm trong tiêu đề; nhóm nhạy cảm KHÔNG kèm tiêu đề/nội dung phiếu", () => {
  const thuong = buildMail({ ...ev, teamName: "Kỹ thuật", sensitive: false });
  assert.ok(thuong.subject.includes("Kỹ thuật"));
  const nhay = buildMail({ ...ev, title: "Lỗi lương", teamName: "Nhân sự", sensitive: true });
  assert.ok(nhay.subject.includes("Nhân sự") && nhay.subject.includes("YC-0007"));
  assert.ok(!nhay.subject.includes("Lỗi") && !nhay.html.includes("Lỗi") && !nhay.html.includes(ev.excerpt) && !nhay.html.includes("Bình"), "không lộ tiêu đề, người gửi hay nội dung");
  assert.ok(nhay.html.includes(ev.url));
  const traLoi = buildMail({ ...ev, type: "user_replied", teamName: "Nhân sự", sensitive: true });
  assert.ok(traLoi.html.includes("Nhân sự") && !traLoi.html.includes("Lỗi") && !traLoi.html.includes("Bình"));
});
