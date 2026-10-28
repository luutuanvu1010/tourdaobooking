// Nhật ký thay đổi của ứng dụng (đặc tả docs/superpowers/specs/2026-09-23-nhat-ky-thay-doi-tro-giup-design.md). Thuần, không I/O.
// NGUỒN DUY NHẤT của số phiên bản: app-info.ts dẫn xuất APP_VERSION/APP_RELEASE_DATE từ mục đầu. Mỗi lần deploy mã mới = thêm MỘT mục vào ĐẦU mảng,
// số tăng 1 (1.N), lời thường cho nhân viên (công thức "Ghi nhật ký thay đổi" ở docs/CHANGE-GUIDE.md). changelog.test.ts chặn cách viết sai.
import { compareVersions, hasUnseenRelease, parseVersion } from "./phien-ban.ts";
import { isISODate } from "./vn-date.ts";

export type ChangeKind = "moi" | "sua" | "doi";
export const CHANGE_KIND_LABEL: Record<ChangeKind, string> = { moi: "Mới", sua: "Đã sửa", doi: "Thay đổi" };
export interface ChangeItem { readonly kind: ChangeKind; readonly text: string }
export interface ReleaseNote { readonly version: string; readonly date: string; readonly items: readonly ChangeItem[] }

/** Mới nhất ở ĐẦU. */
export const CHANGELOG: readonly ReleaseNote[] = [
  {
    // Đóng lỗ TNV-G1 (ADR-0089; chủ 28/10 «vá luôn lỗi»): ô đếm + khối «Thu trước của đơn huỷ» trên Trang chủ Kế toán (NT-V6), tin «đã được duyệt hoàn» cho người
    // ghi chi hoàn (NT-V7), hai dòng tiền chủ chọn 28/10. CÓ migration 0125 (dựng lại view hộp thư) nên cần npm run trien-khai. Số 2.41 và ngày là TẠM (main có
    // 2.40 tạm của tệp kèm vé lúc làm) — phiên phát hành kiểm lại ở bước A.0 của docs/HANDOFF-N1.md.
    version: "2.41",
    date: "2026-10-28",
    items: [
      { kind: "moi", text: "Trang chủ Kế toán: mục «Cần xem lại» đếm khoản thu trước đã duyệt chờ chi, đơn huỷ sắp hết hạn hoàn và đơn huỷ còn người chưa nộp tiền." },
      { kind: "moi", text: "Trang chủ Kế toán có khối «Thu trước của đơn huỷ» liệt kê từng việc kèm mã đơn; bấm mã đơn để mở và ghi chi hoàn." },
      { kind: "moi", text: "Khi Quản trị duyệt hoàn thu trước, Kế toán nhận tin «đã được duyệt hoàn thu trước cho khách, chờ ghi chi hoàn» trong hộp thông báo." },
      { kind: "doi", text: "Đơn huỷ: trang đơn và thông báo gửi khách ghi «Đã hoàn trả» thay «Đã hoàn», và thêm dòng «Đã trả lại khách trước khi huỷ» khi có." },
    ],
  },
  {
    // Đính kèm tệp trong vé hỗ trợ (ADR-0144; kế hoạch docs/superpowers/plans/2026-10-28-dinh-kem-ve-ho-tro.md). CÓ migration 0124 và kho R2 MỚI `tourdao-sales-ho-tro`
    // (chủ tạo kho TRƯỚC npm run trien-khai — docs/HANDOFF-N1.md). Số 2.40 và ngày là TẠM (production 2.38, main có 2.39 tạm của ADR-0118 lúc làm) — phiên phát hành kiểm lại ở bước A.0.
    version: "2.40",
    date: "2026-10-28",
    items: [
      { kind: "moi", text: "Hỗ trợ: bấm «Đính kèm» để gửi kèm tới 5 ảnh (JPG, PNG, HEIC) hoặc tệp PDF, tổng tối đa 10 MB một tin. Ảnh chụp tự thu nhỏ trước khi gửi." },
      { kind: "moi", text: "Trong cuộc trao đổi, ảnh hiện xem trước ngay dưới tin, tệp PDF có nút «Tải về». Ai đọc được tin thì xem được tệp kèm tin đó." },
      { kind: "moi", text: "Toàn quyền gỡ được tệp gửi nhầm; tin vẫn giữ dòng «Tệp đã được gỡ»." },
    ],
  },
  {
    // Đưa đón theo nhóm dịch vụ + điểm «Chọn nhanh» (ADR-0118, chủ duyệt 14/10; thi công 14/10 trên nhánh claude/tour-dao-booking-audit-bc6c77, dựng lại trên main 28/10).
    // CÓ migration 0121 (đổi từ số tạm 0098) nên cần npm run trien-khai sau day-len. Số 2.39 và ngày là TẠM — phiên phát hành kiểm lại ở bước A.0 của docs/HANDOFF-N1.md.
    version: "2.39",
    date: "2026-10-28",
    items: [
      { kind: "moi", text: "Quản trị bật hoặc tắt phần Đưa đón cho từng nhóm ở trang Dịch vụ & giá. Nhóm tắt thì dịch vụ của nhóm không có phần Đưa đón khi lập đơn, ghi là «Không đón»." },
      { kind: "moi", text: "Ở form Tạo đơn, dưới ô Nơi trả (chiều đi) và Nơi đón (chiều về) có nút bấm nhanh cho những điểm hay dùng như Bến cảng Vinpearl." },
      { kind: "moi", text: "Quản trị chọn điểm nào hiện thành nút bấm nhanh và xếp thứ tự ở trang Địa điểm, cột Chọn nhanh." },
      { kind: "doi", text: "Nhóm vừa tắt Đưa đón: đơn đã xác nhận chỉ bỏ được lượt đưa đón, không thêm hay sửa; đơn nháp phải bỏ lượt đưa đón rồi mới xác nhận hoặc gửi được." },
    ],
  },
  {
    // Rà chữ Trang chủ (chủ 28/10): «Chuyến đón» → «Đơn đi», «khai <ngày>» → «ghi ngày <ngày>» (chủ chọn trong hộp hỏi), nhãn «Công ty thu – chuyển khoản» sai cho khoản tiền mặt.
    // Lượt 3 (chủ 28/10): ẩn hai ô «Của tôi» với người không lập được đơn; cảnh báo đổi giá ghi tên dịch vụ. Chỉ giao diện, KHÔNG migration. Số 2.38 và ngày là TẠM — phiên phát hành kiểm lại ở bước A.0 của docs/HANDOFF-N1.md.
    version: "2.38",
    date: "2026-10-28",
    items: [
      { kind: "sua", text: "Trang chủ: khối «Chuyến đón» đổi tên thành «Đơn đi», thẻ «Chuyến hôm nay» thành «Đơn đi hôm nay», vì các số ở đây đếm đơn có ngày đi, không phải chuyến xe." },
      { kind: "sua", text: "Trang chủ Kế toán, khối Chờ đối chiếu: chữ «khai 18/10» nay ghi «ghi ngày 18/10»; khoản tiền mặt chưa nộp về công ty không còn bị ghi nhầm là «chuyển khoản»." },
      { kind: "sua", text: "Hoa hồng đối tác: «Loại gốc» đổi thành «Có sẵn», kèm câu nói vì sao không tắt được; mức bắt đầu hôm nay ghi «đổi hoặc ngừng từ ngày mai» thay vì để trống." },
      { kind: "sua", text: "Danh bạ, khối Hoa hồng hiện hành của đại lý: chính sách gắn riêng nay gọi đúng là «Chính sách riêng», không còn lẫn với «mức riêng»." },
      { kind: "sua", text: "Trang chủ Kế toán không còn hai ô «Doanh thu của tôi» và «Đơn nháp», vì hai ô này chỉ đếm đơn do chính người xem lập nên với Kế toán luôn bằng 0." },
      { kind: "sua", text: "Trang chủ Quản trị, khối Cần xem lại: dòng «Sheet đã đổi giá» nay ghi tên dịch vụ thay cho mã dịch vụ." },
      { kind: "sua", text: "Trang chủ trên điện thoại: dải nhắc «Còn … ngày để bật bảo mật hai lớp» không còn bị ô tìm kiếm che mất chữ." },
    ],
  },
  {
    // Sửa lỗi 2.36 (ADR-0136 Đ10): tin «đang chờ xác nhận» không vào hộp thông báo, màn hình khoá đọc nhầm tin cũ. CÓ migration 0120 (dựng lại view hộp thư)
    // nên cần npm run trien-khai. Số 2.37 và ngày là TẠM (production 2.36 lúc làm — GET /api/auth/config 27/10) — phiên phát hành kiểm lại ở bước A.0 của docs/HANDOFF-N1.md.
    version: "2.37",
    date: "2026-10-27",
    items: [
      { kind: "sua", text: "Khi một đơn được gửi xác nhận, người xét duyệt nay thấy tin «Đơn … đang chờ xác nhận» trong hộp thông báo, và chữ trên màn hình khoá điện thoại đúng với tin đó." },
    ],
  },
  {
    // Bước xác nhận đơn + «Gửi đơn» của Đối tác + nháp riêng tư (ADR-0135 Đợt 2, ADR-0136 Đợt 3; kế hoạch docs/superpowers/plans/2026-10-19-xac-nhan-don.md).
    // CÓ migration 0119 (ba bảng yêu cầu xác nhận / cờ / khung giờ) nên cần npm run trien-khai. Task 3.3b (sửa tiền khi đơn đang chờ) HOÃN, chưa có trong bản này.
    // Số 2.36 và ngày là TẠM — phiên phát hành kiểm lại ở bước A.0 của docs/HANDOFF-N1.md.
    version: "2.36",
    date: "2026-10-27",
    items: [
      { kind: "moi", text: "Đối tác bấm «Gửi đơn» để gửi đơn đi. Đơn có dịch vụ cần kiểm vé được văn phòng xác nhận trước; các đơn còn lại xác nhận ngay." },
      { kind: "moi", text: "Đơn có dịch vụ cần kiểm vé: bấm «Gửi xác nhận», còn «Rút lại» được. Kế toán và hướng dẫn viên quyết định ở trang «Đơn chờ xác nhận»." },
      { kind: "doi", text: "Đơn nháp là của riêng người lập: người khác không thấy và không sửa được, kể cả Quản trị." },
      { kind: "doi", text: "Màn Tạo đơn không còn ô «Thanh toán trước». Thu tiền ghi sau khi đơn đã xác nhận, và mã QR chỉ hiện sau khi đơn đã xác nhận." },
    ],
  },
  {
    // PR giao diện Hỗ trợ (PR 3; kế hoạch docs/superpowers/plans/2026-10-25-hoa-hong-ho-tro-3-giao-dien-ho-tro.md). KHÔNG migration; có mã mới nên cần npm run trien-khai.
    // Số 2.35 và ngày là TẠM: production đang 2.34 (GET /api/auth/config 27/10) — phiên phát hành kiểm lại ở bước A.0 của docs/HANDOFF-N1.md.
    version: "2.35",
    date: "2026-10-27",
    items: [
      { kind: "moi", text: "Trang Hỗ trợ làm lại, có ba thẻ: «Yêu cầu của tôi», «Việc của nhóm», «Nhóm hỗ trợ». Máy tính chia hai cột; điện thoại mở yêu cầu toàn màn hình." },
      { kind: "moi", text: "«Việc của nhóm» (trước là «Hàng đợi nhóm») có ba nút lọc kèm số, ô tìm, «Tải thêm». Đổi trạng thái, ưu tiên, người xử lý ngay đầu yêu cầu; ô trả lời sát đáy." },
      { kind: "moi", text: "Từ chối một yêu cầu phải ghi lý do, người gửi đọc được lý do đó. Khi bấm «Gửi yêu cầu» từ trang đơn của bạn, đơn được điền sẵn." },
      { kind: "moi", text: "Toàn quyền thêm nhóm hỗ trợ chỉ cần tên và mô tả, không phải đặt mã. Màn «Nhóm hỗ trợ» xem dạng bảng, gạt công tắc «Nhạy cảm» là lưu ngay." },
      { kind: "doi", text: "Đổi tên «Trợ giúp» thành «Hướng dẫn» ở mọi màn. Trợ lý vẫn hiểu khi bạn gõ «trợ giúp»." },
    ],
  },
  {
    // PR giao diện Hoa hồng + Hỗ trợ (PR 2; kế hoạch docs/superpowers/plans/2026-10-25-hoa-hong-ho-tro-2-giao-dien-hoa-hong.md). KHÔNG migration; có mã mới nên cần npm run trien-khai.
    // Số 2.34 và ngày là TẠM: production đang 2.33 (GET /api/auth/config 26/10) — phiên phát hành kiểm lại ở bước A.0 của docs/HANDOFF-N1.md.
    version: "2.34",
    date: "2026-10-26",
    items: [
      { kind: "moi", text: "Trang Hoa hồng đối tác làm lại, có hai thẻ «Mức đang áp dụng» và «Thiết lập». Có Tra nhanh: chọn đối tác hoặc loại, dịch vụ, ngày là biết mức nào được áp." },
      { kind: "moi", text: "Bảng «ai hưởng gì» xếp theo loại đối tác, mở từng đối tác để xem mức riêng; dòng mức riêng đang áp dụng có nút Đổi, Ngừng (điện thoại: chạm vào dòng)." },
      { kind: "moi", text: "Thẻ Thiết lập gom việc quản lý loại đối tác và chính sách hoa hồng: thêm loại, thêm chính sách, áp dụng cho loại, tắt/bật, ngừng áp dụng." },
      { kind: "doi", text: "Đổi chữ ở mọi màn: «Mức TA» thành «Chính sách hoa hồng»; «Đang áp», «Sắp áp», «Đã đóng» thành «Đang áp dụng», «Sắp áp dụng», «Đã ngừng»." },
    ],
  },
  {
    // PR máy chủ Hoa hồng + Hỗ trợ (ADR-0141; kế hoạch docs/superpowers/plans/2026-10-25-hoa-hong-ho-tro-1-may-chu.md). KHÔNG migration; có mã mới nên cần
    // npm run trien-khai. Số 2.33 và ngày là TẠM: production đã 2.32 (GET /api/auth/config 26/10) — phiên phát hành kiểm lại ở bước A.0 của docs/HANDOFF-N1.md.
    version: "2.33",
    date: "2026-10-26",
    items: [
      { kind: "doi", text: "Kế toán nay tìm được đối tác theo tên ở trang Hoa hồng đối tác (ô «Một đối tác» và «Thử tra»)." },
    ],
  },
  {
    // Hai chỗ lệch nhỏ của màn chuyến xe (việc 25/10 sau «tài xế thấy khách»): cùng một cách đếm «Khách i» ở màn văn phòng; lề trái dòng «Dịch vụ». Chỉ giao diện + luật hiển thị, KHÔNG migration.
    // Cùng mục 2.32 (gộp hai nhánh khi nhập): đổi nhãn dưới tên khách trên màn tài xế công ty: «Trả: …» → «Trả khách ở: …» (chủ dự án chọn chữ 25/10; «Trả:» một mình dễ đọc thành trả tiền). Chỉ chữ, KHÔNG migration.
    // Số 2.32 và ngày là TẠM — phiên phát hành kiểm lại ở bước A.0 của docs/HANDOFF-N1.md; cần npm run trien-khai (có mã mới). Cả hai việc KHÔNG migration.
    version: "2.32",
    date: "2026-10-26",
    items: [
      { kind: "sua", text: "Màn chuyến của văn phòng: khối «Khách đang chờ» đếm «Khách i» theo từng điểm đón, cùng số với thẻ điểm — không còn «Khách 3» chỗ này, «Khách 2» chỗ kia." },
      { kind: "sua", text: "Màn tài xế: dòng «Dịch vụ: …» dưới điểm đón nay thẳng cột với tên nơi đón, không còn lệch ra sát mép trái." },
      { kind: "doi", text: "Màn tài xế công ty: dòng dưới tên mỗi khách nay ghi «Trả khách ở: …» thay cho «Trả: …», để rõ đây là nơi khách xuống xe." },
    ],
  },
  {
    // Nhãn bảng kiểm khoá tháng (chủ dự án 2026-10-25 chọn chữ; mục «Chốt sổ 2026-10-25» của docs/superpowers/plans/2026-10-18-so-dai-ly-dot-2-thi-cong-nhat-ky.md). Chỉ chữ, KHÔNG migration.
    // Chủ dặn «đi cùng lần phát hành sau»: không triển khai riêng. Số 2.31 và ngày là TẠM — phiên phát hành kế tiếp kiểm lại ở bước A.0 của docs/HANDOFF-N1.md
    // và GỘP mục của mình vào mục này (cùng một số), đừng chồng thêm số mới chỉ vì mục này đã có sẵn (cổng «bản ở máy mới hơn production» qua sẵn nhờ mục này).
    // Đã gộp 25/10 (production còn 2.30), theo thứ tự dòng sau dòng khoá tháng — cả hai KHÔNG migration, có mã mới nên lần phát hành này cần npm run trien-khai:
    // (1) ba dòng ADR-0107 (accepted 2026-10-08; kế hoạch docs/superpowers/plans/2026-10-25-adr-0107-dat-gap-ban-hang.md) — Bán hàng tự đặt gấp; dấu chỉ ghi lên
    //     lượt đang dưới hạn chốt, kể cả Quản trị (409 short_notice_not_needed); nhãn dấu «Điều chỉnh khẩn cấp».
    // (2) bốn dòng màn tài xế thấy khách trước khi cho xe chạy — đề xuất docs/superpowers/specs/2026-10-25-de-xuat-tai-xe-thay-khach-truoc-khi-cho-xe-chay.md (chủ duyệt Q1 a, Q2 a).
    version: "2.31",
    date: "2026-10-25",
    items: [
      { kind: "doi", text: "Khoá sổ tháng: mục «Khoản Công ty thu – chuyển khoản chờ xác nhận» nay tên «Khoản thu chờ đối chiếu», vì gồm cả tiền khách trả đại lý hoặc quầy nhà cung cấp." },
      { kind: "doi", text: "Nhân viên bán hàng tự bấm «Đặt gấp» cho lượt đưa đón đã qua hạn chốt (kể cả đơn người khác lập), chọn lý do — không phải gọi Quản trị nữa." },
      { kind: "doi", text: "«Đặt gấp» chỉ bấm được khi lượt đưa đón thật sự đã qua hạn chốt, với mọi người kể cả Quản trị. Lượt đã đặt gấp mà bị dời ra xa thì mất dấu." },
      { kind: "doi", text: "Lượt đã đặt gấp nay mang nhãn «Điều chỉnh khẩn cấp»; Đối tác thấy «Điều chỉnh khẩn cấp (văn phòng)»." },
      { kind: "moi", text: "Tài xế công ty, trong ngày chạy, thấy tên, năm sinh từng khách và số liên hệ ngay trên màn chuyến, trước khi bấm «Cho xe chạy»." },
      { kind: "moi", text: "Màn tài xế công ty: chuyến có từ hai điểm trả thì dưới tên mỗi khách có chữ «Trả: …» cho biết khách xuống ở đâu." },
      { kind: "doi", text: "Màn tài xế: khối «Suất của khách» nay ghi «Điểm 2 · Khách 1», cùng cách đếm với dòng khách dưới điểm đón." },
      { kind: "doi", text: "Màn tài xế: dòng hẹn giờ thấy khách nay ghi «tên khách và số liên hệ» thay cho «tên khách và mã đơn»; tài xế đối tác ghi rõ là sau khi bấm «Cho xe chạy»." },
    ],
  },
  {
    // Màn Sổ công nợ (P1 của docs/superpowers/plans/2026-10-24-so-cong-no-doi-tac-ke-hoach-thi-cong.md; bản vẽ 2a). Thêm route chỉ đọc GET /api/ledger/ben/:partyId. KHÔNG migration.
    version: "2.30",
    date: "2026-10-25",
    items: [
      { kind: "moi", text: "Màn mới «Sổ công nợ» cho Kế toán: ai còn giữ tiền chưa nộp về công ty, công ty còn nợ ai bao nhiêu; bấm một bên để xem từng đơn." },
      { kind: "doi", text: "Thanh bên: «Sổ công nợ» và «Khoá sổ tháng» gộp chung một mục «Sổ công nợ & khoá sổ» ở nhóm Tiền; hai trang có dải chuyển qua lại." },
    ],
  },
  {
    // Góp ý màn Hỗ trợ (kế hoạch docs/superpowers/specs/2026-10-24-phan-tich-gop-y-ho-tro-ke-hoach.md): YC-0013, 0015, 0016, 0018, 0020; ADR-0138, ADR-0139. Migration 0118.
    version: "2.29",
    date: "2026-10-25",
    items: [
      { kind: "moi", text: "Hồ sơ đại lý trong Danh bạ có mục «Hoa hồng hiện hành». Kế toán, Quản trị, Toàn quyền gắn được mức TA riêng cho từng đại lý ngay tại đây." },
      { kind: "moi", text: "Danh sách đơn có bộ lọc «Chưa có người phụ trách»." },
      { kind: "moi", text: "Tài xế công ty, trong ngày chạy, thấy số điện thoại người đi kèm chuyến và tên dịch vụ của từng nhóm khách." },
      { kind: "doi", text: "Trang đơn: đơn chưa có ngày thì nút «Xác nhận đơn» bị khoá và có dòng nói vì sao." },
      { kind: "doi", text: "Thẻ đơn: nhãn «Đã nhập phần mềm kế toán» nay có viền xanh, dễ nhận ra hơn." },
    ],
  },
  {
    // Ba sửa nhỏ sau rà soát «Sổ đại lý đợt 2» (chủ duyệt 24/10; Ruling R-154…R-157 ở docs/superpowers/plans/2026-10-18-so-dai-ly-dot-2-thi-cong-nhat-ky.md). KHÔNG migration.
    // Số 2.28 là số TẠM (main đang ở 2.27) — phiên phát hành kiểm lại cho đúng số kế tiếp ở main (bước A.0 của docs/HANDOFF-N1.md). Ngày là ngày dự kiến.
    version: "2.28",
    date: "2026-10-24",
    items: [
      { kind: "sua", text: "Đơn có giảm giá: số tiền tối đa ghi được cho phần khách trả tại quầy nhà cung cấp nay tính sau giảm giá, bằng phần của quầy in trên biên nhận." },
      { kind: "doi", text: "Tài khoản đối tác vốn không thấy ô «Phần tiền này cho»; nay Nền tảng cũng từ chối khoản thu gửi kèm ô này. Cần thì báo Kế toán ghi giúp." },
      { kind: "moi", text: "Ghi mức hoa hồng tay: nếu mức mới làm tổng hoa hồng nhỏ hơn giảm giá của đơn, Nền tảng báo trước số đại lý sẽ phải trả thêm (vẫn lưu được)." },
    ],
  },
  {
    // Nút «Từ chối đơn» (ADR-0030 điều 1, kế hoạch docs/superpowers/plans/2026-10-20-tu-choi-don-thi-cong.md) + hạn mức Từ chối (ADR-0032, kế hoạch
    // docs/superpowers/plans/2026-10-23-han-muc-tu-choi-thi-cong.md — phát hành CHUNG theo khuyến nghị Q-PH; CÓ migration *_han_muc_tu_choi.sql). Chạy npm run trien-khai
    // sau day-len (mã mới). Số 2.27 là số TẠM (main đang ở 2.26) — phiên phát hành kiểm lại số kế tiếp ở main (bước A.0 của docs/HANDOFF-N1.md). Ngày là ngày dự kiến.
    version: "2.27",
    date: "2026-10-23",
    items: [
      { kind: "moi", text: "Người đang lo một đơn bấm «Từ chối đơn» để trả đơn, chọn lý do; đơn quay về Chờ nhận, có chữ «được trả lại» để người khác nhận." },
      { kind: "doi", text: "Đơn đi hôm nay hoặc ngày mai thì không trả được nữa: gọi văn phòng để đổi người." },
      { kind: "moi", text: "Đếm số lần hướng dẫn viên từ chối: tối đa 2 đơn liên tiếp, 15 lần mỗi tuần (đang chỉ đo, chưa chặn). Toàn quyền chỉnh ở Chính sách điều phối." },
      { kind: "moi", text: "Khi giao lại đơn, bảng chọn người ghi rõ ai đã từ chối chính đơn đó, lúc nào, lý do gì." },
    ],
  },
  {
    // Vá bản 2.25 (người kiểm độc lập 19/10): đường «Đã giao» / màn tiền của đơn và kiểm định kỳ bỏ rơi số khách theo loại nên đơn đại lý dùng mức theo loại khách sẽ lỗi. KHÔNG migration.
    // Số 2.26 là số TẠM (main đang ở 2.25) — phiên phát hành kiểm lại cho đúng số kế tiếp ở main (bước A.0 của docs/HANDOFF-N1.md). Ngày là ngày dự kiến.
    version: "2.26",
    date: "2026-10-19",
    items: [
      { kind: "sua", text: "Đơn đại lý tính hoa hồng theo mức riêng từng loại khách (người lớn, trẻ em, người cao tuổi) nay bấm Đã giao và mở màn tiền được bình thường." },
    ],
  },
  {
    // ADR-0133 chiết khấu «mỗi khách» tách theo loại khách (migration 0116). CÓ migration ⇒ cần npm run trien-khai sau day-len.
    // Bản 2.25 đã lên production 2026-10-19 21:12 giờ VN.
    version: "2.25",
    date: "2026-10-19",
    items: [
      { kind: "moi", text: "Hoa hồng đối tác: khai số tiền mỗi khách riêng cho người lớn, trẻ em, người cao tuổi (phải điền, không trả thì gõ 0); em bé không tính." },
      { kind: "doi", text: "Đơn đã xác nhận giữ nguyên mức đã chụp lúc xác nhận; sửa số khách sau đó thì hoa hồng tính lại theo đúng mức ấy." },
    ],
  },
  {
    // Sổ đại lý đợt 2 (đặc tả docs/superpowers/specs/2026-10-18-so-dai-ly-dot-2/README.md; ADR-0132, ADR-0079, ADR-0078): đơn có người hưởng hoa hồng đi tới «Đã giao»,
    // khách trả cho đại lý / tại quầy nhà cung cấp chờ Kế toán, Chụp bù mức, biên nhận chia phần, trần giảm giá theo hoa hồng. Hai migration (0112, 0113 — số tạm).
    // Số 2.24 là số TẠM (kiểm lại 2026-10-19 17:50 ở Task 14: main đã dùng 2.22 — commit 01e46f33, thẻ gập «Đã duyệt đặt gấp» —, nhánh worktree-xac-nhan-don
    // giữ 2.23 — đã lên main 7dfd642a, gộp vào nhánh này 2026-10-19 nên 2.24 vẫn là số kế tiếp; trước đó nhánh này ghi 2.22, Ruling R-127) — phiên phát hành kiểm lại cho đúng số kế tiếp ở main (bước A.0 của docs/HANDOFF-N1.md). Ngày là ngày dự kiến.
    version: "2.24",
    date: "2026-10-19",
    items: [
      { kind: "moi", text: "Đơn đặt qua đại lý nay bấm được Đã giao – đã thu đủ; khi đó Nền tảng tự ghi hoa hồng của đại lý và tiền phải trả nhà cung cấp." },
      { kind: "moi", text: "Ghi khoản thu: thêm lựa chọn Khách trả cho đại lý và Khách trả tại quầy nhà cung cấp. Khoản này chờ Kế toán bấm Bên kia đã nhận rồi đơn mới Đã giao được." },
      { kind: "moi", text: "Kế toán: Trang chủ có khối Chờ đối chiếu; trang Chụp bù mức (menu Thiết lập) cho đơn xác nhận trước khi có bảng mức." },
      { kind: "moi", text: "Biên nhận gửi khách chia phần theo người bán: phần Tour Đảo và phần trả tại quầy nhà cung cấp." },
      { kind: "doi", text: "Đơn có người hưởng hoa hồng: giảm giá tối đa bằng hoa hồng của đơn. Tài khoản đối tác được hưởng giảm được tới mức hoa hồng của đơn mình." },
    ],
  },
  {
    // Bước Xác nhận đơn — Đợt 1 (ADR-0134, migration 0115; nhánh worktree-xac-nhan-don): mỗi dịch vụ bắt buộc chọn Đón / Không đón trước khi xác nhận (máy chủ 409
    // pickup_choice_required), khung giờ đón chọn sẵn hoặc Giờ khác, câu lưu ý giờ đón thực tế. CÓ migration ⇒ cần npm run trien-khai sau day-len.
    // Số 2.23 là số TẠM (đầu mảng hiện tại 2.22 tạm) — phiên phát hành kiểm lại cho đúng số kế tiếp ở main (bước A.0 của docs/HANDOFF-N1.md). Ngày là ngày dự kiến.
    version: "2.23",
    date: "2026-10-19",
    items: [
      { kind: "doi", text: "Lập đơn: mỗi dịch vụ phải chọn Đón hoặc Không đón. Đơn nháp chưa chọn vẫn lưu được, nhưng phải chọn xong cho mọi dịch vụ thì mới xác nhận được đơn." },
      { kind: "moi", text: "Khi chọn Đón, chọn nhanh một khung giờ đón có sẵn (ví dụ 07:30 – 08:00), hoặc bấm Giờ khác để tự nhập giờ đón." },
      { kind: "moi", text: "Dưới hàng khung giờ có câu lưu ý: giờ đón thực tế có thể điều chỉnh cho phù hợp tình hình hoạt động." },
    ],
  },
  {
    // Nợ nhỏ cuối của màn Tạo đơn thiết kế lại (Việc 14, 19/10): dòng gập của thẻ ghi «Đã duyệt đặt gấp» khi chặng đã được duyệt. KHÔNG migration, không đổi thân gửi.
    // Cùng đợt có công cụ dọn máy `npm run don-may` và bộ bọc Chrome tự đóng — công cụ của nhà phát triển, không hiện cho người dùng nên không ghi ở đây.
    // Số 2.22 là số TẠM (production báo 2.21; kiểm main ngày 19/10: chưa dùng 2.22) — phiên phát hành kiểm lại cho đúng số kế tiếp ở main (bước A.0 của docs/HANDOFF-N1.md).
    version: "2.22",
    date: "2026-10-19",
    items: [
      { kind: "moi", text: "Màn Tạo đơn: thẻ dịch vụ đã gập nay ghi rõ Đã duyệt đặt gấp khi chặng đưa đón đã được duyệt, nên không cần mở thẻ ra mới biết." },
    ],
  },
  {
    // Vòng sửa sau khi màn Tạo đơn mới lên production (Việc 12, chủ dự án báo 19/10 bằng tài khoản Đối tác trên Safari): nhãn nổi đè chữ ở hai ô chọn của khối Thanh toán
    // (lỗi riêng của Safari / iPhone, có từ khi có nhãn nổi 13/10); thẻ gập của dịch vụ không có chặng nêu "Không đưa đón". KHÔNG migration, không đổi thân gửi lên máy chủ.
    // Số 2.21 là số TẠM (production báo 2.20 qua GET /api/auth/config ngày 19/10; kiểm git trên main, mọi nhánh và mọi worktree: chưa nơi nào dùng 2.21) — phiên phát hành
    // kiểm lại cho đúng số kế tiếp ở main (bước A.0 của docs/HANDOFF-N1.md). Ngày là ngày dự kiến.
    version: "2.21",
    date: "2026-10-19",
    items: [
      { kind: "sua", text: "Màn Tạo đơn trên Safari và iPhone: tên ô Hình thức, Người thu tiền không còn đè lên chữ đã chọn; hai ô cao bằng ô bên cạnh." },
      { kind: "sua", text: "Thẻ dịch vụ gập lại nay ghi rõ Không đưa đón khi dịch vụ chưa có chặng đưa đón, để biết là chưa nhập chứ không bị ẩn." },
    ],
  },
  {
    // Màn Tạo đơn thiết kế lại (đặc tả docs/superpowers/specs/2026-10-18-tao-don-thiet-ke-lai/DAC-TA.md, việc 1–9). KHÔNG migration, không đổi thân gửi lên máy chủ.
    // Số 2.20 là số TẠM (main có 2.19 tạm; kiểm 2026-10-19 bằng git trên main, mọi nhánh và mọi worktree: chưa nơi nào dùng 2.20): phiên phát hành kiểm lại
    // cho đúng số kế tiếp ở main (bước A.0 của docs/HANDOFF-N1.md). Ngày là ngày dự kiến.
    version: "2.20",
    date: "2026-10-19",
    items: [
      { kind: "doi", text: "Màn Tạo đơn mới: chọn dịch vụ bằng hàng nhóm cuộn ngang và khung danh sách luôn mở; chạm một dòng là thêm, dòng hiện ✓ đã thêm." },
      { kind: "doi", text: "Thẻ dịch vụ gập thành một dòng (tên, số khách, giờ đón, thành tiền), mỗi lúc chỉ mở một thẻ; xoá dịch vụ bằng nút thùng rác." },
      { kind: "doi", text: "Số khách xếp hai cột, mỗi loại khách ghi giá; dòng tiền ghi rõ, ví dụ 2 người lớn × 1.350.000 = 2.700.000." },
      { kind: "doi", text: "Đưa đón chỉ còn một ô Nơi đón và một ô Nơi trả: gõ để chọn điểm có sẵn hoặc ghi địa chỉ tự do." },
      { kind: "doi", text: "Khối khách có công tắc Đơn của (Khách lẻ hoặc Qua đối tác), bảng Đổi khách ở trang đơn cũng vậy; gõ số điện thoại của đối tác sẽ được nhắc." },
      { kind: "doi", text: "Tổng tiền nằm ở thanh dưới cùng, chạm để xem chi tiết; lỗi khi lưu hiện ngay trên nút Lưu. Hình thức, Người thu tiền chỉ hiện khi có trả trước." },
    ],
  },
  {
    // ADR-0130 (rà soát ngôn ngữ giao diện, lượt 1 + lượt 2 — hồ sơ docs/superpowers/specs/2026-10-18-ra-soat-ngon-ngu-luot-2.md): đổi chữ hiện cho người dùng,
    // dấu trừ trên dòng huỷ khoản thu, hai lỗi nút thẻ Thanh toán, ô hạn chốt nhập phút; MỘT migration 0111 (chỉ đổi hai nhãn luật chuyển khách). Số 2.19 là số TẠM
    // (= 2.18 của main + 1, kiểm 2026-10-19 bằng git): phiên phát hành kiểm lại cho đúng số kế tiếp ở main (bước A.0). Ngày là ngày dự kiến.
    version: "2.19",
    date: "2026-10-19",
    items: [
      { kind: "doi", text: "Trang đơn, khối Thanh toán: «Ghi lần thu» nay là «Ghi khoản thu»; «Thay lần thu» nay là «Sửa khoản thu đã ghi»; nút «Đảo» nay là «Huỷ khoản thu»." },
      { kind: "doi", text: "Khoản thu đã huỷ ghi «(đã huỷ)»; dòng huỷ hiện số có dấu trừ để không bị đọc thành khách trả thêm một lần." },
      { kind: "doi", text: "Chi phí xe thuê: nút «Đảo dòng» nay là «Huỷ dòng». Trong hộp huỷ đơn, nút «Giữ đơn» nay là «Không huỷ»." },
      { kind: "doi", text: "Đổi tên cho dễ hiểu: «chặng» thành «lượt đưa đón», «mốc tối thiểu» thành «hạn chốt», «xuất bến» thành «cho xe chạy»." },
      { kind: "doi", text: "«Vai» nay là «vai trò»; «phiên đăng nhập» nay là «máy đang đăng nhập»." },
      { kind: "doi", text: "Tiền: ô chọn ai cầm tiền nay thống nhất là «Người thu tiền»; tiền nhân viên đang cầm của công ty nay ghi «chưa nộp về công ty»." },
      { kind: "sua", text: "Khối Thanh toán: khoản đang chờ Kế toán xác nhận không còn nút «Sửa khoản thu đã ghi»; khoản tiền mặt không còn bị hỏi «vào tài khoản?»." },
      { kind: "doi", text: "Chính sách điều phối: ô hạn chốt của Toàn quyền nay nhập theo phút như của Quản trị; gợi ý ghi rõ đơn tính trước giờ đón, xếp xe trước giờ xe chạy." },
    ],
  },
  {
    // ADR-0131 (thu hẹp quyền đọc nhật ký): lịch sử đơn và thông báo về đơn bỏ tên người làm với mọi người trừ Toàn quyền. Không migration. Số 2.18 là số TẠM
    // (= 2.17 + 1, kiểm 2026-10-18): phiên phát hành kiểm lại số ở bước A.0 của docs/HANDOFF-N1.md. Ngày là ngày dự kiến.
    version: "2.18",
    date: "2026-10-18",
    items: [
      { kind: "doi", text: "Khối Lịch sử của đơn và các thông báo về đơn không còn ghi tên người đã làm; chỉ tài khoản Toàn quyền xem được đầy đủ ai làm gì." },
    ],
  },
  {
    // Sửa B-01 (rà soát trước launch): tin «giao đơn» gửi tới chính người được giao không còn đọc «cho người khác phụ trách». Chỉ đổi chữ, không migration, không cần
    // đổi dữ liệu. Số 2.17 là số TẠM (= production 2.16 + 1, kiểm 2026-10-18): phiên phát hành kiểm lại cho đúng số kế tiếp ở main (bước A.0 của docs/HANDOFF-N1.md).
    // Ngày là ngày dự kiến.
    version: "2.17",
    date: "2026-10-18",
    items: [
      { kind: "sua", text: "Khi được giao đơn, bạn đọc «… giao đơn … cho bạn phụ trách» (trên chuông và trên màn hình khoá), không còn đọc «cho người khác phụ trách» như trước." },
    ],
  },
  {
    // Gói 2 hồ sơ riêng tư, lát H-5 (ADR-0126): yêu cầu xoá dữ liệu cá nhân + Quản trị xem trước / thực hiện (ẩn danh hoá) + danh sách ảnh giấy tờ hết lý do giữ + ẩn danh phiên cũ;
    // migration 0108 (đã áp trên production cùng lần 2.16 — d1 migrations list --remote, kiểm 2026-10-18). Chính sách riêng tư KHÔNG đăng trên production
    // cho tới khi luật sư duyệt chữ và chủ nhập số ngày hợp pháp (docs/HANDOFF-N1.md).
    // Số 2.16 đã là số CHÍNH THỨC: production chạy 2.16 (GET /api/auth/config, kiểm 2026-10-17). Không đổi số.
    version: "2.16",
    date: "2026-10-17",
    items: [
      { kind: "moi", text: "Bạn có thể gửi yêu cầu xoá dữ liệu cá nhân của mình ở Tôi → Hồ sơ của tôi." },
      { kind: "moi", text: "Quản trị xem trước rồi thực hiện yêu cầu xoá: giấy tờ, địa chỉ, ngày sinh, liên hệ, thông tin máy đăng nhập được xoá; phần phải giữ được liệt kê rõ." },
      { kind: "moi", text: "Danh bạ có danh sách ảnh giấy tờ đã hết lý do giữ để người có quyền bấm xoá." },
    ],
  },
  {
    // Gói 2 hồ sơ riêng tư, lát H-4 (ADR-0125): Hàng chờ xác minh ở trang Quản lý tài khoản + luật tách nhiệm vụ; migration 0107 (đã áp trên production cùng lần 2.16,
    // kiểm 2026-10-18; nhánh vé hỗ trợ giữ 0106). Tự khai vẫn chỉ bật khi Toàn quyền đăng chính sách; chấp nhận phiếu giấy tờ chưa có (chưa có ảnh).
    // Số 2.15 đã là số CHÍNH THỨC (lên production cùng lần phát hành chạy 2.16, kiểm 2026-10-17). Không đổi số.
    version: "2.15",
    date: "2026-10-17",
    items: [
      { kind: "moi", text: "Quản trị và Nhân sự có Hàng chờ xác minh ở trang Quản lý tài khoản: xem thông tin người dùng tự khai, chấp nhận nguyên văn hoặc từ chối kèm lý do." },
      { kind: "doi", text: "Người đã tạo tài khoản hoặc từng hỗ trợ đăng nhập cho người đó không xác minh được phiếu của họ." },
    ],
  },
  {
    // Gói 2 hồ sơ riêng tư, lát H-3 (ADR-0124, ADR-0126 đ1): khối "Hồ sơ của tôi" ở trang Tôi, chính sách riêng tư + đồng ý, phiếu tự khai (chưa có xác minh — lát H-4);
    // migration 0105. CÓ migration — cần trien-khai sau day-len. TỰ KHAI CHỈ BẬT KHI TOÀN QUYỀN ĐĂNG CHÍNH SÁCH (không gieo bản nào — ruling Q1).
    // Số 2.14 đã là số CHÍNH THỨC (lên production cùng lần phát hành chạy 2.16, kiểm 2026-10-17). Không đổi số.
    version: "2.14",
    date: "2026-10-17",
    items: [
      { kind: "moi", text: "Trang Tôi có mục Hồ sơ của tôi: xem thông tin của mình, đọc chính sách riêng tư và gửi ngày sinh, địa chỉ, giấy tờ để được xác minh." },
      { kind: "doi", text: "Thông tin bạn gửi chỉ được dùng sau khi người khác xác minh; chưa có chính sách riêng tư thì chưa gửi được." },
    ],
  },
  {
    // Gói 2 hồ sơ riêng tư, lát H-2 (ADR-0123): kho tệp hồ sơ R2, route tải / mở ảnh giấy tờ chỉ Toàn quyền, hàng chờ xoá, gộp mang ảnh;
    // migration 0104. CÓ migration + CHỦ PHẢI TẠO KHO R2 TRƯỚC (docs/HANDOFF-N1.md; cổng 1e của trien-khai dừng nếu chưa có). Chưa có màn hình.
    // Số 2.13 đã là số CHÍNH THỨC (lên production cùng 2.12 và các mục sau trong một lần phát hành, kiểm 2026-10-17). Không đổi số.
    version: "2.13",
    date: "2026-10-17",
    items: [
      { kind: "doi", text: "Nền tảng đã có chỗ cất ảnh chụp giấy tờ (căn cước, bằng lái): chỉ Toàn quyền tải lên và mở xem, mỗi lần mở đều được ghi lại." },
      { kind: "doi", text: "Chưa có màn hình tải hay xem ảnh nên người dùng chưa thấy gì thay đổi." },
    ],
  },
  {
    // Gói 2 hồ sơ riêng tư, lát H-0 + H-1 (Hiến chương 5.20; ADR-0122, ADR-0126 đ1): hạng dữ liệu cá nhân cho mọi cột; migration 0103 thêm ngày sinh, liên hệ địa chỉ,
    // giấy tờ tổ chức, sổ xác minh, chính sách riêng tư + đồng ý (chưa có màn nhập). CÓ migration — cần trien-khai sau day-len.
    // Số 2.12 đã là số CHÍNH THỨC (lên production cùng lần phát hành chạy 2.16, kiểm 2026-10-17). Không đổi số.
    version: "2.12",
    date: "2026-10-17",
    items: [
      { kind: "doi", text: "Danh bạ: ngày sinh và địa chỉ cá nhân chỉ Quản trị, Toàn quyền và chính người đó xem được. Bán hàng, Kế toán không thấy; tìm theo chữ số địa chỉ cũng không ra." },
      { kind: "doi", text: "Nền tảng đã có chỗ lưu giấy phép công ty đối tác và kết quả xác minh hồ sơ, nhưng chưa có màn hình nhập nên chưa có gì cho người dùng thấy." },
    ],
  },
  {
    // Sổ vàng vận chuyển (ADR-0128, ADR-0129): mốc ra lệnh Quản trị tự đặt, xe riêng không ghép khách lẻ, thêm khách thiếu chỗ giữ nguyên xe, tài xế công ty lái xe thuê.
    // Có thay đổi cơ sở dữ liệu (migration 0109 viết lại hai trigger) — cần trien-khai sau day-len. Số 2.11 = production 2.10 + 1 (kiểm 2026-10-17).
    version: "2.11",
    date: "2026-10-17",
    items: [
      { kind: "moi", text: "Quản trị tự đặt được mốc ra lệnh và mức cảnh báo sát mốc (tính bằng phút) trong Chính sách điều phối; các cài đặt khác của trang vẫn chỉ Toàn quyền." },
      { kind: "doi", text: "Xe riêng không bao giờ ghép thêm khách lẻ: bị chặn cả khi điều chỉnh khẩn cấp hay phá lệ. Riêng đơn đòi số chỗ tối thiểu thì Quản trị vẫn phá lệ được như trước." },
      { kind: "doi", text: "Đơn tăng thêm khách mà xe không đủ chỗ cho cả phần tăng thì máy không thêm ghế nào, giữ nguyên xe và báo người xếp xe; đơn vẫn lưu số khách mới." },
      { kind: "moi", text: "Tài xế công ty được lái xe nhà xe thuê khi đủ hạng bằng; chuyến hiện cảnh báo «chéo xe – tài xế». Tài xế nhà xe vẫn không lái xe công ty hay xe nhà xe khác." },
      { kind: "sua", text: "Các hướng dẫn và trợ lý Mai nói «mốc ra lệnh» thay vì ghi cứng 6 giờ, vì mốc nay do Quản trị đặt." },
    ],
  },
  {
    // Vé hỗ trợ đợt 2a (ADR-0127): khung trò chuyện tự làm mới, mức ưu tiên, đơn liên quan, Trưởng nhóm giao việc. Có thay đổi cơ sở dữ liệu (migration 0106 thêm
    // ba cột ở phiếu) — cần trien-khai sau day-len. Số 2.10 là số TẠM (= main / production 2.9 + 1, kiểm 2026-10-17; đã nhập main có mục 2.9):
    // phiên phát hành kiểm lại cho đúng số kế tiếp ở main (bước A.0 của docs/HANDOFF-N1.md). Ngày là ngày dự kiến.
    version: "2.10",
    date: "2026-10-17",
    items: [
      { kind: "moi", text: "Trong một yêu cầu hỗ trợ, tin trả lời mới tự hiện sau vài giây khi trang đang mở, không cần tải lại; chữ bạn đang gõ vẫn giữ nguyên." },
      { kind: "moi", text: "Khi gửi yêu cầu, bạn chọn được một đơn do chính mình lập ở ô Đơn liên quan; người xử lý thấy mã đơn; ai có quyền xem đơn đó thì bấm mở được." },
      { kind: "moi", text: "Người xử lý đặt mức ưu tiên Thường, Cao hoặc Khẩn; hàng đợi nhóm xếp Khẩn lên đầu. Người gửi thấy mức nhưng không đổi được." },
      { kind: "moi", text: "Trưởng nhóm hỗ trợ có nút Giao cho người khác để chọn thành viên trong nhóm nhận yêu cầu." },
    ],
  },
  {
    // Sửa hiển thị Góp ý ở Trang chủ (chỉ giao diện và cách đếm, KHÔNG đổi cơ sở dữ liệu, không migration).
    // Số 2.9 là số TẠM (= main 2.8 + 1, kiểm 2026-10-16): phiên phát hành kiểm lại cho đúng số kế tiếp ở main (bước A.0 của docs/HANDOFF-N1.md). Ngày là ngày dự kiến.
    version: "2.9",
    date: "2026-10-16",
    items: [
      { kind: "sua", text: "Trang chủ của Quản trị: dòng \"góp ý mới chưa trả lời\" chỉ có một phiếu thì bấm vào mở thẳng phiếu đó, không còn mở danh sách chung." },
      { kind: "sua", text: "Chấm đếm Góp ý (thanh bên và thẻ \"Góp ý chờ xử lý\") không còn đếm phiếu đã xong hoặc đã từ chối; người gửi trả lời lại thì phiếu được đếm lại." },
    ],
  },
  {
    // Dòng giải thích ở trang Tôi → Bảo mật đăng nhập khi không có lựa chọn Email (chủ dự án 2026-10-16: Toàn quyền không thấy Email, tưởng là lỗi). Không migration.
    // Số 2.8 là số TẠM (= main 2.7 + 1, kiểm 2026-10-16: main 476099d3): phiên phát hành kiểm lại cho đúng số kế tiếp ở main (bước A.0 của docs/HANDOFF-N1.md).
    version: "2.8",
    date: "2026-10-16",
    items: [
      { kind: "sua", text: "Trang Tôi, mục Bảo mật đăng nhập: tài khoản Quản trị, Toàn quyền, Kế toán nay có dòng giải thích vì sao không có lựa chọn nhận mã qua email." },
    ],
  },
  {
    // Mã đăng nhập qua email (ADR-0074 Phần C). Có thay đổi cơ sở dữ liệu (migration 0102 thêm bảng mã email) — cần trien-khai sau day-len. Gửi thư dùng binding
    // EMAIL + bí mật FEEDBACK_MAIL_FROM đã có (chủ xác nhận; gửi thật chưa thử — docs/HANDOFF-N1.md).
    // Số 2.7 là số TẠM (= main 2.6 «thẻ góp ý chưa trả lời» + 1, kiểm 2026-10-16: main 238f740a): phiên phát hành kiểm lại cho đúng số kế tiếp ở main (bước A.0 của
    // docs/HANDOFF-N1.md) — người thi công KHÔNG tự chốt số. Ngày là ngày dự kiến.
    version: "2.7",
    date: "2026-10-16",
    items: [
      { kind: "moi", text: "Có thể nhận mã đăng nhập qua email thay cho ứng dụng xác thực (không áp cho Quản trị, Toàn quyền, Kế toán). Bật ở trang Tôi, mục Bảo mật đăng nhập." },
      { kind: "moi", text: "Khi đăng nhập bằng PIN trên máy lạ, bấm \"Gửi mã qua email\" rồi nhập mã 6 số trong thư. Mã dùng được 10 phút; thư thật không bao giờ có liên kết." },
    ],
  },
  {
    // Thẻ «góp ý mới chưa trả lời» ở Trang chủ không còn đếm phiếu đã có người trả lời công khai (chủ dự án 2026-10-16). Không migration. Số tạm.
    version: "2.6",
    date: "2026-10-16",
    items: [
      { kind: "sua", text: "Thẻ «góp ý mới chưa trả lời» ở Trang chủ không còn đếm những yêu cầu đã được trả lời." },
    ],
  },
  {
    // Bảo mật hai lớp bằng ứng dụng xác thực (ADR-0074 Phần B). Có thay đổi cơ sở dữ liệu (migration 0101) — cần trien-khai sau day-len; chủ đặt bí mật
    // MFA_ENCRYPTION_KEY TRƯỚC khi triển khai (docs/HANDOFF-N1.md). Ân hạn 14 ngày tính từ lúc migration áp.
    // Số 2.5 là số TẠM (= main 2.4 «Mức TA» + 1, kiểm 2026-10-16): phiên phát hành kiểm lại cho đúng số kế tiếp ở main (bước A.0 của docs/HANDOFF-N1.md). Ngày là ngày dự kiến.
    version: "2.5",
    date: "2026-10-16",
    items: [
      { kind: "moi", text: "Bảo mật hai lớp: đăng nhập bằng PIN trên máy lạ sẽ hỏi thêm mã 6 số từ ứng dụng xác thực (Google Authenticator) trên điện thoại của bạn." },
      { kind: "moi", text: "Nhân viên nội bộ có 14 ngày để bật ở trang Tôi, mục Bảo mật đăng nhập. Mất điện thoại thì dùng mã dự phòng hoặc nhờ Quản trị tắt giúp." },
    ],
  },
  {
    // Mức TA dùng chung (ADR-0117 lần 2; chủ duyệt lần 2 bằng lời trong chat 2026-10-14): bộ hoa hồng có tên, gắn loại đối tác vào mức theo ngày; chọn mức thêm bậc 7–9.
    // Có thay đổi cơ sở dữ liệu (migration 0096 thêm hai bảng, 0097 dựng lại bảng mức hoa hồng) — cần npm run trien-khai sau day-len (Task 7 của kế hoạch, chủ tự chạy).
    // Số 2.4 là số TẠM (= main 2.3 «Trợ lý» + 1, kiểm 2026-10-16: main 4ac66bc1): phiên phát hành kiểm lại cho đúng số kế tiếp ở main (bước A.0 của docs/HANDOFF-N1.md) —
    // người thi công KHÔNG tự chốt số. Ngày là ngày dự kiến.
    version: "2.4",
    date: "2026-10-16",
    items: [
      { kind: "moi", text: "Trang Hoa hồng đối tác có thêm khối Mức TA: Kế toán đặt tên mức (ví dụ Đại lý cấp 1), thêm dòng hoa hồng cho mức, rồi gắn loại đối tác vào mức từ một ngày." },
      { kind: "moi", text: "Đối tác mang loại đã gắn mức được tính hoa hồng theo mức đó khi đơn được xác nhận. Mức riêng của đối tác hay của loại vẫn được ưu tiên hơn mức TA." },
      { kind: "moi", text: "Gắn mức cho loại còn mức riêng: Nền tảng hiện khung vàng liệt kê các dòng riêng đó, không chặn. Đóng các dòng riêng nếu muốn dùng mức TA." },
      { kind: "moi", text: "Thử tra cho biết mức TA nào đang áp, kèm tên mức." },
      { kind: "doi", text: "Đổi mức hay sửa số của mức không làm đổi hoa hồng đơn đã xác nhận. Mỗi loại một mức trong một ngày: muốn đổi từ hôm nay thì kết thúc gắn cũ tới hôm qua." },
    ],
  },
  {
    // Đổi tên nút nổi và khung của trợ lý AI từ «Hỗ trợ» thành «Trợ lý» để khỏi trùng mục menu Hỗ trợ (chủ dự án 2026-10-15). Không migration. Số tạm.
    version: "2.3",
    date: "2026-10-16",
    items: [
      { kind: "doi", text: "Nút nổi và khung hỏi đáp của trợ lý đổi tên từ «Hỗ trợ» thành «Trợ lý», để khỏi nhầm với mục Hỗ trợ ở menu." },
    ],
  },
  {
    // Khoản chuyển khoản «Công ty thu» không tạo nợ cho người khai + Kế toán duyệt chuyển tiền sang đơn khác + đổi chữ «cọc» thành «Thu trước» (ADR-0120 của dòng sổ tiền, chủ duyệt 14/10: «duyệt cả hai theo khuyến nghị»).
    // Có thay đổi cơ sở dữ liệu (migration 0099) — cần trien-khai sau day-len.
    // Số 2.2 là số TẠM (= main 2.1 của Vé hỗ trợ + 1, 2026-10-16; chủ chọn cho mục này vào main trước nhánh đưa đón): phiên phát hành kiểm lại cho đúng số kế tiếp ở main (bước A.0 của docs/HANDOFF-N1.md) — người thi công KHÔNG tự chốt số. Ngày là ngày dự kiến.
    version: "2.2",
    date: "2026-10-16",
    items: [
      { kind: "doi", text: "Hướng dẫn viên khai \"Công ty thu\" bằng chuyển khoản thì không bị tính nợ phần đó; khoản hiện \"đang đối chiếu\" tới khi Kế toán bấm \"Công ty đã nhận\"." },
      { kind: "doi", text: "Đơn còn khoản chuyển khoản đang đối chiếu thì chưa bấm được \"Đã giao – đã thu đủ\". Tiền mặt khai \"Công ty thu\" vẫn tính vào nợ người khai như trước." },
      { kind: "moi", text: "Khoản đang đối chiếu quá 3 ngày được nhắc đỏ cho Kế toán ở trang đơn và Trang chủ." },
      { kind: "moi", text: "Kế toán duyệt được việc chuyển tiền thu trước sang đơn mới. Duyệt hoàn tiền cho khách vẫn chỉ Quản trị và Toàn quyền; người duyệt phải khác người ghi chuyển." },
      { kind: "doi", text: "Chữ \"cọc\" trên màn hình nhân viên đổi thành \"Thu trước\"; bản xác nhận gửi khách giữ nguyên." },
    ],
  },
  {
    // Vé hỗ trợ đợt 1 (ADR-0119): nhóm hỗ trợ, hàng đợi nhóm, nhận việc, chuyển nhóm, quản lý nhóm; menu «Góp ý / Báo lỗi» đổi thành «Hỗ trợ».
    // Có thay đổi cơ sở dữ liệu (migration 0100) — cần trien-khai sau day-len.
    // Số 2.1 là số TẠM (= main 2.0 + 1, lúc gộp main fc533d49 ngày 2026-10-15; trước đó nhánh dùng 1.97 tạm, nay main đã chiếm 1.97 và 2.0): phiên phát hành
    // kiểm lại cho đúng số kế tiếp ở main (bước A.0 của docs/HANDOFF-N1.md) — người thi công KHÔNG tự chốt số. Ngày là ngày dự kiến.
    version: "2.1",
    date: "2026-10-16",
    items: [
      { kind: "doi", text: "Mục Góp ý / Báo lỗi đổi tên thành Hỗ trợ. Khi gửi yêu cầu, bạn chọn nhóm nhận: Kỹ thuật, Kế toán, Nhân sự hoặc Điều hành." },
      { kind: "moi", text: "Thành viên nhóm hỗ trợ có tab Hàng đợi nhóm: xem yêu cầu gửi tới nhóm mình, lọc Của tôi hoặc Chưa ai nhận, bấm Nhận việc rồi đổi trạng thái." },
      { kind: "moi", text: "Trưởng nhóm chuyển được yêu cầu sang nhóm khác, kèm lý do. Nhóm mới không đọc ghi chú nội bộ của nhóm cũ." },
      { kind: "moi", text: "Người phụ trách hệ thống có tab Quản lý nhóm: tạo nhóm, ngưng nhóm, thêm hoặc gỡ thành viên, chọn Trưởng nhóm." },
      { kind: "doi", text: "Yêu cầu chỉ người gửi, nhóm nhận và người phụ trách hệ thống đọc được. Yêu cầu gửi Kế toán hoặc Nhân sự không hiện tiêu đề trong thư báo." },
    ],
  },
  {
    // Sửa chữ nút thẻ «Đơn nháp» ở Trang chủ (chủ chốt 2026-10-16, DAC-TA §10.7). Không migration, không đổi quyền ở máy chủ.
    // Số 2.0 do chủ dự án chốt (2026-10-16, «cho lên bản 2.0»), đánh dấu menu mới theo việc. Ngày là ngày dự kiến.
    version: "2.0",
    date: "2026-10-16",
    items: [
      { kind: "doi", text: "Trang chủ: thẻ Đơn nháp chỉ Quản trị có nút Xác nhận đơn, vai khác có nút Xem đơn nháp." },
    ],
  },
  {
    // Menu máy tính theo việc + khối Việc của bạn ở Trang chủ (chủ chọn bản dựng 14/10; đặc tả docs/superpowers/specs/2026-10-14-menu-may-tinh-viec-cua-ban/DAC-TA.md). Không migration, không đổi quyền.
    // Số 1.97 là số TẠM (= main 1.96 + 1, 2026-10-15): phiên phát hành kiểm lại cho đúng số kế tiếp ở main (bước A.0 của docs/HANDOFF-N1.md) — người thi công KHÔNG tự chốt số. Ngày là ngày dự kiến.
    version: "1.97",
    date: "2026-10-15",
    items: [
      { kind: "doi", text: "Menu bên trái trên máy tính gọn hơn, xếp theo việc: việc hằng ngày ở đầu, rồi Vận chuyển, Tiền; các mục cài đặt gom vào Thiết lập, bấm để mở hoặc thu gọn." },
      { kind: "moi", text: "Trang chủ trên máy tính có khối Việc của bạn: mỗi thẻ cho biết có bao nhiêu việc đang chờ (đơn nháp, đơn còn thiếu tiền, chuyến hôm nay…) kèm nút làm ngay." },
      { kind: "doi", text: "Xe & giấy tờ, Giá & chi phí mỗi mục gộp nhiều trang; mở ra thì đầu trang có dải nút chuyển nhanh sang trang cùng nhóm." },
      { kind: "doi", text: "Hoa hồng đối tác và Người bán dịch vụ chuyển vào nhóm Thiết lập; Điều chỉnh công nợ và Khoá sổ tháng nằm ở nhóm Tiền." },
      { kind: "moi", text: "Hướng dẫn viên có mục Đơn hàng trong menu, hiện các đơn mình đang phụ trách." },
    ],
  },
  {
    // Loại đối tác là dữ liệu (ADR-0117 lần 1; chủ duyệt 14/10: «duyệt gắn vai làm ADR-0117»): Kế toán/Quản trị/Toàn quyền thêm, tắt, bật loại đối tác trên màn Hoa hồng đối tác; nhân viên nội bộ không mang loại được hưởng hoa hồng.
    // Có thay đổi cơ sở dữ liệu (migration 0095) — cần trien-khai sau day-len.
    // Số 1.96 là số TẠM (= main 1.95 + 1, 2026-10-14): phiên phát hành kiểm lại cho đúng số kế tiếp ở main (bước A.0 của docs/HANDOFF-N1.md) — người thi công KHÔNG tự chốt số. Ngày là ngày dự kiến.
    version: "1.96",
    date: "2026-10-14",
    items: [
      { kind: "moi", text: "Kế toán thêm loại đối tác mới ngay ở trang Hoa hồng đối tác (ví dụ Nhân viên spa), tắt hoặc bật lại khi cần, rồi đặt mức hoa hồng cho loại đó." },
      { kind: "moi", text: "Quản trị gắn loại đối tác mới cho hồ sơ ở Danh bạ; trong ô chọn công việc, loại mới có thêm chữ \"(đối tác)\"." },
      { kind: "doi", text: "Nhân viên nội bộ không gắn được loại đối tác được hưởng hoa hồng; Nền tảng báo bằng một câu tiếng Việt." },
      { kind: "doi", text: "Loại đã tắt thì không gắn thêm cho hồ sơ nào; đơn đã xác nhận vẫn giữ nguyên hoa hồng đã chụp." },
    ],
  },
  {
    // Tạo đơn bốn bước + đổi chữ "Check-in" thành "Khách có mặt" (chủ duyệt 14/10: «chốt tên "Khách có mặt", làm bản bốn bước»); chỉ đổi cách bày và chữ hiện, không migration, dữ liệu gửi máy chủ giữ nguyên.
    // Số 1.95 là số TẠM (= main 1.94 + 1, 2026-10-14): phiên phát hành kiểm lại cho đúng số kế tiếp ở main (bước A.0 của docs/HANDOFF-N1.md) — người thi công KHÔNG tự chốt số. Ngày là ngày dự kiến.
    version: "1.95",
    date: "2026-10-14",
    items: [
      { kind: "doi", text: "Màn Tạo đơn chia bốn bước trên một trang: Khách, Dịch vụ, Thanh toán, Phụ trách. Thanh tiến độ ở đầu trang luôn dính; chạm tên bước để nhảy tới." },
      { kind: "doi", text: "Bước nào đủ thông tin thì hiện dấu ✓ trên thanh tiến độ; bước bạn đang xem được tô đậm." },
      { kind: "doi", text: "Thông tin khách hàng lên đầu trang, ngay dưới ngày khởi hành." },
      { kind: "doi", text: "Email, ghi chú khách, xe riêng, số chỗ tối thiểu gom vào nút \"Thêm chi tiết\"; đã có chữ hoặc lưu báo lỗi ở đó thì khối tự mở. Số hiệu chuyến bay vẫn hiện sẵn." },
      { kind: "doi", text: "Chặng đưa đón đã đủ giờ và nơi đón gập thành một dòng tóm tắt; chạm dòng đó để sửa." },
      { kind: "sua", text: "Bấm Tab hay Shift+Tab trên màn Tạo đơn: thanh tiến độ không còn che ô đang chọn. Chấm bước vừa bấm giữ được tô khi trang không cuộn thêm." },
      { kind: "doi", text: "Chữ \"Check-in\" đổi thành \"Khách có mặt\" ở ô nhập, trang đơn, Việc của tôi, tin báo đổi đơn và bản xác nhận gửi khách." },
      { kind: "doi", text: "Bản xác nhận gửi khách: dòng \"Đón khách\" thành \"Xe đón khách\", dòng \"Check-in\" thành \"Khách có mặt\"." },
      { kind: "doi", text: "Ô ngày khách có mặt chỉ hiện khi khác ngày khởi hành hoặc khi bấm \"Có mặt khác ngày\"." },
    ],
  },
  {
    // Sửa nút Gửi của màn Điều chỉnh công nợ + Trợ giúp theo vai cho màn đó (ADR-0115). Không migration. Số 1.94 = main 1.93 (sửa số khách, ADR-0114) + 1: số TẠM, phiên phát hành kiểm lại cho đúng số kế tiếp ở main (bước A.0 của docs/HANDOFF-N1.md).
    version: "1.94",
    date: "2026-10-13",
    items: [
      { kind: "sua", text: "Màn Điều chỉnh công nợ: nút Gửi yêu cầu không còn bị khoá xám sau khi gửi xong hoặc bị từ chối; gửi tiếp được ngay, không cần tải lại trang." },
      { kind: "moi", text: "Trợ giúp của Kế toán và Quản trị có thêm hướng dẫn Điều chỉnh công nợ: gửi, rút, duyệt, từ chối, và số dư chỉ đổi sau khi người thứ hai duyệt." },
    ],
  },
  {
    // Sửa số khách (ADR-0114): nhắc khuyến mại khi bớt khách, lịch sử số khách đủ dòng, mỗi đơn có ít nhất một người lớn. Không migration. Số 1.93 là số TẠM (= main 1.92 bản gộp D-1/ADR-0115 + 1, gộp main 277f5983 vào nhánh 2026-10-13): phiên phát hành kiểm lại cho đúng số kế tiếp ở main (bước A.0 của docs/HANDOFF-N1.md). Ngày là ngày dự kiến.
    version: "1.93",
    date: "2026-10-13",
    items: [
      { kind: "moi", text: "Đơn có giảm giá mà bớt khách: mục Thanh toán hiện thêm một câu màu đỏ nhắc Kế toán xem lại khuyến mại. Số tiền vẫn giữ nguyên, chỉ nhắc." },
      { kind: "moi", text: "Trang đơn có thêm phần Số khách qua các lần sửa, ghi số khách và tạm tính từ lúc xác nhận đến hiện tại. Chỉ hiện khi đơn đã sửa số khách." },
      { kind: "doi", text: "Mỗi đơn cần ít nhất một người lớn đi cùng, kể cả khi lưu nháp, xác nhận hay sửa số khách. Đơn nháp cũ chưa có người lớn thì thêm vào rồi mới lưu được." },
    ],
  },
  {
    // Bản gộp 2026-10-13: vá D-1 (lịch sử đơn của Đối tác theo danh sách cho phép), ADR-0115 đợt 1 (điều chỉnh công nợ cần người thứ hai duyệt, migration 0094) và vá khe «Đã giao» không hoa hồng (BL-HH-DA-GIAO-KHE). Số 1.92 = main 1.91 + 1 (số TẠM; ghép main 298f0c05 vào nhánh 2026-10-13): phiên phát hành kiểm lại cho đúng số kế tiếp ở main (bước A.0 của docs/HANDOFF-N1.md). Ngày là ngày dự kiến.
    version: "1.92",
    date: "2026-10-13",
    items: [
      { kind: "moi", text: "Điều chỉnh công nợ nay cần người thứ hai duyệt (Toàn quyền, Quản trị hoặc Kế toán, khác người tạo). Có màn Điều chỉnh công nợ và tin báo cho người duyệt." },
      { kind: "doi", text: "Yêu cầu điều chỉnh công nợ không ai quyết sau 7 ngày thì hết hạn; mức tăng nợ tối đa được tính cộng dồn qua các lần điều chỉnh, không tính riêng từng lần." },
      { kind: "sua", text: "Đối tác không còn thấy lý do nội bộ và tên người duyệt trong lịch sử đơn của mình." },
      { kind: "doi", text: "Tài khoản vừa là nhân viên vừa là Đối tác thấy lịch sử đơn rút gọn trên mọi đơn, kể cả đơn không phải của mình." },
      { kind: "sua", text: "Đơn có người hưởng hoa hồng không còn bấm được Đã giao sau khi bên đặt bị đổi vai; Nền tảng tính theo mức hoa hồng đã chụp lúc xác nhận đơn." },
    ],
  },
  {
    // Đợt 1 giao diện Tạo đơn trên điện thoại (bảng việc 13/10: #3, #4, #7, #8, #9 phần ô; gom "Đặt qua đối tác"); chỉ đổi cách vẽ, không migration. Số 1.91 là số TẠM (= nhánh 1.90 + 1, 2026-10-13):
    // chủ / phiên phát hành kiểm lại cho đúng số kế tiếp ở main (bước A.0 của docs/HANDOFF-N1.md) — người thi công KHÔNG tự chốt số.
    version: "1.91",
    date: "2026-10-13",
    items: [
      { kind: "doi", text: "Màn Tạo đơn gọn hơn trên điện thoại: tên ô nằm ngay trong ô thay vì một dòng riêng phía trên, bớt vài tiêu đề thừa." },
      { kind: "doi", text: "Ô chọn dịch vụ chỉ còn một nút \"Nhóm dịch vụ\" bấm xổ xuống, đánh dấu một hay nhiều nhóm; bỏ các nút lọc khác. Chạm vào ô là hiện cả danh sách." },
      { kind: "doi", text: "Dịch vụ bạn gắn ☆ ở đầu dòng nay được xếp lên trên cùng danh sách, để lần sau chọn cho nhanh." },
      { kind: "doi", text: "Ô \"Ngày đón\" của chặng đưa đón ẩn khi cùng ngày khởi hành. Cần đón khác ngày thì bấm \"Đón khác ngày\"." },
      { kind: "doi", text: "\"Khách tự đặt\" và \"Đặt qua đối tác\" nay là một hàng hai lựa chọn trong khối khách hàng." },
    ],
  },
  {
    // Sửa lỗi ô tìm của danh sách đơn (chữ tìm dài → báo lỗi hệ thống; D1 từ chối mẫu LIKE quá 50 byte). Số 1.90 là số TẠM (= main 1.89 + 1 lúc dựng lại 2026-10-13): phiên phát hành kiểm lại cho đúng số kế tiếp ở main (bước A.0 của docs/HANDOFF-N1.md).
    version: "1.90",
    date: "2026-10-13",
    items: [
      { kind: "sua", text: "Ô tìm ở danh sách đơn không còn báo lỗi hệ thống khi gõ chữ dài, ví dụ cả họ tên khách có dấu. Chữ quá dài thì Nền tảng tìm theo phần đầu." },
      { kind: "sua", text: "Ô tìm ở Danh bạ, Nhật ký, chọn người hưởng khi lập đơn và Lịch sử trợ lý cũng không còn báo lỗi hệ thống khi gõ chữ dài; chữ quá dài thì tìm theo phần đầu." },
    ],
  },
  {
    // Luật giá Thực tập (ADR-0100), không migration. Số 1.89 là số TẠM (= main 1.88 gói Vận chuyển A+C + 1, ghép main 94024872 vào nhánh 2026-10-13): nếu bản khác vào main trước thì đổi sang số kế tiếp (bước A.0 của docs/HANDOFF-N1.md). Ngày là ngày dự kiến.
    version: "1.89",
    date: "2026-10-13",
    items: [
      { kind: "doi", text: "Tài khoản Thực tập chỉ lập và xác nhận được đơn theo giá danh mục, không giảm giá. Cần giá khác thì nhờ nhân viên Bán hàng." },
      { kind: "doi", text: "Ở màn lập đơn, ô đơn giá và ô giảm giá của tài khoản Thực tập chỉ đọc, kèm một dòng giải thích." },
    ],
  },
  {
    // Gói Vận chuyển A + C (ADR-0104 Đ2, 0105, 0109, 0111, 0112, 0113; A4 tài xế nhà xe ngoài; C2 màn tài xế; C3 bảng điều phối), migration 0091–0093.
    // Số 1.88 = main 1.87 + 1 (ghép main 1c471990 vào nhánh gói A+C, 2026-10-12): mục 1.85 cũ của nhánh (chuyển khách giữa hai xe, đã đánh lại số) nằm trong mục này, không nhân đôi.
    version: "1.88",
    date: "2026-10-12",
    items: [
      { kind: "moi", text: "Màn tài xế có hai nút Chỉ đường cho mỗi điểm đón, điểm trả: Google Maps trên mọi máy, Apple Maps trên iPhone, iPad và Mac." },
      { kind: "moi", text: "Tài xế nhà xe ngoài dùng được Nền tảng: xem chuyến của mình, báo bận theo khung giờ và từ chối chuyến khi không nhận được." },
      { kind: "moi", text: "Tài xế không kịp tới một điểm đón có thể nhờ một xe khác cùng ngày đón giúp. Tài xế xe kia bấm Nhận hoặc Không nhận; chưa ai nhận thì khách vẫn ở xe cũ." },
      { kind: "moi", text: "Xe hỏng giữa đường: tài xế, hoặc văn phòng gửi thay, nhờ một xe đang chạy tới nơi gặp nhận cả khách trên xe lẫn khách đang chờ đón." },
      { kind: "moi", text: "Việc chuyển khách vượt số chỗ, sai cam kết xe riêng hoặc khi tắt tự đồng ý sẽ chờ Quản trị duyệt hoặc bác ở màn Đề nghị chuyển khách." },
      { kind: "moi", text: "Màn tài xế có khối Điểm kế tiếp, nút Kết thúc dính đáy màn hình, hỏi lại \"Đã đón N khách\" và đồng hồ chờ khi khách vắng." },
      { kind: "moi", text: "Bảng điều phối chọn được nhiều chặng cùng lúc, lọc chặng, hiện tổng khách chưa xếp và ghế trống, tô màu chuyến theo mức đầy." },
      { kind: "moi", text: "Văn phòng bấm \"Cập nhật khách / điểm theo đơn\" khi xe chưa chạy thì tài xế nhận tin báo ngay." },
      { kind: "doi", text: "Chuyến đã có khách được chuyển sang từ xe khác thì tài xế không bấm Từ chối chuyến được nữa." },
      { kind: "sua", text: "Bớt khách mà giảm giá lớn hơn tiền dịch vụ còn lại thì phải thu về 0 chứ không âm; khoản khách đã trả dư được ghi để hoàn." },
    ],
  },
  {
    // Sổ đại lý đợt 1 (ADR-0077/0078/0080), migration 0090. Số 1.87 là số TẠM (= 1.86 + 1 lúc soạn 2026-10-12): phiên phát hành kiểm lại cho đúng số kế tiếp ở main (bước A.0 của docs/HANDOFF-N1.md).
    version: "1.87",
    date: "2026-10-12",
    items: [
      { kind: "moi", text: "Kế toán đặt mức hoa hồng cho đối tác theo từng dịch vụ hoặc nhóm dịch vụ, và ghi rõ ai bán dịch vụ nào, ở hai mục mới dưới Quản trị." },
      { kind: "moi", text: "Đơn đặt qua đại lý hiện hoa hồng và giá đại lý theo mức đã đặt lúc xác nhận; Kế toán ghi mức riêng cho từng dòng khi chưa có mức." },
      { kind: "moi", text: "Đối tác thấy số tiền hoa hồng của chính mình trên đơn đặt qua mình. Nhân viên lập đơn chọn đại lý ở ô \"Đặt qua đối tác\"." },
      { kind: "moi", text: "Kế toán khoá sổ từng tháng đã qua; từ đó không ghi thêm tiền vào tháng đã khoá, và tháng đã khoá không mở lại được." },
      { kind: "doi", text: "Đơn đặt qua đại lý có hoa hồng chưa bấm được \"Đã giao\" cho tới bản cập nhật sau; hoa hồng vẫn hiện đủ trên đơn." },
    ],
  },
  {
    // QR thanh toán VietQR (ADR-0108) + mã giao dịch ngân hàng bắt buộc (ADR-0092 Đ6), migration 0087–0088. Chủ duyệt nhật ký 2026-10-08. Số 1.86 = main 1.85 + 1.
    version: "1.86",
    date: "2026-10-08",
    items: [
      { kind: "moi", text: "Trang đơn có nút \"QR thanh toán\": khách quét bằng ứng dụng ngân hàng là đúng số tiền và nội dung là mã đơn. Lưu được ảnh mã để gửi khách." },
      { kind: "moi", text: "Bấm \"Khách đã chuyển khoản\" dưới mã QR thì form ghi tiền tự điền sẵn số tiền, hình thức Chuyển khoản và người nhận Công ty." },
      { kind: "moi", text: "Kế toán xác nhận tiền chuyển khoản về công ty phải nhập mã giao dịch và số tiền thực chuyển như sao kê; một khoản chuyển không ghi được hai lần." },
      { kind: "doi", text: "Kế toán và người phụ trách hệ thống không còn ô trả trước ở màn tạo đơn; ghi khoản khách trả trước ở trang đơn, mục Thanh toán." },
    ],
  },
  {
    // Vòng focus của ô số bộ đếm (bị luật focus ô nhập của 1c718023 đè — a2-smoke-form bước 4b). Số 1.85 = main 1.84 + 1.
    version: "1.85",
    date: "2026-10-08",
    items: [
      { kind: "sua", text: "Ô số khách ở bộ đếm (màn tạo và sửa đơn) hiện lại viền đậm khi đang gõ, dễ thấy mình đang sửa ô nào." },
    ],
  },
  {
    // Năm lỗi tiền (TNV-G1 ADR-0089, F-03, TNV-G3 ADR-0088, TNV-G4 + TNV-VP01 ADR-0092), migration 0078–0083. Dựng lại 2026-10-06 lên trên bản 1.83 (Tốc độ đợt 1) đã vào main trước — số đổi thành 1.84 = main 1.83 + 1.
    version: "1.84",
    date: "2026-10-06",
    items: [
      { kind: "moi", text: "Huỷ đơn phải chọn lý do. Đơn huỷ không còn hiện \"còn lại\"; thông báo gửi khách ghi rõ khoản khách đã trả trước và khoản sẽ hoàn." },
      { kind: "moi", text: "Hoàn cọc đơn huỷ đi hai bước: Quản trị duyệt, Kế toán chi. Có thể chuyển tiền đã trả sang đơn mới của cùng khách." },
      { kind: "moi", text: "Kế toán có lệnh \"Thay lần thu\" để sửa lần thu ghi nhầm, kể cả sau Đã giao. Sau Đã giao không còn nút \"Đảo\"." },
      { kind: "doi", text: "Sau Đã giao, hoàn tiền cho khách tạm thời bị chặn tới khi có bước phân định trách nhiệm; báo Quản trị." },
      { kind: "sua", text: "Sổ tiền không còn bị âm hay trừ hai lần: không nộp và xác nhận cùng một khoản, không đảo lần thu đã hoàn, hoàn không quá số người trả đang giữ." },
      { kind: "sua", text: "Tiền của đơn đã xác nhận được khoá chặt; điều chỉnh sổ có giới hạn số tiền và cần lý do ít nhất 10 ký tự." },
    ],
  },
  {
    // Tốc độ đợt 1 (ADR-0102): trang không chờ tệp màu, gói giao diện gọn, quay lại app không tải lại, bớt một chặng chờ mỗi lời gọi, huy hiệu thanh bên nhẹ, Smart Placement. Số 1.83 = main 1.82 + 1.
    version: "1.83",
    date: "2026-10-05",
    items: [
      { kind: "sua", text: "Mở trang và chuyển màn nhanh hơn: trang không còn chờ tải màu giao diện, và mỗi trang nhẹ hơn nhiều nên tải xong sớm hơn." },
      { kind: "sua", text: "Quay lại ứng dụng (đổi tab, mở lại trên điện thoại) không còn tải lại toàn bộ dữ liệu khi kết nối vẫn tốt; để lâu quá 2 phút thì vẫn tải mới." },
      { kind: "sua", text: "Các con số nhỏ ở thanh bên máy tính (đơn chờ xác nhận, dịch vụ lệch giá) nay tải nhẹ hơn nhiều, nên mọi trang bớt chậm." },
      { kind: "doi", text: "Toàn quyền đổi màu giao diện công ty: máy khác sẽ thấy màu mới sau một đến hai lần chuyển trang, không còn thấy ngay." },
    ],
  },
  {
    // Làm nốt phát hiện của báo cáo kiểm tra giao diện 2026-09-23: giờ ở trang Góp ý theo giờ Việt Nam; bài src/gio-viet-nam-web.test.ts canh mọi chỗ định dạng ngày giờ. Số 1.82 = main 1.81 + 1 (nhánh khác nhập trước thì đánh lại số).
    version: "1.82",
    date: "2026-10-05",
    items: [
      { kind: "sua", text: "Giờ hiện ở trang Góp ý nay luôn theo giờ Việt Nam, kể cả khi máy đang đặt múi giờ khác." },
      { kind: "sua", text: "Trang Đăng nhập trên iPhone màn hình cao: thông tin công ty nằm sát đáy màn hình, không còn lơ lửng giữa trang hay bị lẹm mất một phần." },
    ],
  },
  {
    // Vận chuyển Đợt 7 — cam kết "xe riêng" / "xe tối thiểu N chỗ" trên chặng đưa đón (ADR-0056 VK3-A), migration 0077. Số 1.81 = main 1.80 + 1.
    version: "1.81",
    date: "2026-10-05",
    items: [
      { kind: "moi", text: "Chặng đưa đón có thêm hai ô: Xe riêng (không ghép khách khác) và Xe tối thiểu … chỗ. Nhãn XE RIÊNG và ≥ N chỗ hiện trên trang đơn và bảng điều phối." },
      { kind: "moi", text: "Bảng điều phối chặn ghép khách vào xe riêng, hoặc xếp khách vào xe nhỏ hơn số chỗ đã hứa. Quản trị vẫn cho phép được, kèm lý do." },
      { kind: "doi", text: "Chuyến đã được phá lệ cam kết mà sau đó hết vi phạm thì Nền tảng tự bỏ dấu phá lệ; kiểm định kỳ báo chuyến đã chạy trái cam kết mà chưa có phá lệ." },
    ],
  },
  {
    // Vận chuyển Đợt 5 tầng 3 — tài xế bổ sung tên khách (ADR-0052 D5b; chủ duyệt 5/10: chỉ tài xế công ty). Không migration. Số 1.80 = main 1.79 + 1.
    version: "1.80",
    date: "2026-10-05",
    items: [
      { kind: "moi", text: "Tài xế công ty bổ sung tên cho khách chưa có tên, ngay trên màn chuyến trong ngày chạy: hỏi khách, nhập họ tên và năm sinh." },
      { kind: "doi", text: "Chuyến bị giữ vì thiếu tên khách: màn của tài xế công ty chỉ chỗ tự bổ sung tên, không còn chỉ ghi văn phòng lo." },
    ],
  },
  {
    // Vận chuyển Đợt 5 "Xe đang chạy" (ADR-0052 D5), migration 0076. Số 1.79: gộp sau Đợt 4 (1.78, 5/10) — Đợt 4 lên main trước.
    version: "1.79",
    date: "2026-10-05",
    items: [
      { kind: "moi", text: "Xe đang chạy: văn phòng thêm khách của đơn khác vào xe đang chạy. Khách đặt gấp thì thêm ngay; khách khác cần Quản trị phá lệ." },
      { kind: "moi", text: "Văn phòng báo khách huỷ khi xe đang chạy: tài xế thấy giờ báo và lý do, ghế vẫn giữ tới khi tài xế bấm Khách đã huỷ." },
      { kind: "doi", text: "Cập nhật điểm theo đơn dùng được cả khi xe đang chạy, cho khách còn chờ ở điểm xe chưa tới." },
      { kind: "moi", text: "Tài xế đang lái nhận thông báo khi văn phòng thêm khách, báo khách huỷ hoặc đổi điểm đón." },
      { kind: "moi", text: "Trang Xe đang chạy (menu Vận chuyển): mọi xe đang chạy, bấm vào để thêm khách, báo huỷ hay cập nhật điểm." },
      { kind: "moi", text: "Xe hỏng: văn phòng bấm Cứu hộ để kết thúc gián đoạn, rồi thấy ngay khách cần chuyển và xe cùng ngày để xếp sang, hoặc tạo chuyến cứu hộ." },
    ],
  },
  {
    // Vận chuyển Đợt 4 — tiền xe thuê (ADR-0057 T1 + T2, migration 0072, 0073). MỘT mục cho cả đợt (máy chủ + giao diện cùng một bản phát hành — Cần chủ 2 = A).
    // Đánh số: 1.71 → 1.74 (gộp origin/main e0d62688) → 1.78 = main 1.77 + 1 (gộp origin/main ffed6f1c, 5/10). Bốn dòng cuối: phần giao diện G0–G5 (đã thêm 2/10).
    version: "1.78",
    date: "2026-10-05",
    items: [
      { kind: "moi", text: "Kế toán, Quản trị có Bảng giá thuê xe: giá mỗi chuyến của từng nhà xe theo cả tuyến và cỡ xe, có ngày hiệu lực." },
      { kind: "moi", text: "Chuyến xe của nhà xe đối tác có chi phí: máy tự lấy giá trong bảng giá lúc xếp xe; đổi xe, tuyến hoặc ngày chạy thì máy tính lại." },
      { kind: "doi", text: "Chuyến xe thuê chưa có giá thì chưa được xuất bến — Kế toán hoặc Quản trị nhập giá bảng hoặc giá thoả thuận với nhà xe." },
      { kind: "moi", text: "Kế toán, Quản trị điều chỉnh chi phí từng chuyến có lý do và xem bảng kê chi phí xe thuê theo nhà xe." },
      { kind: "moi", text: "Menu Vận chuyển có thêm hai mục Bảng giá thuê xe và Bảng kê chi phí xe (máy tính: thanh bên; điện thoại: trang Tôi)." },
      { kind: "moi", text: "Trang chi tiết chuyến có khối Chi phí chuyến cho Kế toán, Quản trị: nhập giá thoả thuận, lấy lại giá bảng, điều chỉnh, đảo dòng ghi sai." },
      { kind: "moi", text: "Tạo và sửa chuyến có ô chọn tuyến." },
      { kind: "doi", text: "Thanh menu bên trái trên máy tính nay cùng màu nền trang, có đường viền mảnh." },
    ],
  },
  {
    // Trợ giúp: bỏ câu "chưa dùng Điều phối cho chuyến thật" (lý do cũ — chưa có màn nhập tên khách — đã hết từ 1.62); thêm Lịch xe bận, ba nhóm cuốc,
    // thông báo tài xế. Chủ 2/10: "Nếu đã đủ điều kiện để điều xe thật thì cập nhật trong Trợ giúp". Chỉ chữ hướng dẫn: không migration, không đổi máy chủ.
    version: "1.77",
    date: "2026-10-02",
    items: [
      { kind: "doi", text: "Trợ giúp: Điều phối xe dùng được cho chuyến thật khi xe, tài xế và đơn đã đủ điều kiện; bỏ lời dặn cũ \"chưa dùng cho chuyến thật\"." },
      { kind: "doi", text: "Trợ giúp Bán hàng có các bước tạo chuyến và xếp khách; Quản trị có mục Lịch xe bận." },
      { kind: "doi", text: "Trợ giúp Tài xế: cuốc chia ba nhóm Hôm nay, Ngày mai, Ngày kia; bật thông báo để được báo khi được xếp chuyến." },
    ],
  },
  {
    // Đợt 0 luồng L — lớp chống ghi trùng chung (ADR-0094, bản mở rộng), migration 0074. Đánh lại 1.71 → 1.76 lúc gộp main a6fd0a3d (1.75 Vận chuyển Đợt 3).
    // Cần khoá LAN_GUI_SECRET trên Cloudflare TRƯỚC khi triển khai (chủ đã đặt 2/10; npm run trien-khai tự kiểm).
    version: "1.76",
    date: "2026-10-02",
    items: [
      { kind: "sua", text: "Mất mạng ngay sau khi bấm Lưu, Lập đơn hay Ghi lần thu rồi bấm lại: Nền tảng không ghi thêm lần nữa, báo \"Lần bấm trước đã được ghi\" và mở đúng đơn." },
      { kind: "sua", text: "Bấm đúp nút lưu cũng chỉ ghi một lần." },
      { kind: "doi", text: "Nếu bấm lại trong lúc lần trước còn đang được xử lý, Nền tảng tự chờ vài giây rồi mới báo kết quả." },
    ],
  },
  {
    // Vận chuyển Đợt 3 — Lịch xe bận (khung bận của xe) + nhắc giờ lái (ADR-0055 VK2-A, VK2-B), migration 0071. Đánh lại 1.75 lúc gộp (chủ chọn A 2/10: Đợt 3 lên
    // trước, sau 1.74 quyền tiền của main; Đợt 4 tiền xe thuê chờ Kế toán ký sổ vàng). Câu chữ theo lời chủ 2/10 (câu 3.1–3.4 theo khuyến nghị).
    version: "1.75",
    date: "2026-10-02",
    items: [
      { kind: "moi", text: "Trang mới Vận chuyển › Lịch xe bận: Quản trị xem lịch bận của mọi xe theo tuần, cùng các chuyến đã xếp." },
      { kind: "moi", text: "Thêm lịch xe vào xưởng (bảo dưỡng, đăng kiểm, sửa chữa), ghi được nhiều ngày một lần. Trong giờ đó máy không cho xếp chuyến cho xe." },
      { kind: "moi", text: "Xe ra xưởng sớm thì bấm dấu ✕ trên lịch để rút lịch bận. Lịch bận không ghi chồng lên chuyến đã xếp — máy báo mã chuyến cần dời hoặc đổi xe trước." },
      { kind: "moi", text: "Điều phối xe hiện dải “Xe bận” trên hàng của xe trong ngày." },
      { kind: "moi", text: "Điều phối xe và Chi tiết chuyến nhắc khi tài xế lái quá 8 giờ một ngày hoặc chuyến dài quá 4 giờ — chỉ nhắc, không chặn." },
      { kind: "moi", text: "Toàn quyền đổi hai con số giờ lái ở Chính sách điều phối." },
    ],
  },
  {
    // Đợt 0 luồng Q — ADR-0090 (quyền tiền chỉ Toàn quyền), migration 0075 (chỉ một view). Số 1.74 = main 1.73 + 1 (đánh lại lúc gộp main e0d62688).
    // Đã kiểm lúc gộp Đợt 3 (production 1.73).
    version: "1.74",
    date: "2026-10-02",
    items: [
      { kind: "doi", text: "Tài khoản Kế toán nay chỉ người phụ trách hệ thống (Toàn quyền) được tạo, gán vai Kế toán, cộng quyền Kế toán và đặt lại PIN." },
      { kind: "doi", text: "Quản trị vẫn đổi tên, ngưng và mở khoá đăng nhập cho tài khoản Kế toán như trước; nút Đặt lại PIN không còn hiện ở dòng Kế toán." },
      { kind: "moi", text: "Khi một tài khoản Kế toán bị ngưng, người phụ trách hệ thống nhận thông báo trong mục Của tôi." },
    ],
  },
  {
    // Trang chủ Quản trị và Toàn quyền theo bản vẽ Claude Design "Trang chu Quan tri.dc.html" (2/10). Chỉ giao diện: không migration, không đổi máy chủ.
    version: "1.73",
    date: "2026-10-02",
    items: [
      { kind: "doi", text: "Trang chủ máy tính gọn hơn: bỏ lưới mọi chức năng ở lời chào (đã có ở thanh bên). Bên phải có thẻ Lối tắt 7 ô, ô Tất cả mở bảng mọi chức năng." },
      { kind: "doi", text: "Bốn con số đầu ca xếp một hàng: Còn thiếu tiền, Chờ xác nhận, Chưa phụ trách, Doanh thu tuần của tôi (kèm biểu đồ)." },
      { kind: "moi", text: "Cần xem lại có thêm dòng giấy tờ sắp hết hạn (Quản trị, Toàn quyền). Lời chào ghi số chuyến đón hôm nay và số việc cần xem lại." },
      { kind: "doi", text: "Điện thoại: lời chào theo buổi kèm vai của bạn; hàng ô chức năng chỉ còn những gì chưa có ở thanh dưới; Cần xem lại đứng trước Chuyến đón." },
    ],
  },
  {
    // Thị giác toàn Nền tảng "Năng động – Tin cậy – Tinh tế" (đặc tả docs/superpowers/specs/2026-10-02-thi-giac-nen-tang-design.md, chủ duyệt hướng A 2/10).
    // Chỉ giao diện: không migration, không đổi máy chủ. Số 1.70 = main 1.69 (Vận chuyển Đợt 2) + 1 — đánh lại lúc gộp main e7cd764f. KIỂM LẠI LÚC GỘP.
    version: "1.70",
    date: "2026-10-02",
    items: [
      { kind: "doi", text: "Giao diện làm mới cho cả Nền tảng: nền trang xám xanh nhẹ, các thẻ có bóng mềm, ô nhập rõ viền hơn. Bố cục và cỡ chữ giữ nguyên." },
      { kind: "doi", text: "Nút lưu, xác nhận chính (cuối form, trong bảng trượt, nút Đăng nhập) nay đặc màu xanh biển, dễ nhận ra. Các nút khác vẫn nền nhạt." },
      { kind: "doi", text: "Thêm màu xanh ngọc cho mục đang chọn ở thanh bên và ô đang gõ. Ô chức năng ở Trang chủ tô màu theo nhóm, nhóm Vận chuyển màu ngọc." },
      { kind: "doi", text: "Điện thoại: nút tròn Tạo đơn ở thanh dưới đặc màu san hô; thanh dưới trong mờ như kính." },
      { kind: "sua", text: "Đầu trang chi tiết đơn: số tiền Còn lại trước đây rất khó đọc, nay là chữ vàng trên dải màu xanh đậm." },
      { kind: "doi", text: "Rê chuột hay bấm vào thẻ, nút có hiệu ứng nhẹ. Máy đặt Giảm chuyển động thì hiệu ứng tự tắt." },
    ],
  },
  {
    // Vận chuyển Đợt 2 — tin báo + Bảng tin khi chuyến xe đổi (ADR-0052 D6), migration 0070 (chỉ một view). Số 1.69 TẠM — điều phối đánh lại lúc gộp.
    version: "1.69",
    date: "2026-10-02",
    items: [
      { kind: "moi", text: "Tài xế nhận thông báo khi được xếp lái, bị đổi sang người khác, chuyến bị sửa hoặc bị huỷ." },
      { kind: "moi", text: "Văn phòng nhận thông báo khi một chuyến kết thúc giữa chừng, hoặc có khách vắng ở đơn mình lập hay phụ trách." },
      { kind: "moi", text: "Màn Điều phối xe, Chi tiết chuyến và Cuốc của tôi tự cập nhật khi chuyến thay đổi, không cần tải lại trang." },
    ],
  },
  {
    // Trang chủ máy tính theo bản vẽ "Trang chu may tinh v2.dc.html" (Claude Design 2026-10-02). Không migration, không đổi máy chủ.
    // Số 1.68 = main 1.67 + 1. KIỂM LẠI LÚC GỘP (nhánh khác gộp trước thì đánh lại số).
    version: "1.68",
    date: "2026-10-02",
    items: [
      { kind: "doi", text: "Trang chủ trên máy tính làm mới: lời chào, ngày và mọi chức năng bạn được dùng hiện thành ô vuông chia theo nhóm ngay đầu trang." },
      { kind: "doi", text: "Chuyến đón có dòng thời gian trong ngày: chuyến kế tiếp ghi \"Sắp tới\" và số phút còn lại, chuyến đã qua giờ hiện chữ xám." },
      { kind: "doi", text: "Bốn con số và biểu đồ doanh thu tuần gom vào một thẻ bên phải; chuyến đã trả đủ hiện chữ Đủ tiền." },
      { kind: "doi", text: "Bảng Tất cả chức năng trên điện thoại: tên nhóm viết chữ thường; Toàn quyền có thêm ô Giao diện." },
    ],
  },
  {
    // Thanh sáng + chữ mảnh (thanh-sang-chu-manh) + Giao diện công ty (ADR-0087, migration 0069). Số 1.67 = main 1.66 + 1. KIỂM LẠI LÚC GỘP.
    version: "1.67",
    date: "2026-10-02",
    items: [
      { kind: "doi", text: "Giao diện nhẹ hơn: thanh bên trái, thanh trên cùng và đầu Trang chủ điện thoại chuyển nền trắng; nút chính nền xanh nhạt; chữ toàn app mảnh hơn." },
      { kind: "doi", text: "Trên iPhone, giờ và pin ở trên cùng chuyển sang chữ đen. Nếu vẫn thấy thanh màu xanh cũ, hãy đóng hẳn app rồi mở lại." },
      { kind: "moi", text: "Toàn quyền đổi được màu nền, thanh, nút, phông và cỡ chữ của cả app ở Tôi → Giao diện; mọi người thấy ở lần mở trang kế tiếp." },
      { kind: "doi", text: "Thanh trên cùng bản máy tính đổi màu theo cài đặt giao diện, giống thanh trên điện thoại." },
    ],
  },
  {
    // Trang chủ điện thoại theo bản vẽ "Trang chu dien thoai.dc.html" (Claude Design 2026-09-30, 1a–1g). Không migration, không đổi máy chủ.
    // Số "1.66" = main 1.65 (Vận chuyển đợt 1) + 1 (gộp main 2026-10-02). KIỂM LẠI LÚC GỘP (nhánh khác gộp trước thì đánh lại số).
    version: "1.66",
    date: "2026-10-02",
    items: [
      { kind: "doi", text: "Trang chủ trên điện thoại làm mới: lời chào, ô tìm đơn ở đầu trang và lưới ô vuông mở nhanh mọi chức năng bạn được dùng (nhiều chức năng thì có ô Tất cả)." },
      { kind: "doi", text: "Bốn con số Còn thiếu, Doanh thu, Chờ xác nhận, Chưa phụ trách gom vào một thẻ; chuyến đón đã trả đủ hiện chữ Đủ tiền. Máy tính giữ nguyên." },
    ],
  },
  {
    // Đợt 1 Vận chuyển còn lại (kế hoạch docs/superpowers/plans/2026-10-01-van-chuyen-con-lai-01-viec-nho.md): ADR-0056 VK3-B, đổi thứ tự điểm, mốc nhắc, người đi kèm.
    // Có migration 0068. Số "1.65" = main 1.64 + 1 — kiểm lại lúc gộp (nhánh khác gộp trước thì đánh lại số).
    version: "1.65",
    date: "2026-10-02",
    items: [
      { kind: "moi", text: "Xe đã có một loại giấy tờ đang dùng thì không \"Thêm\" loại đó nữa — bấm \"Gia hạn\" hoặc \"Sửa sai\"; form Thêm chỉ hiện loại chưa có." },
      { kind: "moi", text: "Chi tiết chuyến: văn phòng đổi được thứ tự các điểm chưa tới khi xe đang chạy (nút lên / xuống)." },
      { kind: "moi", text: "Giấy tờ sắp hết hạn: Toàn quyền đổi được số ngày nhắc trước (nút \"Đổi mốc nhắc\"); nhãn hạn giấy tờ cá nhân theo đúng số này." },
      { kind: "moi", text: "Chi tiết chuyến: gắn hướng dẫn viên đi kèm lên xe; tên hiện ở Chi tiết chuyến và màn tài xế. Người đi kèm có nút \"Đã lên xe\" / \"Đã xuống\"." },
      { kind: "doi", text: "Chuẩn bị cho bản sau: máy chủ ghi nhận máy nào còn dùng ứng dụng bản cũ khi lưu đơn (không ghi thông tin khách)." },
    ],
  },
  {
    // Có migration 0067 (ADR-0085). Số "1.64" = main 1.63 + 1 (đánh lại lúc gộp main 1.63, 2026-10-01; trước ghi 1.62). KIỂM LẠI LÚC GỘP (nhánh khác gộp trước thì đánh lại số).
    version: "1.64",
    date: "2026-10-01",
    items: [
      { kind: "moi", text: "Toàn quyền đặt được quyền nào chỉ đăng nhập một máy, quyền nào được nhiều máy, ở trang Phiên đăng nhập → Chính sách đăng nhập." },
      { kind: "doi", text: "Chuyển một quyền về Một máy thì các máy thừa đăng xuất ngay, giữ máy đăng nhập gần nhất. Đổi vai của một người cũng có thể đăng xuất máy thừa của họ." },
    ],
  },
  {
    // Nợ nhỏ sau 1.62 (Đưa đón + Hành khách): PM-1, PM-2, số hiệu chuyến bay trên điều phối / thẻ tài xế, "Người đổi" ở lịch sử mẫu chặng, đơn vị bằng chữ ở Danh mục.
    // Không migration. Số "1.63" = main 1.62 + 1 (2026-10-01).
    version: "1.63",
    date: "2026-10-01",
    items: [
      { kind: "sua", text: "Danh sách hành khách hiện đúng thứ tự đã nhập." },
      { kind: "sua", text: "Hai người cùng sửa một đơn nháp: người lưu sau được báo \"đơn vừa được cập nhật — tải lại\" thay vì báo lỗi khó hiểu." },
      { kind: "moi", text: "Bảng điều phối và thẻ chuyến của tài xế hiện số hiệu chuyến bay (✈︎) ở chặng đón." },
      { kind: "moi", text: "Danh mục: lịch sử cài đưa đón có cột \"Người đổi\"." },
      { kind: "sua", text: "Danh mục hiện đơn vị bằng chữ (\"theo người\", \"theo nhóm 5 khách\") thay cho mã kỹ thuật." },
    ],
  },
  {
    // ADR-0047 Phần B (giao diện Đưa đón + Hành khách theo bản vẽ Claude Design của chủ 1/10) + màn mẫu chặng ADR-0054/0076 + cảnh báo sớm (chủ "2 — Có").
    // Không migration. Số "1.62" = main 1.61 + 1 (đánh lại lần năm lúc gộp main 1.61 — Mai in đậm, 2026-10-01; trước ghi 1.57–1.61).
    version: "1.62",
    date: "2026-10-01",
    items: [
      { kind: "moi", text: "Form đơn có khối \"Đưa đón\": chiều đi, chiều về, ngày giờ đón, nơi đón, nơi trả, số hiệu chuyến bay, số người chiều về." },
      { kind: "moi", text: "Form đơn có khối \"Hành khách\": họ tên và năm sinh từng người — cần đủ trước khi xe chạy." },
      { kind: "moi", text: "Dịch vụ có đưa đón tự tạo sẵn chiều đi, chiều về và nơi trả gợi ý; sửa hoặc bỏ được." },
      { kind: "moi", text: "Chi tiết đơn có \"Sửa đưa đón\" và \"Sửa danh sách\" cho đơn đã xác nhận." },
      { kind: "moi", text: "Danh mục: Quản trị cài mỗi dịch vụ đưa đón mấy chiều, giờ về và nơi trả gợi ý." },
      { kind: "moi", text: "Nhắc sớm khi xác nhận đơn và khi xếp xe nếu còn thiếu nơi trả hoặc tên khách; vẫn làm tiếp được." },
    ],
  },
  {
    // Yêu cầu chủ 2026-10-01: Mai in đậm tên nút / đường điều hướng bằng cặp ** (luật 9 mới + dòng định dạng máy chủ nối); khung chat, ô thử, lịch sử hiện chữ đậm.
    // Số "1.61" = main 1.60 (đổi tên Loại giấy tờ cá nhân) + 1 — đánh lại lúc gộp main b8032a45 (thi công ghi 1.60).
    version: "1.61",
    date: "2026-10-01",
    items: [
      { kind: "moi", text: "Mai in đậm đúng tên nút và đường đi trong app, ví dụ: bấm Lưu thông tin; vào Danh bạ › Hồ sơ mới, để bạn dễ nhìn từng bước." },
      { kind: "doi", text: "Toàn quyền: bản lời nhắc tự lưu vẫn dùng được, máy chủ tự thêm một dòng cho phép Mai in đậm tên nút." },
    ],
  },
  {
    // Chủ dự án 2026-10-01: đổi tên trang "Loại giấy tờ người" → "Loại giấy tờ cá nhân" (chỉ đổi chữ; đường dẫn /loai-giay-to-nguoi giữ nguyên). Không migration. Số "1.60" = main 1.59 + 1 (đánh lại lúc gộp main 1.59 — trợ lý Mai, 2026-10-01).
    version: "1.60",
    date: "2026-10-01",
    items: [
      { kind: "doi", text: "Trang \"Loại giấy tờ người\" đổi tên thành \"Loại giấy tờ cá nhân\" (căn cước, bằng lái, khám sức khoẻ, tập huấn). Nội dung không đổi." },
    ],
  },
  {
    // Khung Hỗ trợ: biểu tượng đổi cỡ, bong bóng "đang trả lời", chữ gợi ý; ô thử báo riêng khi mẫu AI hết token cho phần suy nghĩ.
    // ADR-0084 (trợ lý Mai gọi tên, ô Giới tính): có migration 0066 (main đã có 0065_aut_session).
    // Số "1.59" = main 1.58 (ADR-0075 sổ phiên) + 1 — đánh lại lúc gộp main fe3d73f4 (2026-10-01; thi công ghi 1.57, rồi 1.58). Nhánh khác gộp trước thì đánh lại số.
    version: "1.59",
    date: "2026-10-01",
    items: [
      { kind: "moi", text: "Trợ lý tên Mai: gọi bạn là \"anh/chị + tên\" theo ô Giới tính mới trong hồ sơ người và xưng \"em\"; chưa ghi giới tính thì gọi \"bạn\"." },
      { kind: "moi", text: "Khung Hỗ trợ: khi bạn gửi câu hỏi, hiện ngay ba chấm nhấp nháy kèm chữ \"Mai đang trả lời…\" cho đến khi có câu trả lời." },
      { kind: "doi", text: "Khung Hỗ trợ: nút đổi cỡ đổi sang biểu tượng hai mũi tên chéo, ô gõ ghi \"Hãy hỏi Mai tại đây nhé!\"." },
      { kind: "doi", text: "Khung Hỗ trợ bỏ hai dòng nhắc nhỏ (vẫn có ở Trợ giúp). Nút \"Về góc\" trả cả vị trí lẫn cỡ về mặc định và nháy viền để biết đã nhận." },
      { kind: "sua", text: "Toàn quyền: khi mẫu AI dùng hết số token cho phần suy nghĩ nên chưa viết được câu trả lời, ô thử nói rõ và chỉ cách chỉnh." },
    ],
  },
  {
    // ADR-0075 Phần A (sổ phiên đăng nhập, mỗi tài khoản một máy). Có migration 0065. Cookie phiên đổi định dạng ⇒ mọi người đăng nhập lại một lần.
    // Số "1.58" = main 1.57 + 1 (đánh lại lúc gộp main 1.57, 2026-10-01; thi công ghi 1.54, migration thi công ghi 0061).
    version: "1.58",
    date: "2026-10-01",
    items: [
      { kind: "doi", text: "Mỗi tài khoản chỉ đăng nhập trên một máy (trừ IT và Toàn quyền). Đăng nhập máy mới thì máy cũ tự đăng xuất, kèm lời báo lúc nào." },
      { kind: "doi", text: "Sau bản này mọi người cần đăng nhập lại một lần." },
      { kind: "moi", text: "Trang Tôi có mục \"Phiên đăng nhập của tôi\": xem mình đã đăng nhập trên máy nào, lúc nào." },
      { kind: "moi", text: "IT và Toàn quyền có trang \"Phiên đăng nhập\": xem ai đang đăng nhập trên máy nào, gỡ phiên, hoặc gỡ phiên kèm đặt lại PIN." },
    ],
  },
  {
    // ADR-0083 (nợ rà soát vai ↔ quyền): gán quyền kiểu cũ chỉ Toàn quyền + chặn tài khoản lai; xem đủ số giấy tờ chỉ Toàn quyền; đổi tên vai Tài xế taxi.
    // Có migration 0063. Số "1.57" = main 1.56 + 1 (đánh lại lúc gộp main 1.56 — trợ lý tìm theo nghĩa, 2026-10-01; thi công ghi 1.56).
    version: "1.57",
    date: "2026-10-01",
    items: [
      { kind: "doi", text: "Quản trị không còn xem đủ số giấy tờ (căn cước, bằng lái): vẫn thấy số đã che, vẫn thêm, gia hạn, sửa sai. Cần số đầy đủ thì nhờ người phụ trách hệ thống." },
      { kind: "doi", text: "Vai \"Tài xế taxi\" đổi tên thành \"Tài xế taxi (giới thiệu khách)\" cho khỏi nhầm với \"Tài xế đối tác\" (người lái chuyến). Quyền không đổi." },
      { kind: "doi", text: "Màn Sửa tài khoản: khối \"Quyền cũ\" (tài khoản chưa gán vai) chỉ người phụ trách hệ thống thấy. Quản trị và Hành chính nhân sự đổi quyền bằng cách gán vai." },
      { kind: "doi", text: "Một tài khoản không còn giữ cùng lúc quyền nội bộ và quyền đối tác, dù gán theo vai hay theo cách cũ: ô cộng tay tạo kiểu lai này bị khoá." },
    ],
  },
  {
    // ADR-0082 (trợ lý tìm đoạn hướng dẫn theo nghĩa trộn từ khoá). Số "1.56" = main 1.55 + 1 lúc thi công (2026-10-01); nhánh khác gộp trước thì đánh lại số.
    // Có migration 0062 (số tạm).
    version: "1.56",
    date: "2026-10-01",
    items: [
      { kind: "doi", text: "Trợ lý Hỗ trợ tìm đúng phần hướng dẫn hơn khi bạn hỏi bằng lời của mình, không cần gõ đúng tên nút hay tên mục." },
      { kind: "moi", text: "Toàn quyền: ô thử ở trang Trợ lý Hỗ trợ cho xem trợ lý đã dùng những đoạn hướng dẫn nào để trả lời." },
    ],
  },
  {
    // Chủ dự án 2026-10-01: giữ luật "không tự đổi quyền của chính mình", sửa màn hình báo trước, không lưu nửa chừng. Không migration. Số tạm — nhánh khác gộp trước thì đổi.
    version: "1.55",
    date: "2026-10-01",
    items: [
      { kind: "sua", text: "Sửa tài khoản của chính mình: nếu vai vừa chọn làm đổi quyền của bạn, app báo ngay và không lưu gì, thay vì lưu tên rồi mới báo lỗi." },
    ],
  },
  {
    // ADR-0073 (trợ lý bộ não tuỳ biến, ô thử, nhớ 3 lượt, ẩn số tiền). Số "1.54" = main 1.53 + 1 (đánh lại lúc gộp main 1.53, 2026-10-01; thi công ghi 1.53). Có migration 0060.
    version: "1.54",
    date: "2026-10-01",
    items: [
      { kind: "moi", text: "Trợ lý Hỗ trợ nhớ vài câu vừa hỏi trong cùng cuộc trò chuyện, nên hỏi tiếp \"còn trên điện thoại thì sao\" vẫn hiểu. Bấm \"Cuộc trò chuyện mới\" để bắt đầu lại." },
      { kind: "doi", text: "Trợ lý trả lời tự nhiên hơn: câu chưa rõ thì hỏi lại; việc hướng dẫn chưa nói thì nói thật, chỉ chỗ gần nhất hoặc mời gửi Góp ý." },
      { kind: "doi", text: "Trợ lý không nêu số tiền trong câu trả lời — chỗ có số tiền hiện \"[đã ẩn số tiền]\"." },
      { kind: "moi", text: "Toàn quyền: trang Trợ lý Hỗ trợ có mục Bộ não — chọn mẫu AI kèm giá, sửa lời nhắc, xem lịch sử bản, thử câu hỏi trước khi lưu." },
    ],
  },
  {
    // Phần máy chủ "ô mới của chặng" (ADR-0054 D10.1/D10.3, ADR-0055 VK2-C, ADR nháp nơi trả mặc định — chủ duyệt Q-D 1/10). Có migration 0058, 0059.
    // Giao diện chưa làm (chờ bản vẽ Claude Design) — người dùng chưa thấy ô mới trên màn hình.
    version: "1.53",
    date: "2026-10-01",
    items: [
      { kind: "moi", text: "Chuẩn bị cho màn nhập khách: mỗi chặng đưa đón lưu được số hiệu chuyến bay và số người chiều về; màn nhập sẽ có ở bản sau." },
      { kind: "moi", text: "Chuẩn bị cho Danh mục: Quản trị sẽ cài được chiều đón và nơi trả gợi ý theo từng dịch vụ đưa đón." },
    ],
  },
  {
    // ADR-0071 (vai Hành chính nhân sự, gỡ đồng bộ nhân viên từ Sheet, bảo trì miễn trừ theo Toàn quyền) + đồng hồ bảo trì theo ngày (commit 3de1435f).
    // Số "1.52" = số lớn nhất trên nhánh + 1 lúc thi công (2026-10-01); nhánh khác gộp trước thì đánh lại số. Có migration 0057.
    version: "1.52",
    date: "2026-10-01",
    items: [
      { kind: "moi", text: "Vai mới \"Hành chính nhân sự\": người giữ vai này tạo tài khoản cho nhân viên, đối tác, tài xế đối tác ở trang Quản lý tài khoản." },
      { kind: "doi", text: "Quản trị không còn nút \"Thêm tài khoản\"; vẫn sửa, ngưng, gán vai, đặt lại PIN, mở khoá cho tài khoản cấp dưới." },
      { kind: "doi", text: "Bỏ nạp danh sách nhân viên từ Google Sheet; tài khoản mới chỉ tạo trong app. Danh mục dịch vụ vẫn đồng bộ từ Sheet như cũ." },
      { kind: "doi", text: "Chế độ bảo trì: khi bật, mọi người trừ tài khoản Toàn quyền đều thấy màn hình bảo trì, kể cả Quản trị." },
      { kind: "doi", text: "Đồng hồ bảo trì còn từ một ngày trở lên hiện dạng \"3 ngày 5 giờ 10 phút\"." },
      { kind: "doi", text: "Dải nhắc bảo trì đổi chữ: \"Đang ở chế độ bảo trì — chỉ tài khoản Toàn quyền dùng được\"." },
      { kind: "doi", text: "Vai Giám đốc nay chỉ có quyền Quản trị, không còn mặc định Toàn quyền. Cần thêm việc kỹ thuật hay kế toán thì người phụ trách hệ thống cộng tay, kèm lý do." },
      { kind: "sua", text: "Menu, trang và nút ẩn/hiện theo cùng bảng quyền với máy chủ: tài khoản chỉ có Toàn quyền hoặc chỉ có Nhân sự thấy đúng mục mình làm được." },
      { kind: "doi", text: "Thêm tài khoản: nếu bạn không xem được Danh bạ, hồ sơ trùng chỉ báo \"đã có trong Danh bạ\", không hiện tên; vẫn tạo được hồ sơ mới." },
    ],
  },
  {
    // Gộp hồ sơ cá nhân trùng (ADR-0068). Số "1.51" chốt lúc gộp main 1.49 (nhánh phat-hanh-1-50 đã nhận 1.50 — ai gộp sau đánh lại số). Có migration 0056.
    version: "1.51",
    date: "2026-10-01",
    items: [
      { kind: "moi", text: "Danh bạ: Quản trị gộp được hai hồ sơ của cùng một người — xem trước phần chuyển sang, gõ lại tên rồi gộp. Không tách lại được." },
      { kind: "moi", text: "Danh bạ có mục \"Hồ sơ nghi trùng\": các cặp trùng số điện thoại hoặc họ tên để Quản trị rà và gộp." },
      { kind: "doi", text: "Thêm tài khoản: nếu đã có hồ sơ trùng số hoặc tên, app liệt kê để chọn dùng hồ sơ có sẵn thay vì tạo hồ sơ mới." },
    ],
  },
  {
    // Bản 1.49 = khung Hỗ trợ kéo / đổi cỡ (kế hoạch 2026-10-01-khung-tro-ly-keo-doi-co) + ADR-0070 (trợ lý hiểu cấu trúc, tự sinh kho lúc build; kiểm độc
    // lập ĐẠT CÓ ĐIỀU KIỆN, đã sửa I-1..I-3) + hướng dẫn bỏ câu "chưa có" về thu tiền / Đã giao / Hoàn thành. Số 1.50 vì main đã có 1.48 (nhóm dịch vụ) và 1.49 (Góp ý).
    version: "1.50",
    date: "2026-10-01",
    items: [
      { kind: "doi", text: "Khung Hỗ trợ gọn hơn, nằm ở góc phải phía dưới trên mọi máy; vẫn dùng được trang phía sau khi khung đang mở." },
      { kind: "moi", text: "Kéo thanh tiêu đề để dời khung Hỗ trợ, kéo góc trên bên trái để đổi cỡ. Máy nhớ chỗ đã đặt; bấm \"Về góc\" để trả về như cũ." },
      { kind: "moi", text: "Trợ lý Hỗ trợ hiểu các phần của app nối với nhau thế nào, vai nào làm được việc gì, nút nằm ở đâu trên trang — và tự cập nhật mỗi khi app đổi." },
      { kind: "sua", text: "Hướng dẫn: Hướng dẫn viên và Kế toán nay có phần ghi lần thu, Đã giao, Hoàn thành và đánh dấu đã nhập phần mềm kế toán (trước ghi nhầm là chưa có)." },
    ],
  },
  {
    // Sửa góp ý của chủ 1/10: màn Góp ý khổ máy tính — danh sách bên trái không nạp lại sau khi đổi trạng thái nên vẫn ghi "Mới".
    version: "1.49",
    date: "2026-10-01",
    items: [
      { kind: "sua", text: "Góp ý / Báo lỗi trên máy tính: đổi trạng thái hay trả lời xong thì danh sách bên trái cập nhật ngay, không còn ghi \"Mới\" cho yêu cầu đã xong." },
    ],
  },
  {
    // Nhóm dịch vụ (ADR-0058, lượt 1a, migration 0055). Số 1.48 chốt lúc gộp main 1.47 (bảng điều khiển trợ lý) — 2026-10-01.
    // Chip cũ "Theo nhóm" (giá tính theo nhóm khách) đổi chữ thành "Giá theo nhóm" cho khỏi nhầm (chủ chọn cách 1).
    version: "1.48",
    date: "2026-10-01",
    items: [
      { kind: "moi", text: "Chọn dịch vụ khi lập đơn: bấm chip ở hàng Nhóm dịch vụ (Tour đảo, Thể thao biển…) để chỉ thấy dịch vụ nhóm đó; app nhớ lựa chọn trên máy này." },
      { kind: "moi", text: "Quản trị sửa nhóm dịch vụ ở màn Dịch vụ & giá: thêm, đổi tên, sắp thứ tự, tắt nhóm, chuyển nhiều dịch vụ cùng lúc và xem lịch sử đổi nhóm." },
      { kind: "doi", text: "Nút lọc \"Theo nhóm\" đổi tên thành \"Giá theo nhóm\" cho khỏi nhầm với nhóm dịch vụ." },
    ],
  },
  {
    // Bản 1.47 = bảng điều khiển trợ lý (ADR-0069, migration 0054, kiểm độc lập + 4 đột biến 30/9) + khoá phóng to (chủ quyết 30/9) + e2e chạy
    // song song (chỉ bộ kiểm, không đổi app). Số 1.47 vì main đã có 1.46 (chưa deploy lúc gộp).
    version: "1.47",
    date: "2026-10-01",
    items: [
      { kind: "moi", text: "Toàn quyền có trang \"Trợ lý Hỗ trợ\": thử khoá AI, bật tắt trợ lý theo vai, sửa câu chào và lời dặn, thêm ngữ cảnh, xem lịch sử câu hỏi và chi phí." },
      { kind: "doi", text: "Khung Hỗ trợ ghi rõ câu hỏi được lưu để cải thiện trợ lý — đừng gõ thông tin khách vào câu hỏi." },
      { kind: "doi", text: "Điện thoại: không còn phóng to màn hình khi lỡ chạm hai lần hay chụm hai ngón." },
    ],
  },
  {
    // Bản 1.46 = gộp bốn nhánh đã qua kiểm độc lập (ADR-0059 xe đón trên đơn; ADR-0060 dấu kế toán, migration 0051; ADR-0061 nhập tay nội bộ,
    // migration 0052; ADR-0067 ô Người lập). Mỗi nhánh ghi số tạm 1.45; người gộp chốt 1.46 trên 1.45 của main.
    version: "1.46",
    date: "2026-09-30",
    items: [
      { kind: "moi", text: "Chi tiết đơn: dưới giờ đón hiện xe đón khách — biển số, tên tài xế, số khách trên từng xe và xe đã chạy chưa. Chỉ người xem được Điều phối xe mới thấy." },
      { kind: "moi", text: "Kế toán đánh dấu đơn \"Đã nhập phần mềm kế toán\" kèm số hoá đơn; danh sách đơn có nhãn và lọc được đơn chưa nhập / đã nhập theo khoảng ngày." },
      { kind: "moi", text: "Dịch vụ nhập tay trở lại khi Toàn quyền bật ở trang Tôi (mặc định tắt): Bán hàng, Quản trị thêm được dịch vụ gõ tên, giá tay. Tài khoản đối tác không dùng được." },
      { kind: "moi", text: "Lọc đơn theo từng người lập: trong nút \"Lọc\", gõ tên để chọn người đã lập đơn (Bán hàng, Kế toán, Quản trị). Bộ lọc \"Đơn tôi lập\" đã nhớ vẫn giữ nguyên." },
    ],
  },
  {
    // Chủ báo 30/9 sau 1.44: (1) "chưa thấy trợ lý bật lên" — shell không gắn nút khi đang bảo trì; (2) thông báo điện thoại mất sau mỗi lần triển khai
    // — chưa chốt nguyên nhân gốc (điều tra chỉ đọc); sửa phần chắc chắn: nút "Bật" không còn luôn huỷ đăng ký cũ. Số "1.45" theo main 1.44.
    version: "1.45",
    date: "2026-09-30",
    items: [
      { kind: "sua", text: "Nút \"Hỗ trợ\" nay hiện cả khi app đang bảo trì, cho những người vẫn được dùng app lúc đó." },
      { kind: "sua", text: "Bật lại thông báo trên điện thoại không còn tạo đăng ký mới mỗi lần bấm; máy đã đăng ký thì giữ nguyên." },
    ],
  },
  {
    // Trợ lý Hỗ trợ AI (ADR-0066, chủ duyệt 30/9) + sửa các lỗi chủ báo 30/9 (Đối tác/Thực tập; HDV sửa số khách — "Cho sửa đến hết ngày đi").
    // Ba nhánh, mỗi nhánh người kiểm độc lập ĐẠT. Số "1.44" theo main 1.43; người gộp chốt số trống kế tiếp LÚC GỘP. Có migration 0050.
    version: "1.44",
    date: "2026-09-30",
    items: [
      { kind: "moi", text: "Nút \"Hỗ trợ\" ở mọi trang: hỏi trợ lý AI cách dùng app, trả lời theo hướng dẫn kèm nguồn. Trợ lý có thể sai — đối chiếu màn hình." },
      { kind: "sua", text: "Tài khoản đối tác, thực tập: đơn đã xác nhận không còn hiện nút \"Sửa thông tin chuyến\", \"Đổi khách\" mà bấm lưu lại bị từ chối." },
      { kind: "sua", text: "Tài khoản đối tác, thực tập: trang đơn không còn báo \"Chưa tải được người phụ trách\"." },
      { kind: "moi", text: "Tài khoản đối tác, thực tập có mục \"Đơn hàng\" trên thanh dưới đáy để xem lại đơn mình đã lập." },
      { kind: "doi", text: "Hướng dẫn viên: lý do sửa số khách không được chứa số điện thoại; chỉ sửa số khách được tới hết ngày đi tour." },
    ],
  },
  {
    // Sửa lỗi chủ dự án báo 30/9: hết giờ bảo trì mà hệ thống không tự tắt (docs/HANDOFF-CHE-DO-BAO-TRI.md mục 0). 1.42 đã lên production; người gộp chốt số trống kế tiếp LÚC GỘP.
    version: "1.43",
    date: "2026-09-30",
    items: [
      { kind: "sua", text: "Chế độ bảo trì tự tắt đúng giờ dự kiến hoàn tất: mọi người vào lại app được ngay, không phải chờ quản trị viên tắt tay." },
    ],
  },
  {
    // Một lần phát hành gộp (chủ muốn "dễ và tiện nhất", 30/9): sổ tiền lượt 1 = Hoàn tất đơn (ADR-0024 đ1–5, ADR-0025, ADR-0026; kế hoạch
    // docs/superpowers/plans/2026-09-29-so-tien-luot-1-ke-hoach.md) + đợt giao diện theo góp ý người dùng 30/9 (docs/design/gop-y-2026-09-30/). Số "1.42"
    // theo điều phối (1.41 = "Hướng dẫn theo vai" đã lên main trước); người gộp chốt số trống kế tiếp LÚC GỘP. Hai màn "Sổ của tôi" / "Sổ công nợ" CHƯA dựng nên mục này không nhắc tới.
    version: "1.42",
    date: "2026-09-30",
    items: [
      { kind: "doi", text: "Lập đơn: mục Thanh toán nay nằm trước thông tin khách; tiền khách trả trước mặc định là chuyển khoản và được ghi thành một lần thu." },
      { kind: "moi", text: "Chi tiết đơn có khung tiền: phải thu, đã thu, còn lại và từng lần thu; ghi thêm lần thu ngay trên đơn." },
      { kind: "moi", text: "Hướng dẫn viên đang phụ trách (và Quản trị) bấm \"Đã giao – đã thu đủ\" khi khách đã trả đủ; từ lúc đó đơn không sửa được nữa." },
      { kind: "moi", text: "Kế toán bấm \"Hoàn thành\" sau khi tiền đã về công ty; nếu chưa bấm được, đơn ghi rõ lý do và ai cần xử lý." },
      { kind: "doi", text: "Tiền cọc ghi trên đơn cũ được chuyển thành lần thu \"chưa rõ người thu\"; Kế toán sẽ ghi lại đúng người thu." },
      { kind: "doi", text: "Việc của tôi (hướng dẫn viên): ô tiền ghi \"Đã thu / Còn lại\" theo số tiền thật đã thu của đơn." },
      { kind: "moi", text: "Kế toán xác nhận, đảo lần thu, ghi đã nộp và ghi hoàn cho khách ngay trên trang đơn; màn sổ riêng sẽ có sau." },
      { kind: "moi", text: "Danh sách đơn có nút \"Lọc\": lọc cùng lúc theo ngày đi, dịch vụ, trạng thái và đơn mình lập; máy nhớ bộ lọc cho lần sau, bấm \"Xoá lọc\" để bỏ." },
      { kind: "moi", text: "Trang chủ: khối \"Chuyến đón\" có ba nút Hôm nay / Ngày mai / Ngày kia." },
      { kind: "moi", text: "Tạo đơn: lọc dịch vụ theo \"Hay dùng\" (bấm ☆ để ghim), theo người hoặc theo nhóm; máy nhớ lựa chọn cho lần sau." },
      { kind: "moi", text: "Tài xế xem được cuốc của ngày kia ở trang \"Cuốc của tôi\" (trước chỉ hôm nay và ngày mai)." },
      { kind: "doi", text: "Màn tài xế: mỗi điểm đón hiện thêm giờ xe tới nếu khác giờ hẹn khách." },
      { kind: "doi", text: "Danh sách đơn: đơn có nơi đón hiện luôn dòng \"Đón tại …\" ngay trên thẻ, không phải bấm mở." },
      { kind: "doi", text: "Góp ý / Báo lỗi: trạng thái hiện nổi bật theo từng bước (Mới → Đã tiếp nhận → Đang xử lý → Đã xong); yêu cầu đã xong hoặc bị từ chối có nút \"Mở lại\"." },
    ],
  },
  {
    // Hướng dẫn theo vai trong Trợ giúp (đặc tả docs/superpowers/specs/2026-09-30-huong-dan-theo-vai.md). Chỉ giao diện + nội dung, không đổi máy chủ / dữ liệu.
    // Số "1.41" TẠM (main 1.40); người gộp chốt số trống kế tiếp LÚC GỘP.
    version: "1.41",
    date: "2026-09-30",
    items: [
      { kind: "moi", text: "Trợ giúp có \"Hướng dẫn cho bạn\": cách dùng app theo đúng vai của bạn. Đọc \"Bắt đầu nhanh\" trước, khoảng 30 phút là dùng được." },
    ],
  },
  {
    // Sửa giao diện nhỏ theo rà soát 30/9 (docs/superpowers/specs/2026-09-30-ra-soat-luong-giao-dien-phan-loai-huong-dan.md §2 trên nhánh
    // ra-soat-luong-giao-dien): chỉ bề mặt, không đổi máy chủ / dữ liệu. Số 1.40 (1.39 = bản phông chữ đã lên production 30/9).
    version: "1.40",
    date: "2026-09-30",
    items: [
      { kind: "doi", text: "Tạo đơn: tiêu đề, phần Tóm tắt và thanh dưới đáy ghi rõ đơn đang có mấy dịch vụ; chọn xong có báo ngắn, dịch vụ đã chọn có nhãn \"đã chọn\"." },
      { kind: "doi", text: "Tạo đơn: phần \"Thông tin chuyến\" nay thu gọn sẵn cả trên máy tính; dòng tóm tắt ghi giờ đón, nơi đón và giờ check-in." },
      { kind: "doi", text: "Việc của tôi (hướng dẫn viên): thẻ đơn có giờ khởi hành, check-in, ghi chú và nút \"Xem đơn\"; nhãn tiền đổi thành \"Thanh toán trước / Còn lại\"." },
      { kind: "doi", text: "Trang đơn: không lặp ngày khởi hành ở từng dịch vụ; số khách ở đầu trang ghi đủ chữ, ví dụ \"8 người lớn, 1 trẻ em\"." },
      { kind: "doi", text: "Màn tài xế: nút \"Kết thúc gián đoạn\" nhỏ lại, viền đỏ; nút \"Kết thúc chuyến\" khi chưa bấm được vẫn hiện rõ là một nút." },
      { kind: "moi", text: "Tài xế thấy trước các điểm đón, giờ hẹn và số khách của chuyến." },
    ],
  },
  {
    // Rà soát phông + cỡ chữ (chủ dự án giao 30/9: "chọn phông tiếng Việt chuẩn", lỗi phông nhẹ trên Windows) — đặc tả
    // docs/superpowers/specs/2026-09-30-phong-chu-va-co-chu.md. Số "1.39" TẠM (production 1.38); người gộp chốt số trống kế tiếp LÚC GỘP.
    version: "1.39",
    date: "2026-09-30",
    items: [
      { kind: "sua", text: "Sửa lỗi chữ tiếng Việt trên máy tính Windows: dấu có lúc bị lệch hoặc tách khỏi chữ, nút bấm hiện phông khác." },
      { kind: "doi", text: "Toàn bộ app dùng một phông chữ thiết kế riêng cho tiếng Việt (Be Vietnam Pro), hiển thị giống nhau trên iPhone, Android và máy tính." },
    ],
  },
  {
    // Phát hành 1.38 (phân hệ Vận chuyển lượt 1): ADR-0049 (bảng điều phối chung, mốc 6 giờ + đặt gấp, cuốc tài xế — Task K1 của
    // docs/superpowers/plans/2026-09-29-adr-0049-thi-cong.md), ADR-0047 (chặng đưa đón + danh sách hành khách), Q-L3-B (ADR-0053 D7.2). Production 1.37
    // (kiem-phien-ban 30/9). Chủ quyết 30/9: phát hành nhưng CHƯA dùng Điều phối cho chuyến thật tới khi có màn nhập tên khách (ADR-0047 Phần B).
    version: "1.38",
    date: "2026-09-30",
    items: [
      { kind: "doi", text: "Đơn có giờ đón cách bây giờ dưới 6 giờ vẫn lưu nháp được, nhưng muốn xác nhận thì phải có Quản trị bấm \"Đặt gấp\" cho chặng đó." },
      { kind: "moi", text: "Có Bảng điều phối xe: lịch đón theo ngày, tạo chuyến, xếp khách lên xe; tài xế công ty xem cuốc của mình ở trang \"Cuốc của tôi\"." },
      { kind: "doi", text: "Lưu ý: CHƯA dùng Bảng điều phối cho chuyến thật cho tới khi có màn nhập tên khách. Văn phòng vẫn điều xe như cũ." },
      { kind: "doi", text: "Tài xế chỉ thấy tên và số liên hệ của khách trong ngày chạy; bấm Xuất bến sớm từ hôm trước cũng không thấy trước." },
      { kind: "doi", text: "Thông tin đưa đón nay được lưu theo từng chặng (lượt đi, lượt về); màn nhập đơn vẫn như cũ." },
    ],
  },
  {
    // ADR-0048 (nhà xe đối tác, tài xế đối tác; Task K1 của docs/superpowers/plans/2026-09-29-adr-0048-thi-cong.md). Số "1.37" TẠM theo điều phối
    // (production 1.36 từ 28/9 23:21 giờ VN; 1.37 là bản kế tiếp); người gộp chốt số trống kế tiếp LÚC GỘP (nhánh ADR-0047 đang xếp hàng).
    version: "1.37",
    date: "2026-09-29",
    items: [
      { kind: "moi", text: "Có tài khoản cho tài xế của nhà xe đối tác: đăng nhập, xem giấy tờ của mình; không thấy đơn, giá hay tin nội bộ của công ty." },
      { kind: "moi", text: "Quản trị ghi được nhà xe đối tác ở Danh bạ, tài xế của từng nhà xe và xe của nhà xe; danh sách xe lọc được theo chủ xe." },
      { kind: "doi", text: "Danh sách giấy tờ sắp hết hạn có thêm xe và tài xế của nhà xe đối tác, ghi rõ tên nhà xe." },
    ],
  },
  {
    // ADR-0046 (thông báo điện thoại tự tắt đúng máy — sửa ADR-0036 điều 6) + tách "Danh mục giấy tờ" theo chủ dữ liệu (chủ chọn 28/9).
    version: "1.36",
    date: "2026-09-28",
    items: [
      { kind: "sua", text: "Đăng xuất ở máy tính không còn làm tắt thông báo trên điện thoại: chỉ máy đang đăng xuất mới thôi nhận thông báo." },
      { kind: "doi", text: "Đổi vai hoặc quyền của một người không còn làm tắt thông báo trên điện thoại của họ; đổi PIN, gỡ Face ID, ngưng tài khoản thì vẫn tắt." },
      { kind: "doi", text: "Danh mục giấy tờ tách làm hai: \"Loại giấy tờ xe\" nằm trong Vận chuyển, \"Loại giấy tờ người\" nằm trong nhóm Quản trị." },
    ],
  },
  {
    // Vận chuyển lượt 1a (ADR-0040; Task K1 của docs/superpowers/plans/2026-09-28-van-chuyen-1a.md). Số "1.35" theo điều phối (main 1.34, 1.32 để trống);
    // điều phối chốt số thật lúc gộp cuối.
    version: "1.35",
    date: "2026-09-28",
    items: [
      { kind: "moi", text: "Mục Vận chuyển mới cho Quản trị: quản lý xe của công ty (biển số, số người được chở, trạng thái) và giấy tờ từng xe kèm ngày hết hạn, gia hạn, lịch sử." },
      { kind: "moi", text: "Quản trị ghi giấy tờ của nhân viên (căn cước, bằng lái, khám sức khoẻ, tập huấn) trong hồ sơ ở Danh bạ; số luôn che, bấm \"Xem đủ số\" thì số hiện 10 giây." },
      { kind: "moi", text: "Trang Tôi có mục \"Giấy tờ của tôi\": nhân viên xem giấy tờ và ngày hết hạn của mình, số được che." },
      { kind: "moi", text: "Có tài khoản cho tài xế công ty: mở app là vào trang của tài xế, xem giấy tờ và hạn giấy tờ của mình." },
      { kind: "moi", text: "Quản trị có danh sách giấy tờ của xe và tài xế còn 30 ngày trở xuống hoặc đã hết hạn; số đếm hiện ở menu và trang Tôi, bấm một dòng để mở xe hoặc hồ sơ." },
      { kind: "moi", text: "Quản trị sửa được danh mục loại giấy tờ xe, loại giấy tờ của người và hạng bằng lái (mục \"Danh mục giấy tờ\" ở trang Tôi)." },
    ],
  },
  {
    // T2b — hồ sơ công ty chủ (ADR-0024 điều 6, ADR-0043). SỐ "1.34" theo chỉ đạo D19 của điều phối: main 356084a đã có 1.33 (HDV — ADR-0030 +
    // ADR-0037) ngay trên 1.31, số 1.32 để trống đúng như main; điều phối chốt số thật lúc gộp cuối.
    version: "1.34",
    date: "2026-09-28",
    items: [
      { kind: "doi", text: "Tên và mã số thuế ở cuối trang đăng nhập, cùng thông tin công ty trên ảnh xác nhận đơn, nay lấy từ hồ sơ công ty trong Danh bạ: sửa một nơi là đổi mọi nơi." },
      { kind: "doi", text: "Chỉ người phụ trách hệ thống sửa được tên, mã số thuế, địa chỉ, số liên hệ của hồ sơ công ty trong Danh bạ, và đổi sang hồ sơ công ty khác khi cần." },
      { kind: "sua", text: "Địa chỉ ở cuối trang đăng nhập viết lại đúng như hồ sơ công ty." },
    ],
  },
  {
    version: "1.33",
    date: "2026-09-28",
    items: [
      { kind: "doi", text: "Đơn mới lập không còn tự ghi người lập là người phụ trách: đơn chưa có ai hiện “Chờ nhận”, chờ hướng dẫn viên hoặc nhân viên bấm Nhận." },
      { kind: "moi", text: "Hướng dẫn viên thấy danh sách đơn chờ nhận (không có số điện thoại, không có tiền) và bấm Nhận; đơn mình đang phụ trách thì xem đủ thông tin." },
      { kind: "moi", text: "Khi lập đơn, bạn chọn được hướng dẫn viên phụ trách ngay; chọn xong là có hiệu lực luôn." },
      { kind: "doi", text: "Mục “Việc của tôi” làm lại theo mẫu mới: đơn chờ nhận và đơn của bạn (kể cả chưa xác nhận) trên một màn; mỗi đơn có Tổng tiền, Đã cọc, Còn thu, nút gọi khách." },
      { kind: "doi", text: "Hướng dẫn viên sửa số khách hoặc huỷ đơn qua một bảng hỏi lại: sửa số khách có nút chọn nhanh lý do, huỷ đơn phải chọn lý do rồi mới bấm được." },
      { kind: "doi", text: "Đơn đã lưu mà chưa chốt nay ghi “Chờ xác nhận” thay cho “Nháp”; người đang lo đơn hiện “HDV: tên người đó”." },
    ],
  },
  {
    version: "1.31",
    date: "2026-09-28",
    items: [
      { kind: "doi", text: "Lưu đơn nháp không còn báo ai; khi đơn được bấm \"Xác nhận đơn\" mà chưa có người phụ trách, người nhận được đơn mới được báo (cả trên màn hình khoá)." },
    ],
  },
  {
    version: "1.30",
    date: "2026-09-28",
    items: [
      { kind: "moi", text: "Thêm vai IT trong nhóm nội bộ." },
    ],
  },
  {
    version: "1.29",
    date: "2026-09-28",
    items: [
      { kind: "sua", text: "Tài khoản Đối tác tạo lại được ảnh xác nhận đơn (bản 1.28 báo \"Chưa tải được người phụ trách\"); ảnh của Đối tác không in dòng người phụ trách." },
    ],
  },
  {
    version: "1.28",
    date: "2026-09-28",
    items: [
      { kind: "sua", text: "Ảnh xác nhận đơn chưa có người phụ trách nay ghi \"Đơn khởi tạo thành công và đang chờ hướng dẫn viên nhận khách\" thay vì tên người lập." },
      { kind: "doi", text: "Từ 22:00 đến 6:00 thông báo vẫn hiện trên màn hình khoá nhưng không rung, không kêu; tin quan trọng vẫn rung." },
    ],
  },
  {
    version: "1.27",
    date: "2026-09-28",
    items: [
      { kind: "doi", text: "Quản trị đặt lại được mã PIN, mở khoá đăng nhập và gỡ Face ID cho nhân viên mình quản lý." },
    ],
  },
  {
    version: "1.26",
    date: "2026-09-28",
    items: [
      { kind: "doi", text: "Góp ý và Báo lỗi do người phụ trách hệ thống tiếp nhận; tài khoản Quản trị không còn mở hàng đợi Góp ý. Mọi người vẫn gửi và xem góp ý của mình như cũ." },
      { kind: "doi", text: "Quản trị tập trung việc kinh doanh, nhân sự. Đặt lại PIN, gỡ Face ID, mở khoá, đồng bộ từ Sheet và trang Nhật ký do người phụ trách hệ thống làm." },
    ],
  },
  {
    version: "1.25",
    date: "2026-09-28",
    items: [
      { kind: "moi", text: "Thông báo hiện trên màn hình khoá điện thoại: vào trang Tài khoản, bấm \"Bật thông báo trên điện thoại\" rồi cho phép." },
      { kind: "moi", text: "Trên iPhone, cần mở app từ biểu tượng ngoài màn hình chính thì mới bật được." },
    ],
  },
  {
    version: "1.24",
    date: "2026-09-28",
    items: [
      { kind: "moi", text: "Chuẩn bị thông báo hiện trên màn hình khoá điện thoại; mục bật sẽ xuất hiện trong trang Tài khoản khi công ty mở tính năng." },
      { kind: "doi", text: "Đăng xuất hoặc đổi mã PIN sẽ tắt thông báo trên mọi điện thoại của tài khoản; muốn nhận lại thì bấm Bật lần nữa." },
    ],
  },
  {
    version: "1.23",
    date: "2026-09-28",
    items: [
      { kind: "sua", text: "Nút quay về trong ngăn Thông báo không còn bị phần tai thỏ và đồng hồ của iPhone che." },
      { kind: "sua", text: "Chuông thông báo nằm đúng góc phải ở tài khoản Hướng dẫn viên và Đối tác trên máy tính." },
    ],
  },
  {
    version: "1.22",
    date: "2026-09-28",
    items: [
      { kind: "moi", text: "Chuông thông báo trên thanh trên: báo khi có đơn mới, có người nhận đơn, giao đơn, xác nhận hay huỷ đơn liên quan tới bạn." },
      { kind: "moi", text: "Bấm chuông để xem hai ngăn \"Của tôi\" và \"Tất cả\"; mở ra là coi như đã đọc hết, bấm một tin để mở đúng đơn." },
      { kind: "moi", text: "Chủ công ty gửi được thông báo cho cả công ty hoặc từng nhóm; tin quan trọng hiện dải nhắc cho tới khi bạn bấm \"Đã hiểu\"." },
    ],
  },
  {
    version: "1.21",
    date: "2026-09-27",
    items: [
      { kind: "sua", text: "Thanh tab dưới đáy không còn nhảy lên xuống khi chuyển trang trên iPhone." },
      { kind: "sua", text: "Trong lúc chờ dữ liệu, trang hiện khung thẻ trắng thay vì một khoảng trống." },
    ],
  },
  {
    version: "1.20",
    date: "2026-09-27",
    items: [
      { kind: "doi", text: "Mở trang nhanh hơn: thanh trên, menu và thanh tab hiện ngay khi bấm; danh sách đơn và Trang chủ hiện dữ liệu nhanh gần gấp đôi." },
      { kind: "doi", text: "Sau mỗi lần cập nhật, app lưu sẵn mọi màn hình trên máy nên lần mở đầu tiên của từng màn cũng không phải chờ tải." },
    ],
  },
  {
    version: "1.19",
    date: "2026-09-27",
    items: [
      { kind: "doi", text: "Tài khoản đối tác và thực tập sinh nay lấy danh mục dịch vụ khi tạo đơn qua một đường riêng, kiểm quyền chặt hơn; bạn không thấy gì khác." },
    ],
  },
  {
    version: "1.18",
    date: "2026-09-27",
    items: [
      { kind: "doi", text: "Hệ thống kiểm tra quyền chặt hơn ở các màn quản trị và màn đơn; với đa số nhân viên bạn không thấy gì khác." },
      { kind: "doi", text: "Chế độ bảo trì: chỉ tài khoản Toàn quyền có số điện thoại trong danh sách được phép mới bật hoặc tắt được." },
      { kind: "doi", text: "Quản trị viên không còn thêm hay kết thúc vai, quan hệ (như “Người liên hệ của”) trên hồ sơ của quản trị viên khác hoặc của Toàn quyền; chỉ Toàn quyền làm được." },
    ],
  },
  {
    version: "1.17",
    date: "2026-09-26",
    items: [
      { kind: "sua", text: "Form lập đơn của tài khoản đối tác: dòng báo “tạm chưa được giảm giá” nay nằm gọn một hàng dưới mục Thanh toán, không còn bị bóp hẹp." },
    ],
  },
  {
    version: "1.16",
    date: "2026-09-26",
    items: [
      { kind: "moi", text: "Danh sách đơn, Trang chủ và trang đơn tự cập nhật khi đồng nghiệp nhận, giao, xác nhận hoặc huỷ đơn; có thông báo nhỏ ở góc màn hình." },
    ],
  },
  {
    version: "1.15",
    date: "2026-09-26",
    items: [
      { kind: "moi", text: "Tài khoản đối tác và thực tập sinh nay chọn được dịch vụ trong danh mục để lập đơn (chỉ xem, không sửa được danh mục)." },
      { kind: "doi", text: "Với tài khoản đối tác, ô đơn giá và ô giảm giá trên form lập đơn được khoá sẵn: giá luôn theo giá bán lẻ, tạm chưa giảm giá." },
    ],
  },
  {
    version: "1.14",
    date: "2026-09-26",
    items: [
      { kind: "sua", text: "Hướng dẫn viên bấm huỷ đơn nay được hỏi lại một lần trước khi huỷ; vùng huỷ đơn tách xa nút lưu số khách và có nút Thôi." },
      { kind: "doi", text: "Hướng dẫn viên không huỷ được tour đã qua ngày đi; cần huỷ thì nhờ văn phòng. Ngay trong ngày đi vẫn huỷ được." },
      { kind: "doi", text: "Dịch vụ nhập tay đã ngừng, không thêm mới được. Dịch vụ nhập tay trên đơn cũ chỉ để xem; muốn đổi thì xoá rồi chọn trong danh mục." },
      { kind: "doi", text: "Tài khoản đối tác lập đơn theo đúng giá bán lẻ của danh mục và tạm chưa được giảm giá; cần giảm cho khách thì nhờ văn phòng." },
      { kind: "doi", text: "Quản trị viên không tự đặt lại mã PIN của chính mình ở trang Quản lý tài khoản nữa; muốn đổi mã PIN thì vào trang Tôi." },
    ],
  },
  {
    version: "1.13",
    date: "2026-09-25",
    items: [
      { kind: "sua", text: "Sửa lỗi: hướng dẫn viên lưu số khách không còn làm đổi giá đã thoả thuận với khách; thêm khách thì tính theo đúng giá đã thoả thuận." },
      { kind: "sua", text: "Hướng dẫn viên bấm lưu mà không đổi số khách thì đơn giữ nguyên, không ghi thêm lần sửa nào." },
    ],
  },
  {
    version: "1.12",
    date: "2026-09-25",
    items: [
      { kind: "doi", text: "\"Sửa thông tin chuyến\" nay có một ô ngày khởi hành cho cả đơn; đổi ngày là đổi cho mọi dịch vụ trong đơn." },
      { kind: "doi", text: "Hệ thống không nhận đơn có các dịch vụ khác ngày nhau. Đơn cũ đang khác ngày vẫn sửa được giờ, điểm đón, ghi chú như trước." },
    ],
  },
  {
    version: "1.11",
    date: "2026-09-25",
    items: [
      { kind: "doi", text: "\"Lập đơn mới\" đổi tên thành \"Tạo đơn\". Màn Tạo đơn nay đi theo thứ tự: chọn ngày, chọn dịch vụ, rồi nhập thông tin khách." },
      { kind: "doi", text: "Mỗi đơn chỉ có một ngày khởi hành, chọn ở đầu màn Tạo đơn; không còn nút thêm dịch vụ nhập tay." },
      { kind: "moi", text: "Nút \"Sử dụng thông tin của tôi\" ở Tạo đơn: tự điền tên và số điện thoại của chính bạn làm thông tin khách." },
      { kind: "doi", text: "\"Đã cọc\" đổi thành \"Thanh toán trước\", \"Hình thức cọc\" đổi thành \"Phương thức thanh toán\" (để sẵn Tiền mặt)." },
      { kind: "doi", text: "Nút \"Xác nhận gửi khách\" trong đơn đổi tên thành \"Xem biên nhận\"; danh sách đơn hàng có thêm số thứ tự." },
    ],
  },
  {
    version: "1.10",
    date: "2026-09-25",
    items: [
      { kind: "doi", text: "Màn \"Nhân viên\" đổi tên thành \"Quản lý tài khoản\" (trên điện thoại là tab \"Tài khoản\"), vì ở đây quản lý cả tài khoản của đối tác." },
      { kind: "doi", text: "Mục \"Tài khoản\" ở thanh bên máy tính đổi tên thành \"Của tôi\"." },
      { kind: "doi", text: "Màn \"Hồ sơ\" đổi tên thành \"Danh bạ\"; trong mỗi hồ sơ, \"Vai trò theo nơi\" nay là \"Công việc tại đâu\", \"Quan hệ\" nay là \"Người liên hệ\"." },
    ],
  },
  {
    version: "1.9",
    date: "2026-09-24",
    items: [
      { kind: "doi", text: "Hồ sơ của người có tài khoản (nhân viên, đối tác) giờ chỉ quản trị viên sửa được tên và số liên hệ." },
      { kind: "doi", text: "Muốn tạm khoá hay cho nghỉ việc một người, dùng màn Nhân viên; màn Hồ sơ không còn tắt được người có tài khoản." },
    ],
  },
  {
    version: "1.8",
    date: "2026-09-24",
    items: [
      { kind: "moi", text: "Quản trị viên gán vai cho từng tài khoản (Giám đốc, Kế toán, Hướng dẫn viên nội bộ, Cộng tác viên…); quyền tự theo vai, xem trước trước khi lưu." },
      { kind: "moi", text: "Thêm vai Thực tập sinh: lập đơn và chỉ thấy đơn của mình (chưa chọn được dịch vụ từ danh mục — chờ quyết định)." },
      { kind: "moi", text: "Tạo tài khoản cho người đã có hồ sơ (ví dụ khách cũ) mà không tạo hồ sơ trùng." },
      { kind: "doi", text: "Quyền \"Super Admin\" đổi tên thành \"Toàn quyền\". Chỉ Toàn quyền mới cấp được quyền Quản trị." },
    ],
  },
  {
    version: "1.7",
    date: "2026-09-24",
    items: [
      { kind: "sua", text: "Trang Đăng nhập trên điện thoại gọn hơn, hiện đủ trong một màn hình, không phải kéo, kể cả khi mở bằng Safari." },
    ],
  },
  {
    version: "1.6",
    date: "2026-09-24",
    items: [
      { kind: "doi", text: "Trang Đăng nhập có giao diện mới, gọn trong một màn hình, không cần kéo. Nút Đăng nhập chỉ bấm được khi đã gõ đủ số điện thoại và 6 số mã PIN." },
      { kind: "moi", text: "Nút Face ID / vân tay nằm ngay cạnh nút Đăng nhập. Ô mã PIN có nút Hiện để xem lại số vừa gõ và bộ đếm 0/6." },
      { kind: "doi", text: "Gõ sai mã PIN thì ô PIN tự xoá để gõ lại. Số hỗ trợ kỹ thuật 0989 929 373 hiện ngay dưới nút Đăng nhập." },
      { kind: "doi", text: "Tên ứng dụng đổi thành Island Booking System. App đã cài trên iPhone vẫn giữ tên cũ dưới biểu tượng tới khi cài lại." },
    ],
  },
  {
    version: "1.5",
    date: "2026-09-24",
    items: [
      { kind: "sua", text: "Đơn do Đối tác lập nay để trống người phụ trách, chờ nhân viên Tour Đảo nhận lo đơn, không còn tự ghi Đối tác làm người phụ trách." },
    ],
  },
  {
    version: "1.4",
    date: "2026-09-24",
    items: [
      { kind: "moi", text: "Trang Trợ giúp mới (ở trang Tôi và menu bên trái): xem app vừa đổi gì qua từng bản. Chấm đỏ nhỏ báo khi có bản mới mà bạn chưa xem." },
      { kind: "doi", text: "Mở app là vào thẳng Trang chủ. Danh sách đơn nay nằm ở mục Đơn hàng." },
      { kind: "doi", text: "Trên máy tính và iPad, menu chuyển sang cột dọc bên trái; cạnh mục Đơn hàng có số đơn chưa xác nhận." },
      { kind: "moi", text: "Ô tìm kiếm trên đầu trang (máy tính): gõ mã đơn, tên khách hoặc số điện thoại rồi bấm Enter để lọc danh sách đơn." },
      { kind: "moi", text: "Trang chủ có biểu đồ doanh thu từng ngày trong tuần của bạn (máy tính, iPad). Quản trị viên thấy thêm khối \"Cần xem lại\": Sheet đổi giá, góp ý chưa trả lời." },
      { kind: "sua", text: "Tài khoản Đối tác mở app được đưa thẳng tới danh sách đơn, không còn gặp báo lỗi ở Trang chủ." },
    ],
  },
  {
    version: "1.3",
    date: "2026-09-23",
    items: [
      { kind: "moi", text: "Đăng nhập bằng Face ID hoặc vân tay: bật một lần ở trang Tôi, lần sau chạm một cái là vào, không cần gõ số điện thoại và mã PIN." },
      { kind: "moi", text: "Quên mã PIN: đặt mã PIN mới ngay trên máy đã bật Face ID, không cần nhờ quản trị viên." },
      { kind: "doi", text: "Quản trị viên thấy ai đã bật Face ID và gỡ được khi cần. Ngưng tài khoản hoặc đặt lại mã PIN sẽ gỡ luôn Face ID của người đó." },
    ],
  },
  {
    version: "1.2",
    date: "2026-09-23",
    items: [
      { kind: "moi", text: "Trang chủ mới cho nhân viên văn phòng: đơn còn thiếu tiền, đơn nháp chưa xác nhận, đơn chưa có người phụ trách, chuyến đón hôm nay và doanh thu tuần." },
    ],
  },
  {
    version: "1.1",
    date: "2026-09-22",
    items: [
      { kind: "doi", text: "Giao diện mới cho các trang: dễ đọc hơn trên điện thoại, bố cục hai cột trên máy tính." },
      { kind: "moi", text: "Ghi được người đặt tour trên từng đơn." },
      { kind: "moi", text: "Hướng dẫn viên có mục \"Việc của tôi\" ở trang Tôi: sửa số khách hoặc huỷ đơn kèm lý do cho đơn đã xác nhận mà mình phụ trách." },
      { kind: "doi", text: "Quyền \"Thực hiện\" đổi tên thành \"Hướng dẫn viên\"." },
      { kind: "sua", text: "Sửa lỗi không tạo được tài khoản nhân viên mới." },
    ],
  },
  {
    version: "1.0",
    date: "2026-09-21",
    items: [
      { kind: "moi", text: "Lập đơn dịch vụ tour từ bảng giá chung, ghi thông tin chuyến cho từng dịch vụ và xác nhận đơn." },
      { kind: "moi", text: "Gửi ảnh xác nhận đơn cho khách; giao người phụ trách cho từng đơn." },
      { kind: "moi", text: "Đăng nhập bằng số điện thoại và mã PIN, có bước xác minh chống dò mã." },
      { kind: "moi", text: "Cài app lên màn hình chính điện thoại; gửi ý kiến cho quản trị viên ở mục Góp ý / Báo lỗi." },
    ],
  },
];

// So sánh số phiên bản nằm ở `phien-ban.ts` (tách để giao diện không phải kéo cả nhật ký này vào gói mọi trang); xuất lại ở đây cho nơi đã nhập từ đây.
export { compareVersions, hasUnseenRelease };

/** Nhãn "Mới cập nhật" trên từng bản: chưa từng xem (hoặc rác) ⇒ chỉ bản mới nhất; đã xem X ⇒ mọi bản mới hơn X. */
export function isNewForViewer(version: string, seen: string | null, latest: string): boolean {
  if (seen === null || !parseVersion(seen)) return version === latest;
  return compareVersions(version, seen) > 0;
}

export const MAX_ITEM_LENGTH = 160;
const FORBIDDEN_WORDS = ["task", "commit", "api", "route", "migration", "worker", "deploy", "e2e", "d1", "null", "undefined"];
const FORBIDDEN_RE = new RegExp(`(^|[^\\p{L}\\p{N}_])(${FORBIDDEN_WORDS.join("|")})(?=$|[^\\p{L}\\p{N}_])`, "iu");
const SNAKE_RE = /[A-Za-z0-9]+_[A-Za-z0-9]+/;
const KINDS = new Set<string>(Object.keys(CHANGE_KIND_LABEL));

/** Mọi lỗi viết của nhật ký (rỗng = hợp lệ). Dùng ở changelog.test.ts. */
export function changelogProblems(log: readonly ReleaseNote[]): string[] {
  const out: string[] = [];
  if (log.length === 0) return ["Nhật ký rỗng: cần ít nhất một bản."];
  log.forEach((n, i) => {
    const at = `bản #${i} (${n.version})`;
    if (!parseVersion(n.version)) out.push(`${at}: số phiên bản không hợp lệ, cần dạng X.Y`);
    if (!isISODate(n.date)) out.push(`${at}: ngày không hợp lệ "${n.date}"`);
    if (n.items.length === 0) out.push(`${at}: cần ít nhất một gạch`);
    n.items.forEach((it, j) => {
      const t = it.text.trim();
      if (!KINDS.has(it.kind)) out.push(`${at} gạch ${j}: loại không hợp lệ "${it.kind}"`);
      if (!t) out.push(`${at} gạch ${j}: chữ rỗng`);
      if (t.length > MAX_ITEM_LENGTH) out.push(`${at} gạch ${j}: dài ${t.length} ký tự, tối đa ${MAX_ITEM_LENGTH}`);
      const bad = FORBIDDEN_RE.exec(t);
      if (bad) out.push(`${at} gạch ${j}: có chữ kỹ thuật "${bad[2]}"`);
      if (t.includes("`")) out.push(`${at} gạch ${j}: có dấu \``);
      if (SNAKE_RE.test(t)) out.push(`${at} gạch ${j}: có định danh kiểu snake_case`);
    });
    const next = log[i + 1];
    if (next && parseVersion(n.version) && parseVersion(next.version) && compareVersions(n.version, next.version) <= 0) out.push(`${at}: số phiên bản phải tăng dần nghiêm ngặt (mới nhất ở đầu), bản sau là ${next.version}`);
    if (next && isISODate(n.date) && isISODate(next.date) && n.date < next.date) out.push(`${at}: ngày ${n.date} sớm hơn bản cũ hơn (${next.date})`);
  });
  return out;
}

/** Cổng phát hành (scripts/kiem-phien-ban.mjs). "truoc": bản ở máy phải MỚI HƠN production; "sau": production phải BẰNG bản ở máy. remote null = production chưa báo số (coi là 1.0). */
export function releaseGate(local: string, remote: string | null, mode: "truoc" | "sau"): { ok: boolean; message: string } {
  const note = remote === null ? " (production chưa báo số phiên bản: coi là 1.0)" : "";
  const prod = remote ?? "1.0";
  if (!parseVersion(prod)) return { ok: false, message: `CHƯA ĐẠT: production trả số phiên bản lạ "${prod}".` };
  const cmp = compareVersions(local, prod);
  if (mode === "truoc") {
    return cmp > 0
      ? { ok: true, message: `ĐẠT: bản ở máy ${local} mới hơn production ${prod}${note}.` }
      : { ok: false, message: `CHƯA ĐẠT: bản ở máy ${local} không mới hơn production ${prod}${note}. Thêm mục mới vào đầu CHANGELOG (src/shared/changelog.ts).` };
  }
  return remote !== null && cmp === 0
    ? { ok: true, message: `ĐẠT: production đang chạy đúng bản ${local}.` }
    : { ok: false, message: `CHƯA ĐẠT: production báo ${prod}${note}, bản ở máy là ${local}.` };
}
