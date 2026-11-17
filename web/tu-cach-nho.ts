// Nhớ «Tư cách» chọn lần cuối ở máy này (ADR-0213 Đ3.1, mốc B1 Task 14): chỉ là tiện lợi cho người dùng, KHÔNG phải bản chụp đơn nháp (khác `nhap-tam-don`, ADR-0192). Mọi lời gọi bọc
// try/catch: không lưu được thì bỏ qua, form vẫn chạy.
const KHOA = "tourdao.tuCachCuoi";
export const docTuCachCuoi = (): string | null => { try { return localStorage.getItem(KHOA); } catch { return null; } };
export const luuTuCachCuoi = (id: string): void => { try { localStorage.setItem(KHOA, id); } catch { /* không lưu được: bỏ qua */ } };
