// Báo khi việc tự động lỗi (Đợt 2 sau kiểm toán, đặc tả docs/superpowers/specs/2026-11-16-dot-2-lay-lai-duoc-du-lieu.md mục 2): lượt 7 giờ sáng giờ VN gửi MỘT thư
// liệt kê việc định giờ đang hỏng; lượt khác chỉ log; không hỏng thì không thư; thư không chứa câu lỗi thô. Chạy CẢ Worker trên SQLite thật (tests/audit/harness.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { app, world } from "../tests/audit/harness.mjs";
import { baoLoiDinhGio, ketQuaViec } from "./bao-loi-dinh-gio.ts";

const BAY_GIO_SANG = Date.parse("2026-11-16T00:05:00Z");
const TAM_GIO_SANG = Date.parse("2026-11-16T01:05:00Z");
const SHEET = "1XPx1g0JVTdevdX35MeCpt6Cc6Dgxdmfer6okEWleD3s";

function moiTruong() {
  const w = world();
  const thu: { to: string; subject: string; text?: string }[] = [];
  const env = { ...w.env, SERVICES_SHEET_ID: SHEET, EMAIL: { send: async (m: (typeof thu)[number]) => void thu.push(m) }, FEEDBACK_MAIL_FROM: "noreply@vi-du.test", FEEDBACK_NOTIFY_EMAIL: "chu@vi-du.test" };
  return { w, env, thu };
}

async function voiFetch<T>(f: typeof fetch, viec: () => Promise<T>): Promise<T> {
  const goc = globalThis.fetch;
  globalThis.fetch = f;
  try {
    return await viec();
  } finally {
    globalThis.fetch = goc;
  }
}
const sheetHong = (async () => { throw new TypeError("mạng hỏng: chuỗi-bí-mật-của-nhà-cung-cấp"); }) as unknown as typeof fetch;
const HEADER = "Mã tour,Tên tour,Khoá giá,Đường dẫn,Đơn vị,Giá người lớn,Giá trẻ em,Ghi chú trẻ em,Giá người cao tuổi,Ghi chú người cao tuổi,Giá em bé,Ghi chú em bé,Ghi chú nội bộ";
const sheetTot = (async () => new Response([HEADER, "TD101,Tour 3 đảo,k,d,perPax,850000,595000,,850000,,0,,"].join("\n"), { status: 200, headers: { "content-type": "text/csv" } })) as unknown as typeof fetch;

async function chayCron(env: unknown, scheduledTime: number): Promise<void> {
  const cho: Promise<unknown>[] = [];
  await app.default.scheduled({ cron: "*/15 * * * *", scheduledTime }, env, { waitUntil: (p: Promise<unknown>) => void cho.push(p), passThroughOnException() {} });
  await Promise.all(cho);
}

test("ketQuaViec: null/void = thành; chuỗi = mã lỗi; ném = tên lỗi; không bao giờ ném", async () => {
  assert.equal(await ketQuaViec(Promise.resolve(undefined)), null);
  assert.equal(await ketQuaViec(Promise.resolve(null)), null);
  assert.equal(await ketQuaViec(Promise.resolve("sheet_unreachable")), "sheet_unreachable");
  assert.equal(await ketQuaViec(Promise.reject(new RangeError("x"))), "RangeError");
});

test("Sheet hỏng: lượt 8 giờ không thư; lượt 7 giờ đúng MỘT thư nêu việc và mã lỗi, không câu lỗi thô; các việc khác vẫn chạy", async () => {
  const { env, thu } = moiTruong();
  await voiFetch(sheetHong, () => chayCron(env, TAM_GIO_SANG));
  assert.equal(thu.length, 0);
  await voiFetch(sheetHong, () => chayCron(env, BAY_GIO_SANG));
  assert.equal(thu.length, 1);
  assert.match(thu[0]!.subject, /1 việc tự động đang lỗi \(sáng 16\/11\/2026\)/);
  assert.match(thu[0]!.text ?? "", /Đồng bộ danh mục dịch vụ từ Google Sheet — mã lỗi: sheet_unreachable/);
  assert.ok(!(thu[0]!.text ?? "").includes("chuỗi-bí-mật"), "không đưa câu lỗi thô ra thư");
});

test("không việc nào hỏng ⇒ lượt 7 giờ không gửi thư báo lỗi", async () => {
  const { env, thu } = moiTruong();
  await voiFetch(sheetTot, () => chayCron(env, BAY_GIO_SANG));
  assert.equal(thu.filter((t) => /việc tự động đang lỗi/.test(t.subject)).length, 0);
});

test("nhiều việc hỏng cùng lượt ⇒ vẫn một thư; thiếu người nhận hoặc bộ gửi ném ⇒ không ném", async () => {
  const thu: { subject: string; text?: string }[] = [];
  const env = { EMAIL: { send: async (m: (typeof thu)[number]) => void thu.push(m) }, FEEDBACK_MAIL_FROM: "a@b.test", FEEDBACK_NOTIFY_EMAIL: "c@d.test" };
  await baoLoiDinhGio(env, BAY_GIO_SANG, { "don-anh-ve": Promise.reject(new Error("x")), "nhac-han-tra-sau": Promise.resolve("TypeError"), "don-phieu-dang-ky": Promise.resolve(null) });
  assert.equal(thu.length, 1);
  assert.match(thu[0]!.text ?? "", /Xoá ảnh vé hết hạn lưu — mã lỗi: Error/);
  assert.match(thu[0]!.text ?? "", /Nhắc hạn trả sau — mã lỗi: TypeError/);
  assert.ok(!/Dọn phiếu đăng ký/.test(thu[0]!.text ?? ""));
  await baoLoiDinhGio({ ...env, FEEDBACK_NOTIFY_EMAIL: "" }, BAY_GIO_SANG, { "don-anh-ve": Promise.reject(new Error("x")) });
  await baoLoiDinhGio({ ...env, EMAIL: { send: async () => { throw new Error("hỏng"); } } }, BAY_GIO_SANG, { "don-anh-ve": Promise.reject(new Error("x")) });
  assert.equal(thu.length, 1);
});
