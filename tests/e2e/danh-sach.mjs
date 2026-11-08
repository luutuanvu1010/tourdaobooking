// MỘT nguồn danh sách kịch bản e2e (ADR-0179 Đ1.3): tests/e2e/run.mjs (chạy) và scripts/kiem-phan.mjs (chia phần trên GitHub, máy kiểm "hợp các phần =
// toàn bộ") cùng đọc ở đây. Tệp KHÔNG có tác dụng phụ (không dựng D1, không bật máy chủ) để nhập được từ bài kiểm. Tệp điều khiển việc kiểm (Đ2.3).

// "feedback" đứng TRƯỚC "maintenance": cổng bảo trì của router chặn mọi route cần đăng nhập, nên kịch bản Góp ý không được chạy khi chế độ bảo trì còn đang bật dở.
// "bangtin" (ADR-0022) đứng SAU "company", TRƯỚC "maintenance": tự bật/tắt bảo trì ở ca 10 và khôi phục ở `finally`, không đụng salesB/field mà "passkey" đổi.
// "thongbao" (ADR-0034) đứng SAU "bangtin", TRƯỚC "maintenance": chỉ đọc hộp thông báo (không tự bật/tắt bảo trì); cổng bảo trì của router
// chặn mọi route cần đăng nhập nên phải chạy trước khi "maintenance" bật dở.
// "roles" (ADR-0018) đứng TRƯỚC "passkey": đổi vai của tài khoản superAdmin (quyền giữ nguyên) và tạo tài khoản mới — không đụng salesB/field của passkey.
// "van-chuyen" (ADR-0040) đứng SAU "roles", TRƯỚC "passkey": tạo tài khoản tài xế + hồ sơ + xe dùng một lần (SĐT ngẫu nhiên, biển số theo Date.now()), đổi ngưỡng
// "sắp hết hạn" rồi khôi phục 30 ở `finally`; không đụng salesB/field của passkey.
// "tai-xe-doi-tac" (ADR-0048) đứng SAU "van-chuyen", TRƯỚC "passkey": tạo tài khoản / hồ sơ / nhà xe / xe dùng một lần (SĐT ngẫu nhiên, biển số theo Date.now()),
// gửi hai tin thông báo KHÔNG quan trọng rồi thu hồi ở `finally`; chèn SQL thử trigger chỉ vào tài khoản của chính kịch bản (SQL vào salesA luôn bị chặn — không đổi gì).
// "chinh-sach-dieu-phoi" (ADR-0049 lát 1.1) đứng SAU "tai-xe-doi-tac", TRƯỚC "passkey": đổi chính sách điều phối / hạng bằng / điều kiện xuất bến (bảng CHỈ THÊM)
// rồi ở `finally` THÊM dòng khôi phục giá trị gieo và đóng điều kiện đã thêm; không đụng salesB/field của passkey.
// "dieu-phoi", "tai-xe-cuoc" (ADR-0049 Task A13 / A15) đứng SAU "chinh-sach-dieu-phoi" (chính sách, điều kiện gieo đã khôi phục), TRƯỚC "passkey": tạo tài khoản
// tài xế / xe / đơn / chuyến dùng một lần (SĐT ngẫu nhiên, biển số theo Date.now()), chuyến chạy NGÀY MAI (cửa sổ xuất bến 48 giờ — ADR-0096); không đụng salesB/field của passkey.
// "tu-choi-bao-ban" (ADR-0053 D7–D9, A4) đứng SAU "tin-chuyen", TRƯỚC "xe-tren-don": tài khoản / nhà xe / xe / chuyến dùng một lần (SĐT ngẫu nhiên, biển số theo Date.now(), chuyến D+2…D+4 và một chuyến +1 giờ cho ca quá hạn); không đổi chính sách, không đụng salesB/field.
// "cho-chay-thieu-giay" (ADR-0184 việc 3) ngay sau "dieu-phoi", cùng khuôn: tài xế / xe thiếu Bảo hiểm / đơn / chuyến dùng một lần, chuyến NGÀY MAI; dọn bằng kết thúc gián đoạn;
// không đổi chính sách, salesB/field.
// "khung-ban-xe" (ADR-0055 VK2-A, Vận chuyển Đợt 3) ngay sau "dieu-phoi", cùng khuôn: tài xế / xe / chuyến dùng một lần (D+3…D+5); rút mọi khung bận của xe thử
// ở `finally`; chuyến của tài xế thử nằm trên xe thử nên không chạm kịch bản khác.
// "cam-ket-xe" (ADR-0056 VK3-A, Vận chuyển Đợt 7) ngay sau "khung-ban-xe", cùng khuôn: Đối tác / tài xế / xe / đơn / chuyến dùng một lần, chuyến NGÀY MAI; không đụng salesB/field.
// "dieu-chinh-khan-cap" (ADR-0104 Đ1) ngay sau "cam-ket-xe", cùng khuôn: tài xế / hai xe / chuyến dùng một lần (không đơn) — một chuyến sau 2 giờ (dưới mốc), hai chuyến
// sau 2 ngày; không đụng chính sách, salesB/field.
// "dong-bo-chuyen" (ADR-0104 Đ2) ngay sau "dieu-chinh-khan-cap", cùng khuôn: tài xế / xe / hai đơn / chuyến dùng một lần, chuyến NGÀY MAI; dùng field làm HDV phụ
// trách (chỉ sửa số khách đơn của chính kịch bản — không đổi PIN / quyền).
// "dua-don-dau-cuoi" (kế hoạch giao diện Đưa đón 2026-10-01, tiêu chí 5) ngay sau "dieu-phoi", cùng khuôn: tài xế / xe / đơn / chuyến dùng một lần, chuyến NGÀY MAI.
// "xe-tren-don" (ADR-0059) ngay sau "tai-xe-cuoc", cùng khuôn: tài xế / xe / đơn / chuyến / tài khoản lai dùng một lần, chuyến NGÀY MAI; không đụng salesB/field.
// "xe-dang-chay" (ADR-0052 D5 — Vận chuyển Đợt 5) ngay sau "xe-tren-don", cùng khuôn: tài xế / xe / đơn / chuyến dùng một lần, chuyến NGÀY MAI (xuất bến sớm);
// dọn bằng kết thúc gián đoạn; không đụng salesB/field.
// "chuyen-khach" (gói A5 — ADR-0111) ngay sau "xe-dang-chay", cùng khuôn: tài xế / xe / đơn / chuyến dùng một lần, chuyến NGÀY MAI (xuất bến sớm). Đổi chính sách
// điều phối (chờ 1 phút, tắt tự đồng ý) rồi KHÔI PHỤC (10 phút, bật) ở `finally`; có một lần chờ thật ~1 phút (hết hạn đề nghị); không đụng salesB/field.
// "dieu-phoi-chay-dua" (TC-33, Task A14) sau đó: 10 yêu cầu xếp song song vào chuyến 3 chỗ trên dữ liệu dùng một lần (chạy riêng: npm run test:e2e -- dieu-phoi-chay-dua).
// "coc-don-huy" (ADR-0089, năm lỗi tiền Đợt 1) đứng ngay sau "so-tien", TRƯỚC "passkey": dùng salesA/admin/kế toán/superAdmin/field, tự cài/gỡ trigger thử.
// "qr-thanh-toan" (ADR-0108 + ADR-0092 Đ6) đứng ngay sau "coc-don-huy", TRƯỚC "chong-ghi-trung" và "passkey": dùng superAdmin/salesA/salesB/admin/kế toán/field/fieldB (không đổi tài khoản dùng chung);
// cài một tài khoản nhận tiền cho công ty chủ (bảng chỉ-thêm: dòng cũ đóng, không xoá được — không đổi công ty chủ) và lập đơn dùng một lần; mã giao dịch theo Date.now() nên chạy lại không va chạm.
// "so-tien" (sổ tiền lượt 1 — ADR-0024/0025/0026) đứng TRƯỚC "passkey": dùng field/fieldB/salesA/kế toán; tự cài/gỡ trigger thử trên D1 tạm
// (ca R1, F6) — gỡ ở `finally`.
// "giao-dien" (ADR-0087) đứng SAU "tro-ly", TRƯỚC "maintenance": tự bật/tắt bảo trì ở ca 7 và khôi phục ở `finally`; cổng bảo trì chặn mọi route cần đăng nhập nên không được chạy khi bảo trì còn bật dở.
// "tro-ly" (ADR-0066) đứng SAU "thongbao", TRƯỚC "maintenance" (cổng bảo trì chặn mọi route cần đăng nhập): dựng máy OpenAI GIẢ trên cổng E2E_OPENAI_PORT
// (máy chủ trỏ vào nó bằng --var OPENAI_BASE_URL dưới đây); đổi cài đặt trợ lý rồi KHÔI PHỤC (bật, 5 USD, 30 câu) ở `finally`; tạo tài khoản dùng một lần.
// "chinh-sach-phien" (ADR-0085) đứng TRƯỚC "phien": đổi chính sách toàn hệ thống rồi KHÔI PHỤC ở finally; tài khoản thử dùng một lần + 1000 tài khoản Đối tác giả (hồ sơ đầy đủ).
// "phien" (ADR-0075 Task 4) đứng TRƯỚC "passkey": đăng nhập lại salesA nhiều lần (luật một máy đá cookie cũ) rồi `sessionMoi` để lại phiên sống; không đổi PIN/quyền của ai.
// "mau-chang" (nợ nhỏ đưa đón 2026-10-01) ngay sau "catalog", TRƯỚC "maintenance": mã dịch vụ riêng ZMC1 + một điểm đã ngưng dùng một lần; bảng mẫu chỉ-thêm.
// "so-dai-ly" (sổ đại lý đợt 1 — ADR-0077, ADR-0078 B1) ngay sau "qr-thanh-toan": hồ sơ đại lý dùng một lần (tên theo Date.now()), thêm mức theo vai TRAVEL_AGENCY rồi ĐÓNG nó
// (bảng chỉ-thêm), thêm mức riêng cho đại lý của chính nó; KHÔNG đóng dòng điều khoản gieo sẵn `prc-st-goc-all`, KHÔNG đổi công ty chủ; dùng accountant/admin/hr/salesA/field (hr chỉ tạo hai tài khoản Đối tác dùng một lần).
// "loai-doi-tac" (ADR-0117 lần 1) ngay sau "so-dai-ly": thêm MỘT loại đối tác dùng một lần (tên theo Date.now(), chỉ chữ) + hai hồ sơ tổ chức + hai đơn; mức theo mã loại mới (không đụng
// mức của vai có sẵn), tắt rồi bật lại loại của chính nó; KHÔNG đổi công ty chủ, KHÔNG đụng tài khoản của `passkey`; dùng accountant/admin/salesA/field.
// "luat-ban" (ADR-0146, ADR-0152; kế hoạch 2026-10-30 T14) ngay sau "loai-doi-tac" (kế hoạch ghi «sau catalog», nhưng loai-doi-tac đếm «chỉ năm loại có sẵn, đều đang dùng» lúc
// đầu nên phải chạy TRƯỚC — luat-ban thêm rồi TẮT một loại dùng một lần): một loại, một đặc điểm (tắt ở cuối), hai nhóm, mã dịch vụ riêng ZLB1…ZLB5, tài khoản Đối tác (Cộng tác viên) tạo qua route;
// mọi luật kết thúc, cờ «cần xác nhận» trả về, yêu cầu mở được rút ở cuối; KHÔNG đổi công ty chủ; dùng salesA/admin/superAdmin/accountant.
// "muc-ta" (ADR-0117 lần 2) ngay sau "loai-doi-tac" (loai-doi-tac đếm «chỉ năm loại có sẵn» lúc đầu nên phải chạy TRƯỚC): hai loại + hai mức TA + hai hồ sơ tổ chức dùng một lần (tên theo
// Date.now(), chỉ chữ), hai đơn; KHÔNG gắn mức cho vai có sẵn, KHÔNG đổi công ty chủ, KHÔNG đụng tài khoản của `passkey`; dùng accountant/admin/salesA/field.
// "sua-muc" (ADR-0148 Đ1, nút «Sửa») ngay sau "muc-ta": hai loại + hai chính sách + hai hồ sơ tổ chức dùng một lần (tên theo Date.now(), chỉ chữ), một đơn, một tài khoản Đối tác
// gieo SQL; chỉ mức theo loại MỚI của chính nó — KHÔNG mức theo vai có sẵn, KHÔNG đổi công ty chủ, KHÔNG đụng tài khoản của `passkey`; dùng accountant/admin/salesA.
// "so-dai-ly-dot-2" (sổ đại lý đợt 2 — ADR-0079, ADR-0132; Task 13) ngay sau "muc-ta", TRƯỚC "khoa-thang" và "passkey": hồ sơ / tài khoản Đối tác dùng một lần (tên theo Date.now()),
// chỉ mức riêng (DOI_TAC) cho hồ sơ của chính nó — KHÔNG mức theo vai, KHÔNG loại đối tác, KHÔNG điều khoản ALL; mã dịch vụ riêng ZSD2T / ZSD2I; tự chạy audit-invariants --strict ở cuối.
// "dieu-chinh-duyet", "phan-dinh" (ADR-0115 đợt 1) ngay sau "so-tien": đơn dùng một lần, không khoá tháng, không đổi công ty chủ; dùng accountant/admin/superAdmin/field/salesA.
// "ve-dien-tu" (ADR-0153) ngay sau "sua-so-khach", TRƯỚC "khoa-thang" và "passkey": mã dịch vụ riêng ZVD1, lô vé riêng, đơn dùng một lần (huỷ ở cuối); dùng salesA/kế toán; KHÔNG ghi tiền, KHÔNG đổi công ty chủ.
// "tach-nhiem-vu" (ADR-0187 Đ3 mức (a)) ngay sau "ve-dien-tu", TRƯỚC "khoa-thang": tài khoản lai SALES + ACCOUNTING gieo SQL dùng một lần; đơn ngày đi hôm nay + 43; chỉ đánh dấu nhập kế toán và soát, KHÔNG ghi tiền thật, KHÔNG khoá tháng.
// "khoa-thang" (ADR-0080 D1; đặc tả sổ đại lý đợt 1 §12 mục 11c) đứng CUỐI, ngay trước "passkey": khoá tháng 2025-01 và 2025-02 — KHÔNG mở lại được, nên không kịch bản nào được
// ghi tiền vào năm 2025, và mọi kịch bản ghi tiền của nhóm phải chạy TRƯỚC nó.
// "hai-lop" (ADR-0074, Phần B Task 4) ngay trước "passkey": tài khoản Bán hàng dùng một lần (SĐT ngẫu nhiên) có yếu tố TOTP gieo bằng SQL (khoá E2E_MFA_KEY dưới);
// tự bật chế độ bảo trì rồi KHÔI PHỤC ở `finally`; khoá mfa:<id> của chính tài khoản đó 15 phút (ca 429 cuối kịch bản) — không đụng tài khoản dùng chung.
// "hai-lop-email" (ADR-0074 điều 4, Phần C Task 2) ngay sau "hai-lop", trước "passkey": hai tài khoản Bán hàng dùng một lần, yếu tố EMAIL / TOTP gieo bằng SQL,
// mã email gieo bằng SQL (gieoMaEmail — e2e không đọc được hộp thư); không có người gửi nên gửi mã luôn 502; khoá mfa-mail:<id> của tài khoản thử 15 phút.
// "ho-so-tep" (ADR-0123) ngay sau "ho-so-rieng-tu": hồ sơ / ảnh dùng một lần (CCCD theo Date.now()), kho R2 MÔ PHỎNG của wrangler dev trong thư mục --persist-to của nhóm; không đụng salesB/field.
// "tu-khai" (ADR-0124) ngay sau "ho-so-tep": tự khai — tài khoản Đối tác / Tài xế đối tác dùng một lần; đăng một phiên bản chính sách THỬ mỗi lần chạy.
// "xac-minh" (ADR-0125, lát H-4) ngay sau "tu-khai": Đối tác A (SQL) và B (Nhân sự tạo) dùng một lần, một phiên bản chính sách THỬ mỗi lần chạy; Quản trị đặt lại PIN của A (A dùng một lần); dùng hr/admin/superAdmin.
// "xoa-an-danh" (ADR-0126, lát H-5) ngay sau "xac-minh": Đối tác A (ẩn danh hoá — cửa MỘT CHIỀU, chỉ trên D1 tạm) và C dùng một lần; đăng chính sách THỬ (cuối cùng đăng lại bản không số ngày); dùng admin/superAdmin.
// "ban-hang-phu-trach" (ADR-0142, Task 5) ngay sau "xac-nhan-don" (cùng mã danh mục giả ZXN1 / ZXN2: xac-nhan-don trả cờ về trước khi nó chạy): bốn tài khoản dùng một lần (Bán hàng Y / X2 / X3, lai, Đối tác),
// một mã dịch vụ có cờ trả về ở cuối; thêm hai dòng chính sách giờ hành chính rồi trả về giá trị cũ (bảng chỉ-thêm); đơn thử dùng một lần; KHÔNG đổi công ty chủ; dùng salesA/salesB/admin/accountant/field/superAdmin.
// "passkey" đứng CUỐI CÙNG: đổi PIN của salesB, tạm ngưng rồi kích hoạt lại field — mọi kịch bản CÙNG NHÓM dùng chung một D1 tạm (passkey luôn cuối nhóm của nó).
export const ALL = ["platform", "pwa", "orders", "nhap-rieng-tu", "trip", "chang-hanh-khach", "chon-don", "xac-nhan-don", "ban-hang-phu-trach", "gui-don", "dat-coc", "nhap-tay-va-gia-doi-tac", "admin", "turnstile", "catalog", "mau-chang", "dispatch", "han-muc-tu-choi", "admin-race", "locations", "dua-don-theo-nhom", "parties", "gop-ho-so", "ho-so-rieng-tu", "ho-so-tep", "tu-khai", "xac-minh", "xoa-an-danh", "booker", "permissions", "feedback", "ve-ho-tro-tep", "company", "bangtin", "thongbao", "tro-ly", "giao-dien", "maintenance", "roles", "xem-nhu-vai", "quyen-tien", "van-chuyen", "tai-xe-doi-tac", "chinh-sach-dieu-phoi", "dieu-phoi", "cho-chay-thieu-giay", "khung-ban-xe", "cam-ket-xe", "dieu-chinh-khan-cap", "dong-bo-chuyen", "tien-xe-thue", "dua-don-dau-cuoi", "tai-xe-cuoc", "tin-chuyen", "tu-choi-bao-ban", "xe-tren-don", "xe-dang-chay", "chuyen-khach", "dieu-phoi-chay-dua", "so-tien", "dieu-chinh-duyet", "phan-dinh", "coc-don-huy", "qr-thanh-toan", "so-dai-ly", "loai-doi-tac", "luat-ban", "muc-ta", "sua-muc", "so-dai-ly-dot-2", "chong-ghi-trung", "nhap-ke-toan", "chinh-sach-phien", "phien", "sua-so-khach", "ve-dien-tu", "tach-nhiem-vu", "khoa-thang", "tra-sau", "hai-lop", "hai-lop-email", "passkey"];

// Thời gian từng kịch bản (giây) — chỉ để CHIA cho cân, không phải cổng. Nguồn: tests/e2e/thoi-gian.json (giây THẬT đo trên máy GitHub, lượt kiểm ghi lại
// ở tệp kết quả gom — ADR-0179 Đ1.4); kịch bản chưa có số: 15. Sai số chỉ làm phần lệch nhau (chậm hơn), không làm bỏ sót kịch bản nào.
import THOI_GIAN from "./thoi-gian.json" with { type: "json" };
export { THOI_GIAN };
export const nang = (name) => THOI_GIAN[name] ?? 15;

/** Chia kịch bản vào `n` nhóm: nặng trước, vào nhóm đang nhẹ nhất (LPT); rồi trả mỗi nhóm về đúng thứ tự của `ALL`. Tất định (không ngẫu nhiên). */
export function chiaNhom(list, n) {
  const nhom = Array.from({ length: n }, () => ({ tong: 0, ten: [] }));
  const theoNang = [...list].sort((a, b) => nang(b) - nang(a) || ALL.indexOf(a) - ALL.indexOf(b));
  for (const name of theoNang) {
    const nhe = nhom.reduce((m, g) => (g.tong < m.tong ? g : m));
    nhe.tong += nang(name);
    nhe.ten.push(name);
  }
  return nhom.map((g) => g.ten.sort((a, b) => ALL.indexOf(a) - ALL.indexOf(b)));
}

// Bật `wrangler dev` (tests/e2e/run.mjs): `freePort()` hỏi một cổng trống rồi TRẢ LẠI trước khi wrangler mở nó — trong khoảng hở đó tiến trình khác có thể
// chiếm mất (lượt kiểm 42180826984 trên GitHub, 6/11: workerd "bind(): Address already in use", phần e2e chết sau 69 giây). Chỉ ĐÚNG lỗi này mới thử lại,
// với bộ cổng mới, tối đa SO_LAN_BAT_TOI_DA lần; lỗi khác (mã hỏng, cấu hình sai) vẫn dừng ngay.
export const SO_LAN_BAT_TOI_DA = 3;
export const laLoiTrungCong = (log) => /Address already in use|EADDRINUSE/i.test(String(log ?? ""));
