// Dải «việc gấp» đầu Trang chủ máy tính (Phương án A, chủ duyệt 31/10/2026; đặc tả docs/superpowers/specs/2026-10-31-trang-chu-phuong-an-a/DAC-TA.md mục 3).
// Hàm THUẦN, một nơi: nhận danh sách đơn đang chờ xác nhận (từ `GET /api/orders/cho-xac-nhan`) và giờ hiện tại, trả có hiện dải không và câu chữ.
// Chỉ `web/home.ts` và bài kiểm được import tệp này: KHÔNG import từ muc-giao-dien.ts / shell.ts (gói web/orders.ts sát trần byte).
//
// Một đơn chờ xác nhận là «gấp» khi thoả MỘT trong hai: (a) đã chờ QUÁ 2 giờ kể từ lúc gửi (`guiLuc`; đúng 2 giờ chưa quá); (b) ngày đi là HÔM NAY hoặc NGÀY MAI theo giờ Việt Nam.
// Dải hiện khi có ít nhất một đơn gấp; không thì ẩn hẳn. Chỉ người giữ ô `order.confirm.review` mới có dải (chỉ họ gọi được danh sách chờ).
// Hạn 15 phút (`quaHan` của máy chủ, đổi theo giờ trong ngày) là chuyện KHÁC: không dùng ở đây.
import { can } from "./permissions.ts";
import type { PermissionHolder } from "./permissions.ts";
import { addDays, vnToday } from "./vn-date.ts";

/** Ngưỡng «chờ quá» — chủ chốt 2 giờ (31/10). */
export const NGUONG_CHO_QUA_MS = 2 * 60 * 60 * 1000;

/** Phần của một dòng `DonChoXacNhanDto` mà luật cần. `ngayDi` null = đơn chưa có ngày đi: chỉ xét điều kiện chờ quá 2 giờ. */
export interface DonChoGap {
  readonly ngayDi: string | null;
  /** ISO UTC, cột `submitted_at`. Chuỗi không đọc được ⇒ coi là chưa quá 2 giờ (không đoán). */
  readonly guiLuc: string;
}

export interface DaiViecGap {
  readonly hien: boolean;
  /** Tổng đơn đang chờ xác nhận (không chỉ đơn gấp). */
  readonly tong: number;
  /** Số đơn đã chờ quá 2 giờ. */
  readonly quaHaiGio: number;
  /** Số đơn có ngày đi hôm nay hoặc ngày mai. */
  readonly diSom: number;
  /** Dòng đậm: «3 đơn chờ xác nhận, 1 đơn quá 2 giờ» (tổng trước, rồi số quá 2 giờ nếu có). */
  readonly cau: string;
  /** Dòng phụ nhạt; `null` khi không có gì thêm để nói. */
  readonly phu: string | null;
}

const AN: DaiViecGap = { hien: false, tong: 0, quaHaiGio: 0, diSom: 0, cau: "", phu: null };

const daChoQua = (guiLuc: string, nowMs: number): boolean => {
  const t = Date.parse(guiLuc);
  return Number.isFinite(t) && nowMs - t > NGUONG_CHO_QUA_MS;
};

/**
 * `don`: `undefined` = người này không dùng nguồn; `null` = nguồn lỗi (không biết ⇒ không dựng dải, thẻ «Đang chờ bạn» là chỗ hiện "—" + Thử lại).
 * Ngày «hôm nay», «ngày mai» tính theo GIỜ VIỆT NAM của `nowMs` (không theo múi giờ máy).
 */
export function viecGap(who: PermissionHolder, don: readonly DonChoGap[] | null | undefined, nowMs: number): DaiViecGap {
  if (!can(who, "order.confirm.review") || !don || don.length === 0) return AN;
  const homNay = vnToday(new Date(nowMs));
  const ngayMai = addDays(homNay, 1);
  let quaHaiGio = 0;
  let diSom = 0;
  let gap = 0;
  for (const d of don) {
    const cho = daChoQua(d.guiLuc, nowMs);
    const som = d.ngayDi === homNay || d.ngayDi === ngayMai;
    if (cho) quaHaiGio++;
    if (som) diSom++;
    if (cho || som) gap++;
  }
  if (gap === 0) return AN;
  return {
    hien: true,
    tong: don.length,
    quaHaiGio,
    diSom,
    cau: `${don.length} đơn chờ xác nhận${quaHaiGio > 0 ? `, ${quaHaiGio} đơn quá 2 giờ` : ""}`,
    phu: diSom > 0 ? `${diSom} đơn có khách đi hôm nay hoặc ngày mai.` : null,
  };
}
