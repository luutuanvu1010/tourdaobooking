// Việc 5 (b1) — kế hoạch 16 việc 21/11/2026, ADR-0225 Đ1 (bản đề xuất): form Tạo đơn của tài khoản Đối tác KHÔNG còn ô «Khách đặt cọc cho đối tác» và KHÔNG còn
// chữ gợi ý «nội dung chuyển khoản» ở ô Ghi chú thanh toán. Form văn phòng không đổi. Máy chủ không đổi ở bước này (lời khai cũ trong nháp giữ nguyên, docLoiKhai: thiếu khoá ⇒ giữ số).
// Hai lớp: luật thuần (giá trị hằng) + "nối dây" (quét mã nguồn giao diện đã che chú thích). Giới hạn: canh QUÊN, không canh CỐ Ý; hành vi chạy thật do kịch bản Chrome canh.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { maskSource } from "../scripts/source-mask-lib.mjs";
import { HIEN_O_DAT_COC_DOI_TAC, nhanGapGiaiThichTien } from "./shared/form-dat-ve.ts";

const doc = (tep: string): string => maskSource(readFileSync(fileURLToPath(new URL(`../${tep}`, import.meta.url)), "utf8"), { strings: false, comments: true });
const form = doc("web/order-form.ts");

test("luật thuần: ô đặt cọc của Đối tác tắt; nhãn nút gập không nhắc «đặt cọc» khi không có ô", () => {
  assert.equal(HIEN_O_DAT_COC_DOI_TAC, false);
  assert.equal(nhanGapGiaiThichTien(false), "Giải thích giảm giá");
  assert.equal(nhanGapGiaiThichTien(true), "Giải thích giảm giá, đặt cọc");
});

test("nối dây: form chỉ bật ô cọc khi CẢ hằng lẫn quyền Đối tác cho phép", () => {
  assert.match(form, /\bcoODatCoc\s*=\s*HIEN_O_DAT_COC_DOI_TAC\s*&&\s*holdsPartner\(staff\);/);
  assert.doesNotMatch(form, /\bcoODatCoc\s*=\s*holdsPartner\(staff\);/, "không gán thẳng theo quyền nữa");
  assert.match(form, /byId\("dat-coc-o"\)\.hidden = !coODatCoc;/);
});

test("nối dây: form Đối tác bỏ chữ gợi ý «nội dung chuyển khoản»; nhánh form văn phòng giữ nguyên", () => {
  const nhanh = form.slice(form.indexOf("if (formGon) {"), form.indexOf("duocDatGap = can("));
  assert.match(nhanh, /field\("paymentNote"\) as HTMLTextAreaElement\)\.placeholder = "";/, "phải nằm trong nhánh form Đối tác");
  assert.match(nhanh, /nhan: nhanGapGiaiThichTien\(coODatCoc\)/, "nhãn nút gập theo cờ ô cọc");
  const html = readFileSync(fileURLToPath(new URL("../public/order-form.html", import.meta.url)), "utf8");
  assert.match(html, /id="paymentNote"[^>]*placeholder="vd: nội dung chuyển khoản"/, "form văn phòng giữ chữ gợi ý cũ");
});

test("nối dây: nút gập «Giải thích…» ẩn khi khối gập không còn câu nào để hiện", () => {
  assert.match(form, /gapGiaiThich\.nut\.hidden = !coODatCoc && !gapGiaiThich\.than\.querySelector\("#discount-hint"\);/);
});
