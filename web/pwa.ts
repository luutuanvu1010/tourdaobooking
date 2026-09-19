/** Đăng ký service worker (khung app mở tức thì). Không hỗ trợ hoặc lỗi thì bỏ qua: app vẫn chạy như web thường. */
export function registerServiceWorker(): void {
  if (!("serviceWorker" in navigator)) return;
  const register = () => void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  if (document.readyState === "complete") register();
  else window.addEventListener("load", register, { once: true });
}
