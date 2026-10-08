// CHỦ DỰ ÁN QUÉT THỬ MÃ QR (đặc tả QR thanh toán §8.6 — AI không tự xác nhận được mục này). Chạy ở thư mục gốc của worktree:
//   node docs/evidence/2026-10-08-qr-thanh-toan/kich-ban/chu-quet-thu.mjs
// Dựng Nền tảng trên D1 TẠM ở máy này (không đụng dữ liệu thật, không --remote), có sẵn tài khoản Toàn quyền thử và MỘT đơn thử đã xác nhận còn 1.350.000đ.
// In địa chỉ + SĐT + PIN để đăng nhập bằng trình duyệt trên CHÍNH máy này. Chủ tự cài tài khoản thật của công ty ở Danh bạ → Tour Đảo → "Tài khoản nhận tiền"
// (số tài khoản chỉ nằm trong D1 tạm, mất khi thoát), mở đơn thử, bấm "QR thanh toán", đổi số tiền (vd 1.000) rồi quét màn hình bằng ứng dụng ngân hàng.
// Thoát: Ctrl+C — D1 tạm bị xoá.
import { ACCOUNTS, goiApi, startEnv } from "./qr-chung.mjs";

const env = await startEnv();
let dangDung = false;
const dung = async () => {
  if (dangDung) return;
  dangDung = true;
  await env.stop();
  process.exit(0);
};
process.on("SIGINT", dung);
process.on("SIGTERM", dung);

try {
  const { lapDon } = goiApi(env);
  const don = await lapDon("Khách Quét Thử", "0900000999", 1);
  console.log("\n================ CHỦ QUÉT THỬ MÃ QR ================");
  console.log(`Mở bằng trình duyệt trên máy này: ${env.base}/login`);
  console.log(`Đăng nhập tài khoản Toàn quyền thử:  SĐT ${ACCOUNTS.chu.phone}   PIN ${ACCOUNTS.chu.pin}`);
  console.log(`Đơn thử: ${don.orderCode} (còn 1.350.000đ) — mở thẳng: ${env.base}/order?id=${encodeURIComponent(don.id)}`);
  console.log("Thoát: Ctrl+C (D1 tạm bị xoá cùng số tài khoản đã gõ).");
  console.log("====================================================\n");
} catch (e) {
  console.error(e);
  await dung();
}
