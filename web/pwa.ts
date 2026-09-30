/** Chủ quyết 30/9 "khoá chức năng phóng": iOS Safari có thể bỏ qua viewport user-scalable=no — chặn thêm cử chỉ chụm hai ngón (sự kiện riêng của WebKit). */
function khoaPhongTo(): void {
  for (const ten of ["gesturestart", "gesturechange"]) document.addEventListener(ten, (e) => e.preventDefault(), { passive: false });
}

/** Đăng ký service worker (khung app mở tức thì). Không hỗ trợ hoặc lỗi thì bỏ qua: app vẫn chạy như web thường. Kèm khoá phóng to. */
export function registerServiceWorker(): void {
  khoaPhongTo();
  if (!("serviceWorker" in navigator)) return;
  const register = () => void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  if (document.readyState === "complete") register();
  else window.addEventListener("load", register, { once: true });
}
