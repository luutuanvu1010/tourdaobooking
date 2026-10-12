// HÀNG RÀO "NỐI DÂY" của giao diện bên đặt là đối tác (sổ đại lý đợt 1, Task 11). Luật thuần (src/shared/phan-doi-tac-hien-thi.ts) và các bài nối với route thật chỉ chứng minh
// RẰNG luật đúng; không ai kiểm được nó có được GỌI. Bài này quét mã nguồn giao diện (đã che chú thích, giữ chuỗi) và đỏ khi một dây bị đứt: ô không còn gắn vào form / bảng đổi
// khách, khối "Phần đối tác" không còn được gắn và nạp ở trang đơn, nhãn "Bên đặt (đối tác)" không còn theo cờ của máy chủ, mã id cố định (kịch bản Chrome dựa vào) bị đổi.
// Giới hạn: canh QUÊN, không canh CỐ Ý; không chứng minh giao diện chạy đúng (cần Chrome thật — chưa chạy ở Task 11).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { maskSource } from "../scripts/source-mask-lib.mjs";

const doc = (tep: string): string => maskSource(readFileSync(fileURLToPath(new URL(`../${tep}`, import.meta.url)), "utf8"), { strings: false, comments: true });

test("ô \"Đặt qua đối tác\" có id cố định và nằm ở cả form lập đơn lẫn bảng đổi khách", () => {
  assert.match(doc("web/dat-qua-doi-tac.ts"), /id:\s*"dat-qua-doi-tac"/, "id #dat-qua-doi-tac");
  assert.match(doc("web/dat-qua-doi-tac.ts"), /id:\s*"ben-dat-chi-doc"/, "id #ben-dat-chi-doc (dòng chỉ đọc của tài khoản Đối tác)");
  assert.match(doc("web/order-form.ts"), /oDatQuaDoiTac\(\{/, "form lập đơn dựng ô");
  assert.match(doc("web/order-form.ts"), /khoiBenDatForm\(\s*staff,\s*benDatCuaToi\(\)\s*\)/, "form lập đơn hỏi luật thuần xem hiện gì, với bên đặt MÁY CHỦ ép");
  assert.match(doc("web/order-form.ts"), /gopBenDat\(/, "form lập đơn gửi bên đặt qua luật gộp");
  assert.match(doc("web/booker-sheet.ts"), /oDatQuaDoiTac\(\{/, "bảng đổi khách dựng ô");
  assert.match(doc("web/booker-sheet.ts"), /gopBenDat\(/, "bảng đổi khách gửi bên đặt qua luật gộp");
  assert.match(doc("web/order.ts"), /coDatQuaDoiTac:\s*coODatQuaDoiTac\(staff!\)/, "trang đơn bật ô cho đúng người (cổng của route nguoi-huong)");
});

test("bên đặt máy chủ ép đi từ /api/auth/me vào form, không suy ở giao diện", () => {
  assert.match(doc("web/shell.ts"), /benDatMayChuEp\s*=\s*me\.benDatCuaToi\s*\?\?\s*null/, "shell lấy trường benDatCuaToi của /me");
  assert.match(doc("web/shell.ts"), /export const benDatCuaToi\s*=/, "shell xuất hàm đọc");
});

test("trang đơn: khối \"Phần đối tác\" được gắn (id cố định), nạp sau mỗi lần vẽ lại, và nhãn bên đặt theo cờ của máy chủ", () => {
  const order = doc("web/order.ts");
  assert.match(order, /id:\s*"phan-doi-tac"/, "id #phan-doi-tac");
  assert.match(order, /coXemPhanDoiTac\(staff!,\s*order\)/, "chỉ gắn khối cho người có ô order.terms.view");
  assert.match(order, /initPhanDoiTac\(\s*phanDoiTac,/, "nạp khối");
  assert.match(order, /duocGhiTay\(staff!,\s*order\)/, "cờ ghi tay theo luật thuần");
  assert.match(order, /coXemNguoiBan\(staff!\)/, "cờ xem người bán theo luật thuần");
  assert.match(order, /nhanBenDat\(order\.bookerLaDoiTac\)/, "nhãn bên đặt theo cờ bookerLaDoiTac của DTO đơn");
  // initPhanDoiTac phải nằm SAU replaceChildren(root, …) của render (nếu đứng trước, khối vừa nạp bị vẽ đè): vị trí đầu tiên của lời gọi > vị trí replaceChildren(root…) đầu tiên trong render().
  const batDauRender = order.indexOf("function render(");
  assert.ok(batDauRender >= 0);
  assert.ok(order.indexOf("initPhanDoiTac(phanDoiTac", batDauRender) > order.indexOf("replaceChildren(\n    root,", batDauRender), "lời gọi initPhanDoiTac đứng sau replaceChildren(root…) của render()");
});

test("bảng \"Ghi mức tay\": id cố định, gọi đúng route, tách người xem hoa hồng với người xem người bán", () => {
  const khoi = doc("web/phan-doi-tac.ts");
  assert.match(khoi, /\.id\s*=\s*"ghi-tay-sheet"/, "id #ghi-tay-sheet");
  assert.match(khoi, /\/thuong-mai`/, "đọc GET …/thuong-mai");
  assert.match(khoi, /\/thuong-mai\/\$\{encodeURIComponent\(d\.serviceId\)\}`/, "ghi POST …/thuong-mai/:serviceId");
  assert.match(khoi, /v\.coGhiTay\s*&&\s*v\.xemNguoiBan/, "chỉ gọi /api/pricing/cung-ung khi vừa được ghi tay vừa có supply.terms.view");
  assert.match(khoi, /docThanGhiTay\(/, "thân gửi do luật thuần dựng (đã có bài nối với route)");
  assert.match(khoi, /status\s*===\s*404/, "404 ⇒ ẩn khối lặng lẽ");
});

// Task 14, nợ (e) (T11 M5): nhánh LỖI của khối «Phần đối tác» (chưa biết người xem là văn phòng hay Đối tác) dùng tiêu đề trung tính TIEU_DE_LOI, không phải «Phần đối tác». Tiêu đề khi CÓ dữ liệu không đổi.
test("khối \"Phần đối tác\": nhánh lỗi dùng tiêu đề trung tính; nhánh có dữ liệu giữ tiêu đề riêng của từng dạng", () => {
  const khoi = doc("web/phan-doi-tac.ts");
  const veLoi = /function veLoi\(message: string\): void \{([\s\S]*?)\n  \}\n/.exec(khoi)?.[1] ?? "";
  assert.ok(veLoi.length > 0, "tìm thấy hàm veLoi");
  assert.match(veLoi, /h\("h2", null, TIEU_DE_LOI\)/, "veLoi dùng TIEU_DE_LOI");
  assert.doesNotMatch(veLoi, /TIEU_DE_VAN_PHONG|TIEU_DE_DOI_TAC/, "veLoi không gán dạng nào cho người xem");
  assert.match(khoi, /h\("h2", null, TIEU_DE_VAN_PHONG\)/, "dạng văn phòng giữ tiêu đề cũ");
  assert.match(khoi, /h\("h2", null, TIEU_DE_DOI_TAC\)/, "dạng Đối tác giữ tiêu đề cũ");
});

// Task 14, nợ (d) (T11 M3): câu cạnh hồ sơ TỔ CHỨC trong ô tra SĐT chỉ trỏ tới ô «Đặt qua đối tác» khi form / bảng CÓ ô đó. Luật chữ ở `matchNote` (bài ở src/shared/booker.test.ts); bài này canh dây: cờ tới được khối tra.
test("ô tra hồ sơ khách nhận cờ «có ô Đặt qua đối tác» từ nơi gọi, không tự giả định", () => {
  const khoi = doc("web/booker-picker.ts");
  assert.match(khoi, /matchNote\(m,\s*coODat\)/, "khối tra truyền cờ cho matchNote");
  assert.match(khoi, /datCoODatQuaDoiTac\(co\)\s*\{\s*coODat\s*=\s*co;/, "khối tra có hàm đặt cờ sau khi dựng");
  assert.match(doc("web/booker-sheet.ts"), /createBookerPicker\(\{[^}]*coODatQuaDoiTac:\s*o\.coDatQuaDoiTac/, "bảng đổi khách: cờ lấy từ coDatQuaDoiTac của nơi gọi (coODatQuaDoiTac(staff))");
  assert.match(doc("web/order-form.ts"), /bookerPicker\.datCoODatQuaDoiTac\(\s*khoiBenDat\.kieu\s*===\s*"tra-sdt-va-dat-qua"\s*\)/, "form lập đơn: có ô đúng khi luật thuần xếp khối «tra-sdt-va-dat-qua»");
});
