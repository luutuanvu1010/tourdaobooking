// ADR-0236 Đ3 (lệnh chủ 26/11 «2- giữ nguyên như vậy, nhưng cho cả 2 tùy chọn này vào trong bảng điều khiển của Admin , Super Admin»): khối «Ô bằng lái trên phiếu đăng ký» ở trang Tôi
// CHỈ ĐỌC, nút bật khoá, vì phiếu chưa có ô bằng lái (ADR-0212 Đ8 chưa thi công). Bài này đỏ ngay khi `CO_O_BANG_LAI` đổi thành `true` — lúc đó phải làm công tắc thật có đường ghi ở máy chủ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { maskSource } from "../scripts/source-mask-lib.mjs";
import { CO_O_BANG_LAI } from "./shared/dang-ky-vai.ts";

const doc = (tep: string): string => maskSource(readFileSync(fileURLToPath(new URL(`../${tep}`, import.meta.url)), "utf8"), { strings: false, comments: true });

test("phiếu chưa có ô bằng lái ⇒ khối chỉ đọc: nút khoá, không gọi API, không đường ghi", () => {
  assert.equal(CO_O_BANG_LAI, false, "Đ8 làm xong thì đổi khối này sang công tắc thật (có POST, nhật ký, cài đặt CSDL)");
  const khoi = doc("web/o-bang-lai-cai-dat.ts");
  assert.match(khoi, /if \(CO_O_BANG_LAI\) return;/);
  assert.match(khoi, /id: "o-bang-lai-doi", disabled: true/);
  assert.doesNotMatch(khoi, /\bapi[<(]/, "không gọi máy chủ");
});

test("nối dây trang Tôi: hai khối hiện theo ô settings.form_fields (Quản trị + Toàn quyền), không theo settings.ops", () => {
  const acc = doc("web/account.ts");
  assert.match(acc, /if \(can\(staff, "settings\.form_fields"\)\) void ganCaiDatODatCoc\(byId\("o-dat-coc-cai-dat"\)\);/);
  assert.match(acc, /if \(can\(staff, "settings\.form_fields"\)\) ganCaiDatOBangLai\(byId\("o-bang-lai-cai-dat"\)\);/);
});
