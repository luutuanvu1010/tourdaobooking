// ADR-0236 Đ1 (lệnh chủ 26/11 «1- bật lại đi»; thay hằng `HIEN_O_DAT_COC_DOI_TAC` của ADR-0225 Đ1): ô «Khách đặt cọc cho đối tác» trên form Tạo đơn của tài khoản Đối tác hiện theo CÔNG TẮC
// lưu ở CSDL (`apChoToi` của GET /api/cai-dat/o-dat-coc-doi-tac), không theo hằng trong mã. Chữ gợi ý «nội dung chuyển khoản» vẫn bỏ ở form Đối tác (ADR-0225 Đ2 còn hiệu lực:
// đơn đối tác chỉ thu hộ tiền mặt). Hai lớp: luật thuần + "nối dây" (quét mã nguồn giao diện đã che chú thích). Giới hạn: canh QUÊN, không canh CỐ Ý; hành vi chạy thật do kịch bản Chrome canh.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { maskSource } from "../scripts/source-mask-lib.mjs";
import * as formDatVe from "./shared/form-dat-ve.ts";

const doc = (tep: string): string => maskSource(readFileSync(fileURLToPath(new URL(`../${tep}`, import.meta.url)), "utf8"), { strings: false, comments: true });
const form = doc("web/order-form.ts");

test("luật thuần: không còn hằng ẩn / hiện ô cọc trong mã; nhãn nút gập theo cờ ô cọc", () => {
  assert.equal("HIEN_O_DAT_COC_DOI_TAC" in formDatVe, false, "ô cọc theo công tắc CSDL, không theo hằng");
  assert.equal(formDatVe.nhanGapGiaiThichTien(false), "Giải thích giảm giá");
  assert.equal(formDatVe.nhanGapGiaiThichTien(true), "Giải thích giảm giá, đặt cọc");
});

test("nối dây: form hỏi công tắc ở máy chủ (chỉ tài khoản giữ quyền Đối tác hỏi; lỗi ⇒ ẩn), rồi bật ô cọc khi CẢ công tắc lẫn quyền Đối tác cho phép", () => {
  assert.match(form, /\blayODatCoc\s*=\s*holdsPartner\(staff\)\s*\?\s*api<Api\.ODatCocDoiTacResponse>\("\/api\/cai-dat\/o-dat-coc-doi-tac"\)\.then\(\(r\) => r\.apChoToi, \(\) => false\)\s*:\s*Promise\.resolve\(false\);/);
  assert.match(form, /\bcoODatCoc\s*=\s*\(await layODatCoc\)\s*&&\s*holdsPartner\(staff\);/);
  assert.doesNotMatch(form, /HIEN_O_DAT_COC_DOI_TAC/);
  assert.match(form, /byId\("dat-coc-o"\)\.hidden = !coODatCoc;/);
  assert.ok(form.indexOf("layODatCoc =") < form.indexOf("coODatCoc = (await layODatCoc)"), "hỏi trước, chờ sau");
});

test("nối dây: form Đối tác vẫn bỏ chữ gợi ý «nội dung chuyển khoản» (ADR-0225 Đ2); nhánh form văn phòng giữ nguyên", () => {
  const nhanh = form.slice(form.indexOf("if (formGon) {"), form.indexOf("duocDatGap = can("));
  assert.match(nhanh, /field\("paymentNote"\) as HTMLTextAreaElement\)\.placeholder = "";/, "phải nằm trong nhánh form Đối tác");
  assert.match(nhanh, /nhan: nhanGapGiaiThichTien\(coODatCoc\)/, "nhãn nút gập theo cờ ô cọc");
  const html = readFileSync(fileURLToPath(new URL("../public/order-form.html", import.meta.url)), "utf8");
  assert.match(html, /id="paymentNote"[^>]*placeholder="vd: nội dung chuyển khoản"/, "form văn phòng giữ chữ gợi ý cũ");
});

test("nối dây: nút gập «Giải thích…» ẩn khi khối gập không còn câu nào để hiện", () => {
  assert.match(form, /gapGiaiThich\.nut\.hidden = !coODatCoc && !gapGiaiThich\.than\.querySelector\("#discount-hint"\);/);
});
