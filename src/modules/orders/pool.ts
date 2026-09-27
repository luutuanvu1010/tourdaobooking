// Hàng chờ nhận (ADR-0030 S23-1, S23-2; ADR-0023 điều 1 gạch 1) — luật THUẦN (không I/O) dựng PHẦN HẸP của các đơn đang chờ người nhận, cho
// `GET /api/orders/pool` (hướng dẫn viên xem để bấm Nhận). Import kèm đuôi .ts (chạy trực tiếp bằng `node --test`, test cạnh tệp: pool.test.ts).
//
// DANH SÁCH TRƯỜNG ĐƯỢC PHÉP (Hiến chương 4.4): mỗi khoá của phần hẹp được dựng MỚI, tường minh, ở `toPoolOrder` — KHÔNG BAO GIỜ trải (`...`) đối tượng
// nguồn. Nguồn có thể mang đủ mọi trường của đơn (tên/SĐT/email khách, tiền, ghi chú, người lập, dòng tiền…) — phần hẹp CHỈ có: mã đơn, ngày đi, và
// theo từng dịch vụ: tên, số khách, nơi đón, giờ đón. Không tên/SĐT/email khách, không tiền, không ghi chú, không lịch sử, không người lập.
// Đây là NGOẠI LỆ CÓ TÊN của chú thích ô `contact.view` (`src/shared/permissions.ts`, gộp "điểm đón, giờ" vào liên hệ): nơi đón/giờ đón ở phần hẹp
// không đòi `contact.view` — bù lại nơi đón (chữ tự do, có thể chứa SĐT) bị che dãy số (`maskLongDigits`, Q-N).
import type { OrderStatus, PaxCounts, PoolOrderDto } from "../../shared/contracts.ts";
import { tripDeparted } from "../../shared/trip-rules.ts";

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

/** Ngưỡng che: một dãy từ NGẦN NÀY chữ số trở lên (chủ dự án, Q-N: "8 chữ số"). */
const MIN_MASKED_DIGITS = 8;
/**
 * Một "dãy số": bắt đầu và kết thúc bằng chữ số; giữa hai chữ số được chen dấu ngăn. Q-N: dấu cách, chấm, gạch nối. Ruling người thi công (Task 1.5,
 * CHẶT HƠN Q-N, đảo ngược được): thêm ngoặc đơn, dấu cộng, gạch dài (– —) — số bàn Nha Trang hay viết "(0258) 3521 234", số quốc tế "(+84) 905 …".
 * KHÔNG coi `/`, `,`, `:` là dấu ngăn (hai số cách nhau bằng "/" vẫn được che riêng từng số; giờ "6:30" không bị gộp).
 * Hai lớp ký tự rời nhau (chữ số / dấu ngăn) nên biểu thức chạy tuyến tính, không quay lui bùng nổ.
 */
const DIGIT_RUN = /\d(?:[\s.()+\-–—]*\d)*/g;
const MASK_CHAR = "•";

/**
 * Che mọi dãy từ 8 chữ số trở lên (đếm sau khi bỏ dấu ngăn — xem `DIGIT_RUN`): thay TỪNG chữ số của dãy bằng "•", giữ nguyên dấu ngăn và mọi chữ khác
 * ("Đón ở 0905 123.456 cổng sau" → "Đón ở •••• •••.••• cổng sau"). Cách che là bề mặt (ADR-0030 S23-2 để người thi công chọn): giữ dấu ngăn cho người đọc
 * thấy "ở đây có một số đã được ẩn". Dãy dưới 8 chữ số (số phòng, số nhà, giờ) giữ nguyên. `null` → `null`.
 */
export function maskLongDigits(text: string): string;
export function maskLongDigits(text: string | null): string | null;
export function maskLongDigits(text: string | null): string | null {
  if (text === null) return null;
  return text.replace(DIGIT_RUN, (run) => (run.replace(/\D/g, "").length >= MIN_MASKED_DIGITS ? run.replace(/\d/g, MASK_CHAR) : run));
}

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
function toPoolOrder(o: PoolSourceOrder): PoolOrderDto {
  return {
    orderId: o.id,
    orderCode: o.orderCode,
    departDate: departDateOf(o.services),
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
 */
export function toPoolOrders(sources: readonly PoolSourceOrder[], withHandler: ReadonlySet<string>, today: string): PoolOrderDto[] {
  return sources
    .filter((o) => o.status !== "cancelled" && !withHandler.has(o.id) && !tripDeparted(o.services.map((s) => s.departDate), today))
    .map(toPoolOrder)
    .sort(byDepartDate);
}
