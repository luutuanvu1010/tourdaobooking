// Luật THUẦN dùng chung server ↔ nơi khác trong repo (không I/O): nhận diện "dãy số dài giống số điện thoại" trong chữ tự do. MỘT nguồn sự thật cho
// regex + ngưỡng (Q-N, chủ dự án: "8 chữ số") — đổi ngưỡng hay cách nhận diện dấu ngăn chỉ sửa Ở ĐÂY. Các nơi dùng, hai cách xử lý khác nhau:
//  - `src/modules/orders/pool.ts` (`maskLongDigits`, ADR-0030 S23-2): CHE từng chữ số của dãy bằng "•" — hàng chờ nhận vẫn hiện được, chỉ ẩn số.
//  - `src/modules/dispatch/rules.ts` (`parseCancelReason`, lý do "Khác" khi HDV huỷ đơn — ADR-0030 điều 2, sửa đổi sau khi duyệt 2026-09-27): CHẶN HẲN
//    (400, không ghi), vì đây là nhật ký chỉ-thêm không xoá được (`migrations/0017_order_status_audit_guards.sql`) — che rồi vẫn ghi là không đủ.
//  - `src/modules/orders/money-adjustment.ts` (`parseMoneyEditInput`, lý do HDV sửa số khách — chủ dự án duyệt 2026-09-30 "Những lỗi của app đã báo
//    sửa luôn"): CHẶN HẲN như trên (lý do đi vào `audit_log.detail`, nhật ký chỉ-thêm). Hai nơi chặn dùng chung câu `PHONE_IN_TEXT_MESSAGE`.
// Import kèm đuôi .ts (chạy trực tiếp bằng `node --test`). Test cạnh tệp: text-guards.test.ts.

/** Ngưỡng: một dãy từ NGẦN NÀY chữ số trở lên coi là "giống số điện thoại/dãy số dài" (chủ dự án, Q-N: "8 chữ số"). */
export const MIN_LONG_DIGIT_RUN = 8;

/**
 * Một "dãy số": bắt đầu và kết thúc bằng chữ số; giữa hai chữ số được chen dấu ngăn — dấu cách, chấm, gạch nối, ngoặc đơn, dấu cộng, gạch dài (– —).
 * Q-N gốc chỉ nêu dấu cách/chấm/gạch nối; Ruling người thi công Task 1.5 (chặt hơn, đảo ngược được) thêm ngoặc đơn/dấu cộng/gạch dài — số bàn Nha
 * Trang hay viết "(0258) 3521 234", số quốc tế "(+84) 905 …". KHÔNG coi `/`, `,`, `:` là dấu ngăn (hai số cách nhau bằng "/" vẫn tách riêng; giờ
 * "6:30" không bị gộp). Hai lớp ký tự rời nhau (chữ số / dấu ngăn) nên biểu thức chạy tuyến tính, không quay lui bùng nổ.
 */
export const DIGIT_RUN = /\d(?:[\s.()+\-–—]*\d)*/g;

/** `text` có chứa ít nhất một dãy từ `MIN_LONG_DIGIT_RUN` chữ số trở lên không (đếm sau khi bỏ dấu ngăn ở trên)? */
export function hasLongDigitRun(text: string): boolean {
  for (const run of text.matchAll(DIGIT_RUN)) {
    if (run[0].replace(/\D/g, "").length >= MIN_LONG_DIGIT_RUN) return true;
  }
  return false;
}

/**
 * Câu báo lỗi DUY NHẤT khi chữ tự do bị chặn vì có dãy số dài (`hasLongDigitRun`) — dùng chung cho lý do "Khác" khi HDV huỷ đơn
 * (`dispatch/rules.ts` `parseCancelReason`, ADR-0037) và lý do sửa số khách (`orders/money-adjustment.ts` `parseMoneyEditInput`, chủ duyệt 2026-09-30).
 */
export const PHONE_IN_TEXT_MESSAGE = "Lý do không được chứa số điện thoại hoặc dãy số dài — chỉ ghi văn bản thường.";

const MASK_CHAR = "•";

/**
 * Che mọi dãy từ 8 chữ số trở lên (đếm sau khi bỏ dấu ngăn — `DIGIT_RUN`): thay TỪNG chữ số của dãy bằng "•", giữ nguyên dấu ngăn và mọi chữ khác
 * ("Đón ở 0905 123.456 cổng sau" → "Đón ở •••• •••.••• cổng sau"). Cách che là bề mặt (ADR-0030 S23-2): giữ dấu ngăn cho người đọc thấy "ở đây có một số
 * đã được ẩn". Dãy dưới 8 chữ số (số phòng, số nhà, giờ) giữ nguyên. `null` → `null`.
 * Chuyển về đây từ `src/modules/orders/pool.ts` (ADR-0047: nhật ký chặng đưa đón — `src/shared/chang-dua-don.ts` — cũng che, luật thuần dùng chung
 * không import module); `pool.ts` xuất lại tên cũ. KHÔNG áp cho chuỗi ngày "YYYY-MM-DD" (8 chữ số qua dấu gạch nối sẽ bị che) — chỉ che chữ tự do.
 */
export function maskLongDigits(text: string): string;
export function maskLongDigits(text: string | null): string | null;
export function maskLongDigits(text: string | null): string | null {
  if (text === null) return null;
  return text.replace(DIGIT_RUN, (run) => (run.replace(/\D/g, "").length >= MIN_LONG_DIGIT_RUN ? run.replace(/\d/g, MASK_CHAR) : run));
}

// Ký tự điều khiển ASCII + dấu tách dòng/đoạn Unicode (U+2028/2029 — giả xuống dòng) + dấu điều hướng hai chiều (U+200E/F, 202A–202E, 2066–2069 — đảo chiều chữ).
// Cố ý KHÔNG bỏ U+200B–200D (khoảng trắng/nối độ rộng 0): cần cho emoji ghép.
const UNICODE_LAYOUT = "\\u2028\\u2029\\u200e\\u200f\\u202a-\\u202e\\u2066-\\u2069";
const CONTROL_KEEP_NEWLINE = new RegExp(`[\\u0000-\\u0009\\u000b-\\u001f\\u007f${UNICODE_LAYOUT}]`, "g");
const CONTROL_ALL = new RegExp(`[\\u0000-\\u001f\\u007f${UNICODE_LAYOUT}]`, "g");

/**
 * Chuỗi tự do đi vào PNG/PDF (điểm đón, nơi check-in, ghi chú): bỏ ký tự điều khiển như booking (`schema.ts` của tourdaovn),
 * để xuống dòng giả không chen vào mẫu xuất. `multiline` = true chỉ giữ dấu xuống dòng; false gộp mọi khoảng trắng thành một dấu cách.
 * Chuyển về đây từ `src/modules/orders/fields.ts` (ADR-0047: nơi đón/nơi trả của chặng đưa đón kiểm ở luật thuần dùng chung `chang-dua-don.ts`);
 * `fields.ts` xuất lại — MỘT luật làm sạch cho mọi nơi đón (ô cũ lẫn chặng).
 */
export function cleanText(v: unknown, label: string, max: number, multiline: boolean): { value: string | null; error?: string } {
  if (v === undefined || v === null) return { value: null };
  if (typeof v !== "string") return { value: null, error: `${label} không hợp lệ.` };
  const unified = v.replace(/\r\n?/g, "\n");
  const s = (multiline ? unified.replace(CONTROL_KEEP_NEWLINE, " ") : unified.replace(CONTROL_ALL, " ").replace(/\s+/g, " ")).trim();
  if (!s) return { value: null };
  if (s.length > max) return { value: null, error: `${label} tối đa ${max} ký tự.` };
  return { value: s };
}

/**
 * Địa chỉ email nằm TRONG chữ tự do (không neo đầu/cuối — khác các hàm kiểm ô email của `parties`/`orders` vốn kiểm cả chuỗi). MỘT nguồn cho: luật nội dung
 * của hướng dẫn (`huong-dan.ts` — chặn email trong chữ hướng dẫn) và bộ che câu hỏi gửi trợ lý AI (`tro-ly.ts`, ADR-0066 điều 5). Cờ `g` để thay mọi chỗ;
 * nơi chỉ cần "có hay không" dùng `new RegExp(EMAIL_TRONG_CHU.source)` hoặc `.match` (không giữ `lastIndex`).
 */
// Neo ranh giới `(?<![\w.+-])` (kiểm độc lập I-1, 30/9): bản không neo thử lại từ MỌI vị trí trong một dãy dài không có "@" nên chạy bậc hai (100k ký tự ≈ 4,7 s);
// có neo thì chỉ bắt đầu ở đầu dãy — cùng kết quả khớp (đo lại trên các mẫu của huong-dan.test.ts / tro-ly.test.ts), thời gian tuyến tính.
export const EMAIL_TRONG_CHU = /(?<![\w.+-])[\w.+-]+@[\w-]+\.[\w.]+/g;
