// Ngắt dòng theo bề rộng đo được (ảnh xác nhận đơn, v1.0). THUẦN: nơi gọi đưa vào hàm đo — canvas `measureText` ở trình duyệt, hàm giả ở test.
// Quy tắc: "\n" luôn xuống dòng; chỉ ngắt ở dấu cách THƯỜNG (U+0020) — NBSP (U+00A0) là "keo" giữ số tiền và "₫" cùng dòng; từ dài hơn cả dòng (tên không dấu cách,
// đường dẫn) bị ngắt cứng theo CỤM ký tự để dấu tiếng Việt gõ rời không rời khỏi chữ gốc, ưu tiên cắt ngay sau dấu gạch nối/chấm/phẩy/gạch chéo/gạch dưới nếu nó nằm ở nửa sau
// của dòng; mỗi dòng có ít nhất một cụm nên không bao giờ lặp vô hạn.

/** Đo bề rộng (đơn vị tuỳ nơi gọi) của một chuỗi MỘT DÒNG. */
export type Measure = (text: string) => number;

const segmenter = typeof Intl !== "undefined" && typeof Intl.Segmenter === "function" ? new Intl.Segmenter("vi", { granularity: "grapheme" }) : null;

/** Tách thành cụm ký tự (chữ + dấu đi kèm là một). Không có `Intl.Segmenter` thì gom dấu tổ hợp vào chữ đứng trước. */
export function graphemes(text: string): string[] {
  if (segmenter) return Array.from(segmenter.segment(text), (s) => s.segment);
  return text.match(/\P{M}\p{M}*|\p{M}+/gu) ?? [];
}

/** Dấu mà sau nó cắt từ dài là "tự nhiên" (gạch nối, chấm, phẩy, chấm phẩy, gạch chéo, gạch dưới). */
const BREAK_AFTER = new Set(["-", ".", ",", ";", "/", "_"]);

/** Ngắt cứng một từ dài: mỗi dòng nhồi được nhiều cụm nhất (tìm "phi nước đại" rồi nhị phân — ít lần đo, mỗi lần chỉ đo chuỗi cỡ một dòng), ít nhất một cụm. */
function hardBreak(word: string, maxWidth: number, measure: Measure): string[] {
  const parts = graphemes(word);
  const lines: string[] = [];
  let start = 0;
  while (start < parts.length) {
    const fits = (n: number): boolean => n <= 1 || measure(parts.slice(start, start + n).join("")) <= maxWidth;
    const left = parts.length - start;
    let lo = 1; // luôn vừa (ít nhất một cụm)
    let hi = 2;
    while (hi <= left && fits(hi)) {
      lo = hi;
      hi *= 2;
    }
    hi = Math.min(hi, left + 1); // hi: số cụm KHÔNG vừa (hoặc quá phần còn lại)
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (fits(mid)) lo = mid;
      else hi = mid;
    }
    let take = lo;
    if (start + lo < parts.length) {
      // chưa phải đoạn cuối: ưu tiên cắt NGAY SAU một dấu gạch nối/chấm/gạch chéo (nằm ở nửa sau của dòng) thay vì giữa chữ — tên "Nguyễn-Thị-Hồng-…" không bị chẻ "Đặ|ng"
      for (let j = lo - 1; j >= Math.ceil(lo / 2); j--) {
        if (BREAK_AFTER.has(parts[start + j] ?? "")) {
          take = j + 1;
          break;
        }
      }
    }
    lines.push(parts.slice(start, start + take).join(""));
    start += take;
  }
  return lines;
}

function wrapParagraph(paragraph: string, maxWidth: number, measure: Measure): string[] {
  const words = paragraph.split(" ").filter((w) => w !== ""); // nhiều dấu cách liền nhau gộp một; dấu cách đầu/cuối bỏ
  if (words.length === 0) return [""];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current === "" ? word : `${current} ${word}`;
    if (measure(candidate) <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current !== "") lines.push(current);
    if (measure(word) <= maxWidth) {
      current = word;
    } else {
      const pieces = hardBreak(word, maxWidth, measure);
      current = pieces.pop() ?? "";
      lines.push(...pieces);
    }
  }
  lines.push(current);
  return lines;
}

/** Chia `text` thành các dòng rộng ≤ `maxWidth` (trừ khi một cụm ký tự đơn lẻ đã rộng hơn). Chuỗi rỗng → một dòng rỗng; dòng trống giữa các "\n" được giữ. */
export function wrapLines(text: string, maxWidth: number, measure: Measure): string[] {
  return text.split("\n").flatMap((p) => wrapParagraph(p, maxWidth, measure));
}
