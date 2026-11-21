// HÀNG RÀO «NỐI DÂY» của ADR-0221 lượt 2 (giao diện): công tắc «Đối tác không nhập nơi đón» ở trang Tôi, form Tạo đơn ẩn hết lượt, bảng «Còn vé» có ô «Nơi đón», Chi tiết đơn không hiện chữ tạm.
// Luật thuần (form-dat-ve.ts, chang-form.ts, dong-gap-the.ts, xac-nhan-hien-thi.ts, noi-don-tam.ts) đã có bài cạnh tệp; bài này quét mã nguồn giao diện (đã che chú thích, giữ chuỗi) và đỏ khi một dây bị đứt.
// Giới hạn: canh QUÊN, không canh CỐ Ý; QUÉT MÃ NGUỒN, không kiểm hành vi chạy (cần Chrome thật — kịch bản docs/evidence/2026-11-21-adr-0221/kich-ban/noi-don-doi-tac-smoke.mjs, ngoài `npm test`).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { maskSource } from "../scripts/source-mask-lib.mjs";

const tho = (tep: string): string => readFileSync(fileURLToPath(new URL(`../${tep}`, import.meta.url)), "utf8");
const doc = (tep: string): string => maskSource(tho(tep), { strings: false, comments: true });

test("công tắc ở trang Tôi: khối riêng, chỉ dựng khi giữ ô settings.ops, đọc và ghi đúng route, chỉ hiện khi máy chủ trả doiDuoc", () => {
  assert.match(tho("public/account.html"), /<section id="noi-don-cai-dat" class="card" aria-labelledby="noi-don-heading" hidden><\/section>/);
  assert.match(doc("web/account.ts"), /if \(can\(staff, "settings\.ops"\)\) void ganCaiDatNoiDon\(byId\("noi-don-cai-dat"\)\);/);
  const ct = doc("web/noi-don-cai-dat.ts");
  assert.match(ct, /const URL = "\/api\/cai-dat\/noi-don-doi-tac";/);
  assert.match(ct, /if \(!s\.doiDuoc\) return;/);
  assert.match(ct, /const body: Api\.NoiDonDoiTacRequest = \{ bat: !s\.bat \};/);
  assert.match(ct, /h\("h2", \{ id: "noi-don-heading" \}, "Đối tác không nhập nơi đón"\)/, "tên công tắc do chủ chọn 21/11");
  assert.doesNotMatch(ct, /innerHTML/);
});

test("form Tạo đơn: chỉ tài khoản dùng form gọn mới hỏi công tắc, lấy apChoToi, đặt cờ TRƯỚC khi dựng thẻ và truyền xuống thẻ dịch vụ", () => {
  const form = doc("web/order-form.ts");
  assert.match(form, /api<Api\.NoiDonDoiTacResponse>\("\/api\/cai-dat\/noi-don-doi-tac"\)\.then\(\(r\) => r\.apChoToi, \(\) => null\)/);
  assert.match(form, /const layNoiDon = formGon \? docCongTacNoiDon\(\) : Promise\.resolve\(null\);/, "người không giữ quyền Đối tác không hỏi ⇒ form không đổi");
  assert.match(form, /khongNhapNoiDon = noiDonMay === true;/);
  assert.match(form, /const khongCanNoiDon = \(d: ServiceDraft\): boolean => khongNhapNoiDon && duaDonAnHetLuot\(d\.legs, orderDate\);/, "ghép công tắc với luật an toàn của TỪNG dịch vụ");
  assert.match(form, /createServiceCard\(\{[\s\S]*?khongNhapNoiDon: \(\) => khongNhapNoiDon,/);
  assert.ok(form.indexOf("khongNhapNoiDon = noiDonMay === true;") < form.indexOf("await loadOrder();"), "cờ đặt trước khi nạp đơn / dựng thẻ");
  // Mọi chỗ form hỏi lỗi của bản nháp đều mang cờ — sót một chỗ thì «Gửi đơn» bị chặn bởi lỗi «chưa có nơi đón» của ô đang ẩn.
  const goi = form.match(/draftIssues\([^)]*\)/g) ?? [];
  assert.ok(goi.length >= 3, `thấy ${goi.length} chỗ gọi draftIssues`);
  for (const g of goi) assert.match(g, /khongCanNoiDon: khongCanNoiDon\(/, `draftIssues thiếu cờ: ${g}`);
  assert.match(form, /theMoKhiNap\(d, orderDate, laSanBay, khongCanNoiDon\(d\)\)/);
  assert.match(form, /await hienLaiNoiDonNeuCan\(err\);/, "máy chủ từ chối 400 thì đọc lại công tắc");
});

test("thẻ dịch vụ: cờ đi vào khối Đưa đón, mọi chỗ hỏi lỗi và dòng gập; dòng gập ghi «Đón» khi không còn chữ nào về đưa đón", () => {
  const the = doc("web/service-card.ts");
  assert.match(the, /const khongCanNoiDon = \(\): boolean => o\.khongNhapNoiDon\?\.\(\) === true && duaDonAnHetLuot\(draft\.legs, o\.duaDon\.ngayDi\(\)\);/);
  assert.match(the, /anHetLuot: \(\) => o\.khongNhapNoiDon\?\.\(\) === true,/);
  assert.match(the, /coLoiChanLuuDangHien\(draft, issuesVisible, khongCanNoiDon\(\)\)/);
  assert.match(the, /dongGapThe\(d, \{[^}]*khongCanNoiDon: khongCan \}\)/);
  assert.match(the, /dg\.don \?\? \(khongCan \? NHAN_LUA_CHON_DON\.DON : null\)/);
  const goi = the.match(/draftIssues\([^)]*\)/g) ?? [];
  assert.ok(goi.length >= 3);
  for (const g of goi) assert.match(g, /khongCanNoiDon: khongCanNoiDon\(\)/, `draftIssues thiếu cờ: ${g}`);
});

test("khối Đưa đón: lớp dd-an-het-luot theo công tắc VÀ luật an toàn; kiểm lỗi lượt mang cờ; CSS ẩn cả khung lượt", () => {
  const khoi = doc("web/khoi-dua-don.ts");
  assert.match(khoi, /const anHet = \(\): boolean => o\.che === "form" && o\.anHetLuot\?\.\(\) === true && duaDonAnHetLuot\(legs, o\.ngayDi\(\)\);/);
  assert.match(khoi, /root\.classList\.toggle\("dd-an-het-luot", anHetLuot\);/);
  const goi = khoi.match(/\bloiChang\(l, [^;]*;/g) ?? [];
  assert.equal(goi.length, 2, "hai chỗ khối hỏi lỗi lượt (vẽ lại, bấm Lưu)");
  for (const g of goi) assert.match(g, /, anHet\(\)\);$/, `loiChang thiếu cờ: ${g}`);
  const css = tho("public/app.css");
  assert.match(css, /\.dd-an-het-luot > \.dd-ghi-tao,\n\.dd-an-het-luot > \.dd-nut,\n\.dd-an-het-luot > \.dd-chang-khung \{ display: none; \}/);
  assert.doesNotMatch(css, /\.dd-an-het-luot[^{]*\.dd-chon-don/, "hai nút Đón / Không đón không bao giờ bị ẩn");
});

test("bảng Còn vé: ô «Nơi đón» cho lượt canNoiDon dùng thành phần chọn nơi của form, báo tại lượt, gửi noiDon, giữ bảng khi 409 pickup_place_required", () => {
  const ui = doc("web/xac-nhan-don-ui.ts");
  assert.match(ui, /if \(lx\.canNoiDon\) \{/);
  assert.match(ui, /taoONoiGoiY\(\{/);
  assert.match(ui, /nhanNoiDonLuot\(lx\.nhanChieu, s\.name\)/);
  assert.match(ui, /w\.o\.classList\.add\("vc-input"\)/, "ô gõ 16px");
  assert.match(ui, /thieuNoiDonConVe\(dongConVe, /, "thiếu nơi đón xét bằng luật thuần");
  assert.match(ui, /o\.noiDon\.datLoi\(thieuNoiLuot \? CAU_THIEU_NOI_DON_LUOT : null\)/);
  assert.match(ui, /if \(noiDon\.length > 0\) than\.noiDon = noiDon;/);
  assert.match(ui, /const thieuNhapLieu = err instanceof ApiError && \(err\.code === "pickup_place_required" \|\| /, "409 thiếu nơi đón không tải lại bảng");
  // Báo thiếu đứng TRƯỚC hộp hỏi lại và TRƯỚC lời gọi máy chủ của nút Còn vé.
  const nut = ui.slice(ui.indexOf('nutConVe.addEventListener("click"'), ui.indexOf("// ---- Hết vé ----"));
  assert.ok(nut.indexOf("thieuNoiDonConVe(") > 0 && nut.indexOf("thieuNoiDonConVe(") < nut.indexOf("hoiXacNhan(") && nut.indexOf("hoiXacNhan(") < nut.indexOf("guiQuyet("));
});

test("Chi tiết đơn: nhãn nơi đón của lượt đi qua nhanNoiDon; không tệp giao diện nào hiện thẳng pickupLabel của lượt", () => {
  const don = doc("web/order.ts");
  assert.match(don, /laNoiDonTam\(l\) \? canhEl\(nhanNoiDon\(l\.pickupLabel\)\) : h\("span", null, nhanNoiDon\(l\.pickupLabel\)\)/);
  assert.match(don, /doiTac && laNoiDonTam\(l\) \? nhacEl\(CAU_VAN_PHONG_DIEN_NOI_DON\) : null/);
  assert.match(don, /khoiDuaDonDon\(order, suaChuyen, nutDuaDon, laTaiKhoanDoiTac\(staff!\)\)/, "câu nhắc chỉ cho tài khoản giữ quyền Đối tác");
  assert.equal((don.match(/\.pickupLabel/g) ?? []).length, 2, "web/order.ts chỉ đọc pickupLabel ở đúng dòng đã bọc nhanNoiDon — thêm chỗ mới thì bọc rồi sửa số này");
});
