// ADR-0166 (đổi 12 tên nút sau rà soát 4/11): nối dây của bốn chỗ đổi cách chạy ở phía trình duyệt — đây là QUÉT MÃ NGUỒN (như src/form-dat-ve-noi-day.test.ts),
// không chạy giao diện. Hành vi thật do kịch bản Chrome (hoa-hong-smoke, xac-nhan-smoke) và bài máy chủ `src/modules/catalog/bo-ghi-de-gia-route.test.ts` canh.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { CAU_CHI_DAT_MOT_LAN } from "./shared/luat-ban-hien-thi.ts";
import { HOI_CON_VE, NHAN_KET_QUA } from "./shared/xac-nhan-hien-thi.ts";

const doc = (tep: string): string => readFileSync(fileURLToPath(new URL(`../${tep}`, import.meta.url)), "utf8");

test("câu 1: trang chi tiết cấp có hai nút; «Gán cho đối tác» mở hộp cấp riêng với cấp đang xem chọn sẵn", () => {
  const cap = doc("web/hoa-hong-cap.ts");
  assert.match(cap, /"Gán cho vai trò"\);\s*\n\s*ad\.addEventListener\("click", \(\) => mo\.apDungChinhSach\(m\)\)/, "nút «Gán cho vai trò» chạy như nút cũ");
  assert.match(cap, /"Gán cho đối tác"\);\s*\n\s*gd\.addEventListener\("click", \(\) => mo\.datCapRieng\(undefined, m\.code\)\)/, "«Gán cho đối tác» không chọn sẵn đối tác (hộp vẫn bắt chọn) mà chọn sẵn cấp");
  assert.match(cap, /nut\.append\(ad, gd, them\)/);
  const hop = doc("web/hoa-hong-hop.ts");
  assert.match(hop, /function datCapRieng\(dien\?: \{ partyId: string; ten: string \}, capSan\?: string\)/);
  assert.match(hop, /oCapMo\("hh-dcr-muc", capSan \?\? ""\)/, "ô cấp của hộp chọn sẵn cấp truyền vào");
  assert.doesNotMatch(cap, /Thêm vai trò vào cấp này/);
});

test("câu 1: ba nơi đặt cấp riêng dùng chung tên «Chọn cấp riêng cho đối tác»", () => {
  assert.match(doc("src/shared/cap-hien-hanh-hien-thi.ts"), /chonCapRieng: "Chọn cấp riêng cho đối tác"/);
  assert.match(doc("web/hoa-hong-hop.ts"), /title: "Chọn cấp riêng cho đối tác"/);
  assert.match(doc("web/parties.ts"), /button\("Chọn cấp riêng cho đối tác", \(\) => void moGan\(\)/);
  assert.match(doc("web/cot-cap-dai-ly.ts"), /title: `\$\{CHU_CAP\.chonCapRieng\}: \$\{dong\.fullName\}`/);
});

test("câu 4: hộp hỏi lại nói đủ năm hậu quả; bấm «Còn vé, xác nhận đơn» phải qua hộp TRƯỚC khi gọi máy chủ", () => {
  assert.equal(NHAN_KET_QUA.CON_VE, "Còn vé, xác nhận đơn");
  const chu = HOI_CON_VE.hauQua;
  for (const y of [/không hoàn tác/, /[Gg]iá .*khoá/, /hoa hồng .*chụp/, /vé được cấp/, /tiền cọc .*khoản thu/]) assert.match(chu, y);
  const ui = doc("web/xac-nhan-don-ui.ts");
  const hoi = ui.indexOf("if (!(await hoiXacNhan({ ...HOI_CON_VE, opener: nutConVe }))) return;");
  const gui = ui.indexOf("await guiQuyet(than,");
  assert.ok(hoi > 0 && gui > hoi, "hộp hỏi đứng trước lời gọi máy chủ; huỷ hộp thì return, không gọi gì");
});

test("câu 3: cả hai nút làm lộ vé (Mở vé / Tạo đường dẫn) kèm câu báo vé không về kho", () => {
  const ve = doc("web/ve-don.ts");
  assert.match(ve, /`Mở \$\{res\.veXem\.length\} vé để gửi khách`/);
  assert.equal(ve.match(/CAU_VE_KHONG_VE_KHO\)/g)?.length, 2, "câu báo đứng cạnh cả hai nút");
  assert.match(ve, /sẽ không quay về kho nữa, kể cả khi khách huỷ/);
});

test("câu 11: hộp «Đặt ngày kết thúc» nói chỉ đặt được một lần", () => {
  assert.match(CAU_CHI_DAT_MOT_LAN, /một lần/);
  const lb = doc("web/luat-ban.ts");
  assert.match(lb, /title: "Đặt ngày kết thúc"/);
  assert.match(lb, /CAU_CHI_DAT_MOT_LAN/);
});

test("câu 5: cờ «đang chờ xác nhận» đi từ danh sách tới thẻ đơn và từ yêu cầu mở tới huy hiệu trang đơn (quét mã nguồn, không chạy giao diện)", () => {
  // Danh sách: thẻ được dựng từ trường của OrderSummaryDto — phải chép cờ sang dữ liệu thẻ, và thẻ phải đưa cờ vào hàm nhãn chung.
  assert.match(doc("web/orders.ts"), /\.\.\.\(o\.dangChoXacNhan \? \{ dangChoXacNhan: true as const \} : \{\}\)/, "danh sách chép cờ sang thẻ");
  assert.match(doc("web/order-card.ts"), /dangChoXacNhan\?: true;/, "dữ liệu thẻ có trường cờ");
  assert.match(doc("web/order-card.ts"), /const tt = trangThaiHienThi\(o\);/, "thẻ đưa cả dữ liệu (kèm cờ) vào hàm nhãn chung, không tự chép nhãn");
  // Trang chi tiết: cờ = có yêu cầu xác nhận đang mở (cùng nguồn với dải «Chờ xác nhận · còn N phút»).
  assert.match(doc("web/order.ts"), /trangThaiHienThi\(\{ \.\.\.order, dangChoXacNhan: xacNhan\?\.yeuCau != null \}\)/, "huy hiệu trang đơn lấy cờ từ yêu cầu mở");
  // Máy chủ: cờ điền trong toSummaryDtos từ câu SQL tĩnh ở xac-nhan-repo.
  assert.match(doc("src/modules/orders/repository.ts"), /dangCho\.has\(d\.id\) \? \{ dangChoXacNhan: true as const \}/, "máy chủ chỉ gắn cờ khi đúng");
  // Chữ khách đọc không đi theo nhãn nội bộ.
  assert.match(doc("src/modules/receipt/rules.ts"), /completedAt: order\.completedAt, dangChoXacNhan: true \}/, "biên nhận / ảnh gửi khách giữ «Chờ xác nhận» cho đơn nháp");
});
