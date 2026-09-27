/**
 * Gọi sớm (tối ưu tải 2026-09-27): gửi lời gọi dữ liệu của trang NGAY khi mã trang chạy, song song với `/api/auth/me` của `initShell()`, thay vì
 * nối đuôi sau nó (bớt một lượt chờ mạng mỗi lần mở trang). Lần lấy đầu dùng lời gọi đã gửi; mọi lần sau gọi mới như cũ.
 * Không đổi gì về quyền: máy chủ vẫn quyết từng lời gọi; trang vẫn chỉ DÙNG dữ liệu sau khi `initShell()` xong (hết phiên → `api()` tự về đăng nhập).
 * Lỗi về trước lúc được lấy (hoặc không bao giờ được lấy vì trang chuyển hướng) không thành "unhandled rejection"; ai lấy thì vẫn nhận đúng lỗi đó.
 */
export function goiSom<T>(goi: () => Promise<T>): () => Promise<T> {
  let som: Promise<T> | null = goi();
  som.catch(() => undefined);
  return () => {
    const p = som ?? goi();
    som = null;
    return p;
  };
}
