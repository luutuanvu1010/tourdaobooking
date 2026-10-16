// Hướng dẫn: mục "Bật bảo mật hai lớp" (ADR-0074 Phần B, bản nháp ở báo cáo Task 7). Luật viết ở src/shared/huong-dan.ts.
// Ruling điều phối Task 8 (phương án c): đặt vào các nhóm vai CÒN CHỖ trong ngân sách đọc 30 phút (bài A4) — Hướng dẫn viên, Tài xế, Nhân sự, Đối tác.
// Bán hàng, Kế toán, Quản trị đã đầy (21 phút + Phần chung 9 phút): chưa có mục này, chờ chủ chọn (nâng ngân sách / rút gọn mục khác).
// Một nguồn chữ cho cả bốn nhóm; chỉ câu "ai bắt buộc" và câu "mất điện thoại, hết mã" đổi theo nhóm (đối tác chưa bắt buộc — ADR-G1 chưa duyệt).
import type { MucHuongDan } from "./huong-dan.ts";

type Loai = "noi-bo" | "tai-xe" | "doi-tac";

const AI_BAT_BUOC: Record<Loai, string> = {
  "noi-bo": "Nhân viên nội bộ bắt buộc bật; Nền tảng nhắc bằng dải **Còn … ngày để bật bảo mật hai lớp** ở đầu trang.",
  "tai-xe": "Tài xế công ty bắt buộc bật; Nền tảng nhắc bằng dải **Còn … ngày để bật bảo mật hai lớp** ở đầu trang. Tài xế đối tác chưa bắt buộc nhưng nên bật.",
  "doi-tac": "Tài khoản đối tác chưa bắt buộc bật, nhưng nên bật: người khác biết PIN của bạn cũng không vào được.",
};

const HET_MA: Record<Loai, string> = {
  "noi-bo": "Hết mã dự phòng thì gọi Quản trị: Quản trị bấm [[Tắt bảo mật hai lớp]], bạn có 24 giờ để đăng nhập bằng PIN và bật lại ngay trên máy mới.",
  "tai-xe": "Hết mã dự phòng thì gọi Quản trị: Quản trị bấm [[Tắt bảo mật hai lớp]], rồi bạn đăng nhập bằng PIN và bật lại trên máy mới (tài xế công ty: trong 24 giờ).",
  "doi-tac": "Hết mã dự phòng thì gọi Quản trị: Quản trị bấm [[Tắt bảo mật hai lớp]], rồi bạn đăng nhập bằng PIN như cũ và bật lại ở trang **Tôi**.",
};

export function mucBatHaiLop(loai: Loai): MucHuongDan {
  return {
    tieuDe: "Bật bảo mật hai lớp",
    noiDung: `Bảo mật hai lớp: đăng nhập bằng PIN trên máy lạ, Nền tảng hỏi thêm mã 6 số từ ứng dụng xác thực trên điện thoại của bạn. ${AI_BAT_BUOC[loai]}

1. Cài **Google Authenticator** từ App Store (iPhone) hoặc CH Play (Android) trên điện thoại riêng của bạn.
2. Vào trang **Tôi**, mục **Bảo mật đăng nhập**, bấm [[Bật ứng dụng xác thực]].
3. Đang dùng chính điện thoại đó: bấm [[Mở ứng dụng xác thực]], ứng dụng tự thêm Tour Đảo. Đang dùng máy tính: mở ứng dụng trên điện thoại và quét mã QR. Không được thì bấm [[Chép khoá]] rồi gõ tay khoá vào ứng dụng.
4. Nhập mã 6 số ứng dụng đang hiện, bấm [[Xác nhận bật]].
5. Nền tảng hiện 10 mã dự phòng một lần duy nhất. Bấm [[Tải tệp .txt]] hoặc chép ra giấy, cất nơi an toàn, rồi bấm [[Tôi đã cất mã]].

### Đăng nhập khi đã bật

- Gõ PIN như cũ, rồi nhập mã 6 số đang hiện trong ứng dụng, bấm [[Xác nhận]].
- Để ô **Tin máy này 30 ngày** được chọn trên máy riêng của bạn: máy đó không hỏi mã trong 30 ngày. Máy dùng chung thì bỏ chọn.
- Không có điện thoại bên cạnh: bấm [[Dùng mã dự phòng]] và nhập một mã dự phòng. Mỗi mã chỉ dùng được một lần; sắp hết thì vào **Bảo mật đăng nhập** bấm [[Tạo bộ mới]].
- Báo mã sai nhiều lần: kiểm giờ tự động trên điện thoại (Cài đặt, mục ngày giờ), rồi nhập mã mới nhất.

### Đổi hoặc mất điện thoại

- Còn điện thoại cũ: ở **Bảo mật đăng nhập** bấm [[Đổi sang điện thoại mới]], làm lại các bước trên máy mới, nhập thêm mã của máy cũ.
- Mất điện thoại: dùng một mã dự phòng để đăng nhập rồi đổi như trên. ${HET_MA[loai]}
- Thấy máy lạ trong danh sách **Máy được tin**: bấm [[Quên máy này]] hoặc [[Quên mọi máy]], rồi đổi PIN.`,
  };
}

// Phần C (ADR-0074 điều 4, 7; kế hoạch Task 4): nhận mã qua email. Cùng bốn nhóm vai như mục trên (ruling: nhóm còn chỗ trong ngân sách đọc). Không ghi địa
// chỉ mẫu (bài A3 cấm chuỗi giống email). "Gửi mã qua email" để chữ đậm, không [[…]]: nút thật ghép thêm địa chỉ che nên không phải nguyên một chuỗi.
const GO_EMAIL: Record<Loai, string> = {
  "noi-bo": "Nhân viên nội bộ phải giữ ít nhất một cách xác thực: muốn bỏ email thì bật ứng dụng xác thực trước.",
  "tai-xe": "Tài xế công ty phải giữ ít nhất một cách xác thực: muốn bỏ email thì bật ứng dụng xác thực trước.",
  "doi-tac": "Gỡ cách cuối cùng thì Nền tảng thôi hỏi mã khi đăng nhập, và bộ mã dự phòng cũ hết hiệu lực.",
};

export function mucNhanMaEmail(loai: Loai): MucHuongDan {
  return {
    tieuDe: "Nhận mã đăng nhập qua email",
    noiDung: `Thay cho ứng dụng xác thực, hoặc kèm theo, bạn có thể nhận mã 6 số qua email. Tài khoản Quản trị, Toàn quyền, Kế toán không dùng được cách này.

1. Vào trang **Tôi**, mục **Bảo mật đăng nhập**, bấm [[Nhận mã qua email]].
2. Gõ địa chỉ email riêng của bạn, bấm [[Gửi mã xác minh]]. Đã bật ứng dụng xác thực thì nhập thêm mã 6 số của ứng dụng hoặc một mã dự phòng.
3. Mở hộp thư (xem cả mục Thư rác), nhập mã 6 số trong thư, bấm [[Xác nhận email]]. Không thấy thư thì bấm [[Gửi lại mã]].
4. Lần đầu bật bảo mật hai lớp, Nền tảng hiện 10 mã dự phòng: cất như mục trên rồi bấm [[Tôi đã cất mã]].

### Đăng nhập bằng mã email

- Gõ PIN như cũ, bấm **Gửi mã qua email**, mở thư và nhập mã. Mã dùng được 10 phút; gửi mã mới thì mã cũ hết hiệu lực.
- Mỗi 15 phút gửi được tối đa 3 thư. Báo chưa gửi được email thì thử lại sau ít phút, hoặc bấm [[Dùng mã dự phòng]].
- Thư thật chỉ có mã 6 số, không có liên kết. Thấy thư lạ có liên kết thì đừng bấm, báo IT.

### Đổi hoặc gỡ email

- Bấm [[Đổi email]], gõ địa chỉ mới và nhập mã hiện có. Chỉ dùng email thì nhập một mã dự phòng.
- Muốn thôi nhận mã qua email: mở **Gỡ email nhận mã**, nhập mã, bấm [[Gỡ email]]. ${GO_EMAIL[loai]}
- Chỉ dùng email thì không tạo lại được bộ mã dự phòng: sắp hết mã thì bật thêm ứng dụng xác thực.`,
  };
}
