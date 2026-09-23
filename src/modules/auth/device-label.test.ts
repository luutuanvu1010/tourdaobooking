import { test } from "node:test";
import assert from "node:assert/strict";
import { deviceLabel } from "./device-label.ts";

test("tên máy từ User-Agent, không bao giờ chứa dữ liệu người dùng", () => {
  assert.equal(deviceLabel("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15"), "iPhone");
  assert.equal(deviceLabel("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)"), "iPad");
  assert.equal(deviceLabel("Mozilla/5.0 (Linux; Android 14; SM-S918B)"), "Android");
  assert.equal(deviceLabel("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"), "Máy Mac");
  assert.equal(deviceLabel("Mozilla/5.0 (Windows NT 10.0; Win64; x64)"), "Máy Windows");
  assert.equal(deviceLabel("curl/8.0"), "Thiết bị khác");
  assert.equal(deviceLabel(null), "Thiết bị khác");
});
