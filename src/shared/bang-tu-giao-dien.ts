/**
 * Bảng từ giao diện (ADR-0130): nơi DUY NHẤT ghi các chữ đã loại khỏi chữ người dùng nhìn thấy, kèm chữ thay.
 * Bài `src/bang-tu-giao-dien.test.ts` quét chuỗi trong mã giao diện, trợ giúp, câu báo của máy chủ: chữ đã loại quay lại là `npm test` đỏ.
 * Thêm một dòng = chủ dự án đã chọn tên (đưa 2–3 tên cho chủ chọn, không tự đặt). Mã nội bộ (tên hàm, `data-action`, đường API, cột CSDL) KHÔNG đổi theo.
 */
export interface TuDaLoai {
  /** Chữ đã loại (biểu thức, có cờ `u`). */
  cam: RegExp;
  /** Chữ dùng thay. */
  thay: string;
  /** Chủ chọn ngày nào, ở đâu. */
  nguon: string;
}

export const TU_DA_LOAI: readonly TuDaLoai[] = [
  { cam: /[Ll]ần thu|LẦN THU/u, thay: "khoản thu (Ghi khoản thu · Sửa khoản thu đã ghi · Ghi bù khoản thu)", nguon: "chủ 2026-10-08 (BACKLOG §25), áp 2026-10-18" },
  { cam: /[Ll]ần hoàn/u, thay: "khoản hoàn tiền", nguon: "theo «khoản thu», 2026-10-18" },
  { cam: /[Ll]ệnh Thay|[Tt]hay lần/u, thay: "Sửa khoản thu đã ghi", nguon: "chủ 2026-10-08" },
  // «Đảo» theo nghĩa ghi dòng ngược để huỷ một khoản (bút toán đảo). Chữ «đảo» theo nghĩa hòn đảo (Tour Đảo, tour 4 đảo…) không bị chặn — xem NGHIA_HON_DAO.
  { cam: /[Đđ]ảo/u, thay: "Huỷ khoản thu · (đã huỷ) · Huỷ dòng (chi phí xe)", nguon: "chủ 2026-10-18 (hộp hỏi: «Huỷ khoản thu»)" },
  // «Đã giao» theo nghĩa trạng thái đơn dễ hiểu nhầm là đã giao vé. Mẫu hẹp theo đúng nghĩa đã đổi: «Đã giao đơn cho …» (giao đơn cho Hướng dẫn viên), «Đã giao vé», «vé đã giao» là nghĩa khác, giữ nguyên.
  { cam: /Đã giao(?! đơn cho| vé)|[Đđ]ơn (?:đã |chưa )giao(?!\p{L})/u, thay: "Đã thu đủ sau dịch vụ · chỗ chật: Xong và đủ tiền · nút: Xác nhận đã thu đủ sau dịch vụ", nguon: "chủ 2026-11-05 («chốt hướng», ghi ở đặc tả Trả sau ADR-0168)" },
  { cam: /(?<![\p{L}\p{N}_.\-/])[Aa]pp(?![\p{L}\p{N}_]| Store)/u, thay: "Nền tảng", nguon: "chủ 2026-10-02 («dùng từ Nền tảng thay cho App»)" },
  { cam: /Bỏ dấu(?! chọn)/u, thay: "Bỏ đánh dấu", nguon: "2026-10-18 («bỏ dấu» dễ hiểu là bỏ dấu thanh)" },
  { cam: /^Giữ đơn$/u, thay: "Không huỷ (nút trong hộp huỷ đơn)", nguon: "2026-10-18 (trùng chữ «Đang giữ đơn»)" },
  // Lượt 2 (hồ sơ docs/superpowers/specs/2026-10-18-ra-soat-ngon-ngu-luot-2.md): chủ tự bấm chọn cả bảy tên 18/10. Mẫu chặn hẹp theo ĐÚNG nghĩa đã đổi —
  // nghĩa khác giữ nguyên («mốc nhắc» giấy tờ, «mốc cập nhật», «phiên bản», «Đang giữ đơn», tiền công ty giữ của khách).
  { cam: /[Nn]gười nhận tiền|[Nn]gười thu(?! tiền)(?!\p{L})/u, thay: "Người thu tiền", nguon: "chủ 2026-10-18 (lượt 2)" },
  { cam: /[Gg]iữ hộ|[Nn]gười đang giữ tiền|đang giữ .{0,40}? của công ty/u, thay: "chưa nộp về công ty (Tiền chưa nộp về công ty)", nguon: "chủ 2026-10-18 (lượt 2)" },
  { cam: /[Cc]hặng|CHẶNG/u, thay: "lượt đưa đón (gọi tắt «lượt» khi đã rõ)", nguon: "chủ 2026-10-18 (lượt 2)" },
  { cam: /[Mm]ốc (?:tối thiểu|ra lệnh|6 giờ)|(?:[Dd]ưới|[Ss]át|[Qq]uá|trước) mốc(?! nhắc| cập nhật| giờ hẹn)/u, thay: "hạn chốt (Hạn chốt trước giờ đón · Sắp tới hạn chốt · Quá hạn chốt)", nguon: "chủ 2026-10-18 (lượt 2)" },
  { cam: /[Xx]uất bến|XUẤT BẾN/u, thay: "cho xe chạy / xe chạy", nguon: "chủ 2026-10-18 (lượt 2)" },
  // «vai» là CHỮ, không phải mã nội bộ (`VAI`, `muc-vai`, `/api/tro-ly/vai`, khoá `vai`, cột SQL `h.vai,`); «đổi vai» (nhập vai) trong lời dặn Trợ lý là nghĩa khác.
  // 2/11: «Vai người dùng» (tên thẻ chủ chọn 1/11, lượt 8 bên dưới) được phép — lookahead cuối thêm « người dùng»; «vai» đứng một mình vẫn bị cấm.
  { cam: /^(?!vai$)[\s\S]*(?<![\p{L}\p{N}_\-/.])(?<!đổi )[Vv]ai(?![\p{L}\p{M}\p{N}_\-,])(?! trò| người dùng)/u, thay: "vai trò", nguon: "chủ 2026-10-18 (lượt 2)" },
  { cam: /[Pp]hiên(?! bản)|PHIÊN(?! BẢN)/u, thay: "máy đang đăng nhập (Đăng xuất máy này)", nguon: "chủ 2026-10-18 (lượt 2)" },
  // Lượt 3 — hoa hồng (chủ 2026-10-25), hồ sơ docs/superpowers/specs/2026-10-25-hoa-hong-ho-tro-thiet-ke-lai/DAC-TA.md mục C. «Chính sách hoa hồng» thay «Mức TA»; «Mức riêng» thay «Dòng riêng»;
  // một họ từ hiệu lực (Ngừng · Áp dụng chính sách cho loại · Ngừng áp dụng · Đang/Sắp áp dụng · Đã ngừng) thay Đóng/Gắn/Kết thúc gắn (Q1 = A).
  // 30/10: «Áp dụng cấp cho loại» và «Ngừng áp dụng» (cấp của loại) đã đổi tiếp ở lượt 7 bên dưới; «Ngừng» (mức) và «Đang/Sắp áp dụng», «Đã ngừng» giữ.
  { cam: /[Mm]ức TA|MỨC TA/u, thay: "Cấp độ đại lý (cấp <tên>, cấp riêng)", nguon: "chủ 2026-10-25 (bàn giao Hoa hồng + Hỗ trợ, «chọn A cả ba»)" },
  { cam: /[Dd]òng riêng|(?<!hồng )[Rr]iêng của loại/u, thay: "Mức riêng", nguon: "chủ 2026-10-25 (bàn giao Hoa hồng + Hỗ trợ, «chọn A cả ba»)" },
  { cam: /Đóng mức|Đóng dòng|[Kk]ết thúc gắn|Gắn mức|Đang áp(?! dụng)|Sắp áp(?! dụng)|Đã đóng(?! sổ| tiền)/u, thay: "Ngừng · Chọn cấp cho vai trò này · Thôi theo cấp này · Đang áp dụng · Sắp áp dụng · Đã ngừng", nguon: "chủ 2026-10-25 (bàn giao Hoa hồng + Hỗ trợ, «chọn A cả ba»)" },
  // Lượt 4 — hỗ trợ (chủ 2026-10-25, bàn giao Hoa hồng + Hỗ trợ). Trùng tên «Hỗ trợ» (trang / Trợ lý / vé): BACKLOG BL-VE-TRUNG-TEN.
  { cam: /Hàng đợi nhóm/u, thay: "Việc của nhóm", nguon: "chủ 2026-10-25 (bàn giao Hoa hồng + Hỗ trợ)" },
  { cam: /[Tt]rợ giúp|TRỢ GIÚP/u, thay: "Hướng dẫn", nguon: "chủ 2026-10-25 (bàn giao Hoa hồng + Hỗ trợ)" },
  // Lượt 5 — Trang chủ (chủ 2026-10-28, hộp hỏi rà chữ Trang chủ). Khối và thẻ này đếm ĐƠN có ngày đi, không phải chuyến xe của Điều phối — mẫu chặn hẹp, «các chuyến hôm nay»
  // của tài xế (chuyến xe thật) giữ nguyên. «khai <ngày>» ở khối Chờ đối chiếu: mảnh chuỗi mẫu « · khai » đứng ngay trước ngày.
  { cam: /[Cc]huyến đón|Chuyến hôm nay|Không có chuyến nào (?:hôm nay|ngày mai|ngày kia)/u, thay: "Đơn đi (Đơn đi hôm nay · Không có đơn nào đi hôm nay)", nguon: "chủ 2026-10-28 (rà chữ Trang chủ)" },
  { cam: /·\s*khai\s*$/u, thay: "ghi ngày <ngày>", nguon: "chủ 2026-10-28 (rà chữ Trang chủ)" },
  // Dòng «Cần xem lại» của Quản trị ghi TÊN dịch vụ, không ghi mã trần sau «Sheet đã đổi giá» (mẫu chỉ bắt mảnh chữ đứng ngay trước `${…}`; nhãn bộ lọc
  // «Sheet đã đổi giá (cần xem)» ở Danh mục không dính).
  { cam: /Sheet đã đổi giá\s+$/u, thay: "Sheet đã đổi giá: <tên dịch vụ>", nguon: "chủ 2026-10-28 (hộp hỏi lượt 3 rà chữ Trang chủ)" },
  // Hoa hồng (chủ 2026-10-28): năm loại có từ đầu, đi kèm tài khoản đăng nhập của đối tác. Và mức TA gắn riêng cho một đối tác (ADR-0138) là «chính sách riêng»
  // theo lượt 3 — «mức riêng» chỉ dành cho một dòng mức đặt lẻ; ở Danh bạ chữ cũ còn gọi chính sách riêng là «Mức riêng: … (gắn riêng)».
  { cam: /[Ll]oại gốc/u, thay: "Có sẵn (kèm câu «Vai trò có sẵn đi kèm tài khoản đăng nhập của đối tác nên không tắt được.»)", nguon: "chủ 2026-10-28 (hộp hỏi, chọn «Có sẵn»)" },
  { cam: /\(gắn riêng\)|Lưu mức riêng|gắn mức riêng/u, thay: "cấp riêng", nguon: "chủ 2026-10-25 (lượt 3), áp ở Danh bạ 2026-10-28" },
  // Lượt 6 — cấp đại lý (chủ 2026-10-30, quyết định 3, 7). Hai mục toàn cục; luật cấm «chính sách» trọn bộ tệp hoa hồng nằm ở CAM_THEO_TEP bên dưới.
  { cam: /[Cc]hính sách hoa hồng|CHÍNH SÁCH HOA HỒNG/u, thay: "Cấp độ đại lý", nguon: "chủ 2026-10-30 (quyết định 3, 7; hồ sơ `docs/superpowers/specs/2026-10-30-hoa-hong-cap-dai-ly/`)" },
  { cam: /[Cc]hính sách riêng(?! tư)|CHÍNH SÁCH RIÊNG(?! TƯ)/u, thay: "Cấp riêng", nguon: "chủ 2026-10-30 (quyết định 3, 7; hồ sơ `docs/superpowers/specs/2026-10-30-hoa-hong-cap-dai-ly/`)" },
  // Lượt 7 — rà soát ngôn ngữ trang Hoa hồng đối tác (chủ 2026-10-30, hồ sơ docs/superpowers/specs/2026-10-30-ra-soat-ngon-ngu-hoa-hong/RA-SOAT.md): hai chữ của lượt 3 đã thay.
  // Nhãn nhật ký «Ngừng áp dụng cấp đại lý cho loại» / «… cấp riêng của đối tác» (audit-actions.ts), nút «Ngừng áp dụng» của cấp riêng ở Danh bạ và câu máy chủ «ngừng áp dụng cấp cũ trước» giữ nguyên — mẫu chặn hẹp: chỉ cụm «… cấp cho loại» và mảnh «Ngừng áp dụng cấp ‹tên›» (chuỗi mẫu cũ của hộp).
  // «Hoa hồng riêng của loại» (B3 của bảng chữ mới) được phép: luật «riêng của loại» ở lượt 3 nhắm câu «mức riêng của loại» trần, không phải tiêu đề này.
  { cam: /[Áá]p dụng cấp cho loại|[Nn]gừng áp dụng cấp(?:\s+cho loại|\s*«?\s*$)/u, thay: "Chọn cấp cho vai trò này · Gán cho vai trò · Thôi theo cấp này", nguon: "chủ 2026-10-30 (rà soát ngôn ngữ Hoa hồng)" },
  { cam: /Ngày cuối hiệu lực|Sửa áp dụng cấp/u, thay: "Ngày cuối áp dụng · Sửa cấp của vai trò", nguon: "chủ 2026-10-30 (rà soát ngôn ngữ Hoa hồng)" },
  // Lượt 8 — Đặt vé của đối tác (chủ 2026-11-01, đặc tả docs/superpowers/specs/2026-11-01-dat-ve-doi-tac-design.md §4.3; thay quyết định 3 ngày 30/10 «giữ Loại đối tác»).
  // Chữ trên màn là «Vai người dùng» (thẻ chứa các vai của hồ sơ) và «Cấp độ đại lý»; thẻ «Riêng từng đối tác» thành khối «Người có cấp riêng» trong thẻ vai. Mã nội bộ (`loai`, `hh-the-loai`, `prc_*`, route `/loai-doi-tac`) KHÔNG đổi.
  // Tên cấp là dữ liệu («Đại lý cấp 3») nên không dính mẫu «cấp đại lý».
  { cam: /[Ll]oại đối tác|LOẠI ĐỐI TÁC/u, thay: "Vai người dùng", nguon: "chủ 2026-11-01, đặc tả 2026-11-01-dat-ve-doi-tac §4.3 (thay quyết định 3 ngày 30/10)" },
  { cam: /[Cc]ấp đại lý|CẤP ĐẠI LÝ/u, thay: "Cấp độ đại lý", nguon: "chủ 2026-11-01, đặc tả 2026-11-01-dat-ve-doi-tac §4.3 (thay quyết định 3 ngày 30/10)" },
  { cam: /Riêng từng đối tác/u, thay: "Người có cấp riêng", nguon: "chủ 2026-11-01, đặc tả 2026-11-01-dat-ve-doi-tac §4.3 (thay quyết định 3 ngày 30/10)" },
  // Lượt 9 — chính sách chiết khấu bốn trục (ADR-0161 Đ2, chủ 2026-11-03): hộp nhập hoa hồng có hai ô «Tính bằng» (Phần trăm, Số tiền) và «Áp cho» (Mọi khách như nhau, Riêng từng loại khách); chữ «Cách tính» đã bỏ.
  { cam: /Cách tính/u, thay: "Tính bằng · Áp cho", nguon: "chủ 2026-11-03 (ADR-0161)" },
  // Lượt 10 — rà soát tên nút 4/11 (chủ 2026-11-04: «đồng ý với tất cả những đề xuất», ADR-0166; hồ sơ docs/superpowers/specs/2026-11-04-ra-soat-nut-bam/QUYET-DINH-CHU.md).
  // Tên mới bắt đầu bằng tên cũ («Bỏ ghi đè giá», «Còn vé, xác nhận đơn») nên mẫu chừa đuôi mới; «Đóng» và «Chờ xác nhận» còn nghĩa đúng ở chỗ khác nên
  // không cấm cả chữ (xem CAM_THEO_TEP bên dưới và ADR-0166 mục «Chưa thi công»). «Cứu hộ» đứng một mình còn là tên khối xếp khách nên chỉ cấm trong dấu [[…]] của Hướng dẫn.
  { cam: /Thêm vai trò vào cấp này/u, thay: "Gán cho vai trò · Gán cho đối tác", nguon: "chủ 2026-11-04 (ADR-0166 câu 1)" },
  { cam: /^Áp dụng cấp riêng$|^Lưu cấp riêng$/u, thay: "Chọn cấp riêng cho đối tác (nút mở) · Lưu (nút lưu trong hộp)", nguon: "chủ 2026-11-04 (ADR-0166 câu 1)" },
  { cam: /Bỏ ghi đè(?! giá)/u, thay: "Bỏ ghi đè giá", nguon: "chủ 2026-11-04 (ADR-0166 câu 2)" },
  { cam: /Chuẩn bị … vé để gửi|^Chuẩn bị $|vé để gửi(?! khách)|Đã chuẩn bị \d* ?vé/u, thay: "Mở N vé để gửi khách", nguon: "chủ 2026-11-04 (ADR-0166 câu 3)" },
  { cam: /Còn vé(?:(?!, xác nhận đơn))/u, thay: "Còn vé, xác nhận đơn", nguon: "chủ 2026-11-04 (ADR-0166 câu 4)" },
  { cam: /Lưu, chờ xác nhận|Xác nhận đơn để gửi khách/u, thay: "Lưu đơn (chưa xác nhận) · Ảnh gửi khách", nguon: "chủ 2026-11-04 (ADR-0166 câu 5)" },
  { cam: /Đòi được khách/u, thay: "Ghi khoản thu đòi được", nguon: "chủ 2026-11-04 (ADR-0166 câu 6)" },
  { cam: /\[\[Cứu hộ\]\]/u, thay: "Kết thúc gián đoạn (xe hỏng)", nguon: "chủ 2026-11-04 (ADR-0166 câu 7)" },
  { cam: /[Gg]ửi xác nhận/u, thay: "Gửi kiểm vé", nguon: "chủ 2026-11-04 (ADR-0166 câu 8)" },
  { cam: /Khách đã chuyển khoản/u, thay: "Ghi khoản thu này", nguon: "chủ 2026-11-04 (ADR-0166 câu 10)" },
  { cam: /Hẹn ngày kết thúc|Hẹn kết thúc|Đã hẹn kết thúc/u, thay: "Đặt ngày kết thúc", nguon: "chủ 2026-11-04 (ADR-0166 câu 11)" },
];

/** Chữ «đảo» là hòn đảo (tên công ty, tên tour) — gỡ khỏi chuỗi trước khi so với dòng «Đảo» ở trên. */
export const NGHIA_HON_DAO = /(?:[Tt]our|TOUR)(?: \d+)? (?:đảo|Đảo|ĐẢO)|\d+ đảo|các đảo|ra đảo/gu;

export interface CamTheoTep {
  /** Mẫu đường dẫn tệp (tương đối gốc dự án) chịu luật. */
  tep: readonly RegExp[];
  cam: RegExp;
  thay: string;
  nguon: string;
}

// Bộ tệp lấy TRỌN TỆP, không cắt theo đoạn: nếu sau này `audit-actions.ts`, `web/parties.ts` hay `huong-dan-ke-toan.ts` có thêm một chuỗi «chính sách»
// không thuộc hoa hồng mà không có «riêng tư», «điều phối» hay «đăng nhập» theo sau (ví dụ «chính sách huỷ»), bài sẽ đỏ; khi đó người làm nới luật
// có chủ đích (thêm lookahead hoặc mục cho phép), không xoá luật.
export const CAM_THEO_TEP: readonly CamTheoTep[] = [
  {
    tep: [
      /^web\/hoa-hong[^/]*\.ts$/,
      /^web\/parties\.ts$/,
      /^src\/shared\/(?:hoa-hong-hien-thi|audit-actions|huong-dan-ke-toan|so-dai-ly-nhap)\.ts$/,
      /^src\/modules\/pricing\/(?![^/]*\.test\.ts$)[^/]+\.ts$/,
    ],
    cam: /[Cc]hính sách(?! (?:riêng tư|điều phối|đăng nhập))|CHÍNH SÁCH(?! (?:RIÊNG TƯ|ĐIỀU PHỐI|ĐĂNG NHẬP))/u,
    thay: "cấp độ đại lý · cấp · cấp riêng (quyết định 3)",
    nguon: "chủ 2026-10-30 (quyết định 3, 8; hồ sơ `docs/superpowers/specs/2026-10-30-hoa-hong-cap-dai-ly/`, §6.2)",
  },
  // «loại» nói tắt ở trang Hoa hồng chính là «vai» (thẻ «Vai người dùng»): «Thêm loại», «Tắt loại», «Tìm loại hoặc dịch vụ», «Chọn cấp cho loại này». «loại khách» (người lớn, trẻ em) là nghĩa khác, giữ nguyên.
  // Lượt 10 (ADR-0166 câu 9, 12): «Đóng» còn nghĩa gập khung ở web/parties.ts và web/dieu-kien-xuat-ben.ts nên chỉ cấm các CỤM đã đổi; hai nút ở Người bán và Dịch vụ & giá
  // chỉ có một nghĩa nên cấm cả chữ trơn (Ẩn / Hiện lại / Đã ẩn ở Dịch vụ & giá: nút «Ẩn» mới của Toàn quyền, ADR-0164, nằm ở tệp khác).
  {
    tep: [/^web\/nguoi-ban\.ts$/, /^web\/dieu-kien-xuat-ben\.ts$/, /^src\/shared\/audit-actions\.ts$/],
    cam: /Đóng điều khoản|Vẫn đóng|Đóng điều kiện|Đã đóng điều/u,
    thay: "Ngừng điều khoản · Ngừng điều kiện · Vẫn ngừng",
    nguon: "chủ 2026-11-04 (ADR-0166 câu 9)",
  },
  { tep: [/^web\/nguoi-ban\.ts$/], cam: /^Đóng$/u, thay: "Ngừng điều khoản", nguon: "chủ 2026-11-04 (ADR-0166 câu 9)" },
  {
    tep: [/^web\/catalog\.ts$/, /^src\/shared\/audit-actions\.ts$/],
    cam: /^Ẩn$|^Hiện lại$|Đã ẩn|Ẩn dịch vụ|Hiện lại dịch vụ/u,
    thay: "Ngừng bán · Mở bán lại · Đã ngừng bán",
    nguon: "chủ 2026-11-04 (ADR-0166 câu 12)",
  },
  {
    tep: [/^web\/hoa-hong[^/]*\.ts$/, /^src\/shared\/hoa-hong-hien-thi\.ts$/, /^src\/modules\/pricing\/index\.ts$/],
    cam: /(?<![\p{L}\p{N}_])[Ll]oại(?! khách)(?![\p{L}\p{N}_])/u,
    thay: "vai trò",
    nguon: "chủ 2026-11-01, đặc tả 2026-11-01-dat-ve-doi-tac §4.3 (thay quyết định 3 ngày 30/10)",
  },
];

/** Ngoại lệ có tên (quyết định 8: chi tiết nhật ký giữ khuôn cũ): theo tệp và mảnh chuỗi nguyên văn, không theo số dòng; `soLan` là số lần đúng. */
export const CHO_PHEP_THEO_TEP: readonly { tep: string; manh: string; soLan: number; ly_do: string }[] = [
  { tep: "src/modules/pricing/index.ts", manh: "chính sách ", soLan: 2, ly_do: "chi tiết nhật ký tenDoiTuongNhatKy và prc_commission_rule_added (quyết định 8)" },
];
