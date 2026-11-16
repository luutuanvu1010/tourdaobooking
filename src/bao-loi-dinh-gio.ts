// BÁO KHI VIỆC TỰ ĐỘNG LỖI (Đợt 2 sau kiểm toán — đặc tả docs/superpowers/specs/2026-11-16-dot-2-lay-lai-duoc-du-lieu.md mục 2, chủ duyệt 16/11).
// Trước đây lỗi của việc định giờ chỉ nằm trong log. Nay gốc lắp ráp gom kết quả các việc của MỘT lượt Cron; việc nào hỏng thì vẫn log như cũ, và nếu là lượt
// 7 giờ sáng giờ VN thì gửi MỘT thư liệt kê các việc đang hỏng. Không lưu trạng thái: «tối đa một thư mỗi loại lỗi mỗi ngày» có được vì chỉ lượt 7 giờ được gửi.
// Đổi lại: lỗi thoáng qua (hỏng một lượt rồi tự lành trước 7 giờ sáng hôm sau) không có thư; lỗi kéo dài thì sáng hôm sau có thư. Thư chỉ có tên việc và tên lỗi
// (mã ngắn, vd `sheet_unreachable`, `TypeError`) — không dữ liệu khách, không địa chỉ, không câu lỗi thô của nhà cung cấp.
import { cauHinhThu, guiThu } from "./shared/gui-thu.ts";
import { laLuotBayGioSang } from "./shared/luot-bay-gio-sang.ts";

export const TEN_VIEC_DINH_GIO = {
  "dong-bo-danh-muc": "Đồng bộ danh mục dịch vụ từ Google Sheet",
  "don-anh-ve": "Xoá ảnh vé hết hạn lưu",
  "nhac-han-tra-sau": "Nhắc hạn trả sau",
  "don-phieu-dang-ky": "Dọn phiếu đăng ký",
  "soat-tien": "Soát tiền và vé hằng ngày",
} as const;
export type ViecDinhGio = keyof typeof TEN_VIEC_DINH_GIO;

/** Kết quả một việc: `null` = thành; chuỗi = mã lỗi ngắn; promise bị từ chối = tên lỗi. Không bao giờ ném. */
export async function ketQuaViec(p: Promise<unknown>): Promise<string | null> {
  try {
    const r = await p;
    return typeof r === "string" && r ? r : null;
  } catch (e) {
    const ten = e instanceof Error ? e.name : "unknown";
    return ten;
  }
}

export function soanThuLoi(loi: readonly { viec: ViecDinhGio; ma: string }[], ngay: string): { subject: string; text: string } {
  return {
    subject: `Tour Đảo: ${loi.length} việc tự động đang lỗi (sáng ${ngay})`,
    text: [
      `Lượt chạy tự động lúc 7 giờ sáng ${ngay} có ${loi.length} việc bị lỗi:`,
      "",
      ...loi.map((l) => `- ${TEN_VIEC_DINH_GIO[l.viec]} — mã lỗi: ${l.ma}`),
      "",
      "Việc cần làm: mở phiên làm việc với AI trong dự án tourdao-sales, dán thư này và nhờ tra log Cloudflare của Worker tourdao-sales.",
      "Mỗi sáng tối đa một thư; lỗi tự lành thì không có thư.",
    ].join("\n"),
  };
}

/** Gốc lắp ráp gọi một lần mỗi lượt Cron với promise của từng việc. KHÔNG BAO GIỜ NÉM. */
export async function baoLoiDinhGio(
  env: { FEEDBACK_NOTIFY_EMAIL?: unknown; EMAIL?: unknown; FEEDBACK_MAIL_FROM?: unknown; MOI_TRUONG?: unknown; THU_CHO_PHEP?: unknown },
  scheduledTime: number,
  viec: Readonly<Partial<Record<ViecDinhGio, Promise<unknown>>>>,
): Promise<void> {
  try {
    const loi: { viec: ViecDinhGio; ma: string }[] = [];
    for (const [ten, p] of Object.entries(viec) as [ViecDinhGio, Promise<unknown>][]) {
      const ma = await ketQuaViec(p);
      if (ma !== null) {
        loi.push({ viec: ten, ma });
        console.error(JSON.stringify({ level: "error", event: "dinh_gio_loi", viec: ten, ma }));
      }
    }
    if (loi.length === 0 || !laLuotBayGioSang(scheduledTime)) return;
    const to = typeof env.FEEDBACK_NOTIFY_EMAIL === "string" ? env.FEEDBACK_NOTIFY_EMAIL.trim() : "";
    if (!to) return;
    const d = new Date(scheduledTime + 7 * 3_600_000);
    const ngay = `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
    const kq = await guiThu(cauHinhThu(env), { to, ...soanThuLoi(loi, ngay) });
    if (!kq.ok) console.warn(JSON.stringify({ level: "warn", event: "dinh_gio_thu_hong", ly_do: kq.lyDo }));
  } catch (e) {
    console.error(JSON.stringify({ level: "error", event: "dinh_gio_bao_loi_hong", loi: e instanceof Error ? e.name : "unknown" }));
  }
}
