// Bài kiểm LOGIC THUẦN của "gọi sớm" (tối ưu tải 2026-09-27, web/goi-som.ts): lời gọi dữ liệu của trang được gửi NGAY khi mã trang chạy, song song
// với /api/auth/me của khung, thay vì nối đuôi sau nó. Lần lấy đầu dùng lời gọi đã gửi; mọi lần sau (làm mới, tải lại) gọi mới như cũ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { goiSom } from "../web/goi-som.ts";

/** Chạy `fn` và trả về các lỗi "unhandled rejection" xuất hiện trong lúc đó. */
async function batUnhandled(fn: () => Promise<void>): Promise<unknown[]> {
  const seen: unknown[] = [];
  const on = (e: unknown) => seen.push(e);
  process.on("unhandledRejection", on);
  try {
    await fn();
    await new Promise((r) => setTimeout(r, 10));
  } finally {
    process.off("unhandledRejection", on);
  }
  return seen;
}

test("gửi ngay khi tạo; lần lấy đầu dùng đúng lời gọi đó, lần sau gọi mới", async () => {
  let soLan = 0;
  const lay = goiSom(async () => ++soLan);
  assert.equal(soLan, 1, "phải gửi ngay, không chờ lần lấy đầu");
  assert.equal(await lay(), 1);
  assert.equal(soLan, 1, "lần lấy đầu không được gửi thêm");
  assert.equal(await lay(), 2, "lần lấy sau phải là dữ liệu mới");
  assert.equal(soLan, 2);
});

test("lỗi về TRƯỚC lúc được lấy không thành 'unhandled rejection', và vẫn ném đúng lỗi khi lấy", async () => {
  const seen = await batUnhandled(async () => {
    const lay = goiSom(() => Promise.reject(new Error("403")));
    await new Promise((r) => setTimeout(r, 10)); // lỗi đã về, chưa ai lấy
    await assert.rejects(lay(), /403/);
  });
  assert.deepEqual(seen, []);
});

test("không bao giờ lấy (trang chuyển hướng trước khi cần dữ liệu) thì lời gọi lỗi cũng không gây 'unhandled rejection'", async () => {
  const seen = await batUnhandled(async () => {
    goiSom(() => Promise.reject(new Error("403")));
  });
  assert.deepEqual(seen, []);
});
