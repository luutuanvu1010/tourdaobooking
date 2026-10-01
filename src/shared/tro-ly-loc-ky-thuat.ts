// BỘ LỌC TÊN KỸ THUẬT (ADR-0070 điều 5) — hàm THUẦN. Chữ gửi sang OpenAI (kho tri thức của trợ lý Hỗ trợ) không được mang tên kỹ thuật của app.
// Dùng ở hai nơi: (1) bộ sinh `scripts/sinh-so-do-trang.mjs` — gặp vi phạm thì NÉM LỖI (không âm thầm bỏ); (2) `viPhamKho` (src/shared/tro-ly.ts) — cho MỌI
// đoạn của kho (hướng dẫn, cách app vận hành, sơ đồ trang, cấu trúc app, ngữ cảnh). Hàng rào ghi ở docs/SO-HANG-RAO.md.
//
// Chặn: tiền tố bảng và mọi tên dạng `a_b` / `A_B`; `/api/`; đuôi tệp mã; tên module tiếng Anh viết thường đứng riêng; câu lệnh SQL; `D1`/`d1` (trừ "hạng D1"
// — hạng bằng lái), `Worker`, `Cloudflare`, `SQL`/`SQLite`, `OpenAI`, `Turnstile`, `wrangler`, `esbuild`, `JWT`; mã quyền (`SALES`, `SUPER_ADMIN`…); mã ô quyền.
// Không chặn nhãn giao diện thật người dùng thấy trên màn hình ("Google Sheet", "Thử key", "Face ID").
// Không canh (dựa vào kỷ luật + người duyệt đọc diff tệp sinh): nhà cung cấp / thư viện khác ngoài danh sách, tên hàm kiểu lạc đà, đường dẫn trang.
import { MATRIX, PERMISSION_CODES } from "./permissions.ts";
import { TEN_PHAN_HE } from "./tro-ly-cau-truc-ten.ts";

export interface ViPhamKyThuat { readonly luat: string; readonly khop: string }

const escape = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Mã module (khoá của bảng tên = mọi thư mục `src/modules/*` + nút của ALLOWED_EDGES — bộ sinh ép đủ). Viết thường, đứng riêng (không dính chữ, `-`, `/`, `.`). */
const MODULE = new RegExp(`(?<![\\p{L}\\p{N}_./-])(?:${Object.keys(TEN_PHAN_HE).map(escape).join("|")})(?![\\p{L}\\p{N}_-])`, "u");
/** Mã ô quyền, nguyên văn (`order.view`, `order.leg.short_notice`…). */
const O_QUYEN = new RegExp(`(?<![\\w.])(?:${Object.keys(MATRIX).sort((a, b) => b.length - a.length).map(escape).join("|")})(?![\\w.])`);
/** Mã quyền app viết hoa, đứng riêng. */
const MA_QUYEN = new RegExp(`\\b(?:${PERMISSION_CODES.join("|")})\\b`);

const LUAT: readonly (readonly [RegExp, string])[] = [
  [/\b(?:ord|vc|bil|pty|stf|tl|ntf|loc|dsp|mnt|fbk|aut|cat|v)_[a-z0-9_]*/, "tên bảng (tiền tố bảng)"],
  [/\b[a-z][a-z0-9]*_[a-z0-9_]*[a-z0-9]\b/, "tên kỹ thuật dạng a_b (bảng, cột, hàm)"],
  [/\b[A-Z][A-Z0-9]*_[A-Z0-9_]*[A-Z0-9]\b/, "hằng kỹ thuật dạng A_B"],
  [/\/api\//i, "đường dẫn API"],
  [/\.(?:ts|mjs|sql|js)\b/i, "tên tệp mã"],
  [/\b(?:SELECT|INSERT|UPDATE|DELETE)\b/, "câu lệnh cơ sở dữ liệu"],
  [/\bSQL(?:ite)?\b/i, "tên cơ sở dữ liệu"],
  [/(?<!hạng )\bD1\b/i, "tên hạ tầng (D1)"], // "hạng D1" là hạng bằng lái — không chặn
  [/\b(?:OpenAI|Turnstile|wrangler|esbuild|JWT)\b/i, "tên công cụ / nhà cung cấp kỹ thuật"],
  [/\bWorkers?\b/i, "tên hạ tầng (Worker)"],
  [/\bCloudflare\b/i, "tên hạ tầng (Cloudflare)"],
  [O_QUYEN, "mã ô quyền"],
  [MA_QUYEN, "mã quyền"],
  [MODULE, "tên module"],
];

/** Vi phạm ĐẦU TIÊN (luật + đoạn khớp) hoặc null. */
export function viPhamKyThuat(s: string): ViPhamKyThuat | null {
  for (const [re, luat] of LUAT) {
    const m = re.exec(s);
    if (m) return { luat, khop: m[0] };
  }
  return null;
}
