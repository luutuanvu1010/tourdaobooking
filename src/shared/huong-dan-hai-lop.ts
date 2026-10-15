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
