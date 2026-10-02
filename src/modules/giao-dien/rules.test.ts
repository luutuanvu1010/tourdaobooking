import { test } from "node:test";
import assert from "node:assert/strict";
import { chiTietDoi } from "./rules.ts";

test("chiTietDoi: nêu nhãn tiếng Việt, cũ → mới, 'mặc định' khi vắng; không đổi → 'Không đổi'", () => {
  assert.equal(chiTietDoi({}, {}), "Không đổi");
  assert.equal(chiTietDoi({ "nen-thanh-tren": "#ffffff" }, {}), "Nền thanh trên: #ffffff → mặc định");
  assert.equal(chiTietDoi({}, { "phong-noi-dung": "nunito" }), "Phông nội dung: mặc định → nunito");
});
