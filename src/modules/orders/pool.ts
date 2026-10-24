// Hàng chờ nhận (ADR-0030 S23-1, S23-2; ADR-0023 điều 1 gạch 1) — luật THUẦN (không I/O) dựng PHẦN HẸP của các đơn đang chờ người nhận, cho
// `GET /api/orders/pool` (hướng dẫn viên xem để bấm Nhận). Import kèm đuôi .ts (chạy trực tiếp bằng `node --test`, test cạnh tệp: pool.test.ts).
//
// DANH SÁCH TRƯỜNG ĐƯỢC PHÉP (Hiến chương 4.4): mỗi khoá của phần hẹp được dựng MỚI, tường minh, ở `toPoolOrder` — KHÔNG BAO GIỜ trải (`...`) đối tượng
// nguồn. Nguồn có thể mang đủ mọi trường của đơn (tên/SĐT/email khách, tiền, ghi chú, người lập, dòng tiền…) — phần hẹp CHỈ có: mã đơn, ngày đi, và
// theo từng dịch vụ: tên, số khách, nơi đón, giờ đón. Không tên/SĐT/email khách, không tiền, không ghi chú, không lịch sử, không người lập.
// Đây là NGOẠI LỆ CÓ TÊN của chú thích ô `contact.view` (`src/shared/permissions.ts`, gộp "điểm đón, giờ" vào liên hệ): nơi đón/giờ đón ở phần hẹp
// không đòi `contact.view` — bù lại nơi đón (chữ tự do, có thể chứa SĐT) bị che dãy số (`maskLongDigits`, Q-N).
import type { OrderStatus, PaxCounts, PoolOrderDto } from "../../shared/contracts.ts";
import { maskLongDigits } from "../../shared/text-guards.ts";
import { tripDeparted } from "../../shared/trip-rules.ts";

export { maskLongDigits };

/** Một dịch vụ của đơn nguồn — chỉ phần phần hẹp cần (nơi gọi có thể đưa đối tượng giàu hơn; `toPoolOrder` không đọc gì khác). */
export interface PoolSourceService {
  name: string;
  pax: PaxCounts;
  departDate: string | null;
  pickupTime: string | null;
  pickupPlace: string | null;
}

/** Một đơn nguồn của hàng chờ (repository `listPoolSources` dựng từ SQL chỉ đọc đúng các cột này). */
export interface PoolSourceOrder {
  id: string;
  orderCode: string;
  status: OrderStatus;
  services: readonly PoolSourceService[];
}

// Ngưỡng + regex nhận diện "dãy số dài" và cả hàm che `maskLongDigits` nay là MỘT nguồn sự thật ở `src/shared/text-guards.ts` (chuyển về đó ở
// ADR-0047 — nhật ký chặng đưa đón cũng che; xuất lại tên cũ ở trên cho test và nơi gọi cũ). `dispatch/rules.ts` (`parseCancelReason`) dùng cùng
// ngưỡng để CHẶN HẲN thay vì che. Đổi ngưỡng/dấu ngăn/cách che thì sửa ở tệp đó, không sửa ở đây.

/**
 * Ngày đi của đơn = ngày khởi hành LỚN NHẤT trong các dịch vụ (cùng định nghĩa với `tripDeparted`, DK-T4-02 / ADR-0027 điều 3); null nếu chưa dịch vụ nào có
 * ngày. Đơn mới (từ 1.11, ADR-0021) mọi dịch vụ cùng một ngày; đơn cũ lệch ngày thì hiện ngày lớn nhất — khớp với luật "chưa qua ngày đi" dùng để lọc.
 */
function departDateOf(services: readonly PoolSourceService[]): string | null {
  let last: string | null = null;
  for (const s of services) if (s.departDate && (last === null || s.departDate > last)) last = s.departDate;
  return last;
}

/** Dựng phần hẹp của MỘT đơn — danh sách trường được phép, từng khoá tường minh (kể cả số khách: chép từng loại, không giữ tham chiếu đối tượng nguồn). */
function toPoolOrder(o: PoolSourceOrder, traLai: boolean): PoolOrderDto {
  return {
    orderId: o.id,
    orderCode: o.orderCode,
    departDate: departDateOf(o.services),
    traLai,
    services: o.services.map((s) => ({
      // Tên dịch vụ nhập tay cũng là chữ tự do (người lập gõ) — Ruling người thi công (Task 1.5, chặt hơn S23-2 vốn chỉ nêu nơi đón): che cả tên.
      name: maskLongDigits(s.name),
      pax: { adult: s.pax.adult, child: s.pax.child, senior: s.pax.senior, infant: s.pax.infant },
      pickupPlace: maskLongDigits(s.pickupPlace),
      pickupTime: s.pickupTime,
    })),
  };
}

/** Thứ tự hàng chờ (bề mặt, Ruling người thi công): ngày đi gần nhất lên trước, đơn chưa có ngày xuống cuối; hoà thì theo mã đơn. */
function byDepartDate(a: PoolOrderDto, b: PoolOrderDto): number {
  if (a.departDate !== b.departDate) {
    if (a.departDate === null) return 1;
    if (b.departDate === null) return -1;
    return a.departDate < b.departDate ? -1 : 1;
  }
  return a.orderCode < b.orderCode ? -1 : a.orderCode > b.orderCode ? 1 : 0;
}

/**
 * Hàng chờ nhận (ADR-0030 S23-2): trong các đơn nguồn, giữ đơn CHƯA huỷ, KHÔNG có người phụ trách đang mở (`withHandler` — tập do `dispatch` trả lời qua
 * `ctx.ordersWithHandler`, S20-13; `orders` không tự đọc dữ liệu phân công), CHƯA qua ngày đi (`tripDeparted`, giờ VN `today`; đơn chưa có ngày nào vẫn
 * giữ) — rồi dựng phần hẹp. Đây là NGUỒN QUYẾT ĐỊNH của ba điều kiện đó; câu SQL của repository chỉ lọc thô trước (tập cha) cho đỡ đọc.
 * `traLai` (ADR-0030 điều 3): tập đơn «được trả lại» do `audit` trả lời (`donDuocTraLai`) — chỉ thành cờ boolean của từng đơn.
 */
export function toPoolOrders(sources: readonly PoolSourceOrder[], withHandler: ReadonlySet<string>, today: string, traLai: ReadonlySet<string>): PoolOrderDto[] {
  return sources
    .filter((o) => o.status !== "cancelled" && !withHandler.has(o.id) && !tripDeparted(o.services.map((s) => s.departDate), today))
    .map((o) => toPoolOrder(o, traLai.has(o.id)))
    .sort(byDepartDate);
}
