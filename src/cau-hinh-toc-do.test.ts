// Hai thiết lập Cloudflare phục vụ tốc độ phải còn nguyên trong wrangler.jsonc (nghiên cứu tốc độ 2026-10-02, đợt 1; ADR-0102). Bài này chỉ ghim CHỮ trong tệp cấu hình —
// hiệu quả thật (Cloudflare có chuyển Worker lại gần cơ sở dữ liệu không) kiểm bằng header `cf-placement` và biểu đồ "Request duration" sau triển khai.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const chuThich = readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8");
const khongChuThich = chuThich.split("\n").filter((d) => !/^\s*\/\//.test(d)).join("\n"); // bỏ dòng chú thích toàn dòng (JSONC)
const cauHinh = JSON.parse(khongChuThich) as { placement?: Record<string, unknown>; assets?: { run_worker_first?: unknown } };

test("wrangler.jsonc vẫn đọc được như JSON sau khi bỏ dòng chú thích (không lỡ tay hỏng cú pháp)", () => {
  assert.equal(typeof cauHinh, "object");
});

test("Smart Placement bật: Worker được đặt gần cơ sở dữ liệu thay vì gần người bấm (mỗi lời gọi API hỏi D1 nhiều lần)", () => {
  assert.deepEqual(cauHinh.placement, { mode: "smart" });
});

test("run_worker_first gồm /api/*, /giao-dien.css (tệp màu do Worker dựng từ D1) VÀ /__scheduled (wrangler dev --test-scheduled: không có thì not_found_handling 404-page trả trang 404, e2e catalog đỏ 29/10)", () => {
  assert.deepEqual(cauHinh.assets?.run_worker_first, ["/api/*", "/giao-dien.css", "/__scheduled"]);
});

test("không khai placement kiểu vùng (`region`/`host`): D1 không có mã vùng AWS/GCP/Azure để nhắm; chỉ chế độ smart là dùng được", () => {
  for (const k of ["region", "host", "hostname"]) assert.equal(cauHinh.placement?.[k], undefined, k);
});
