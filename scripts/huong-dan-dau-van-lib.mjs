// Dấu vân của bài theo việc: một băm cho các tệp mã bài dựa vào (neo, bỏ chú thích), một băm cho chính chữ bài. Dùng chung bài kiểm và lệnh xem lại.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { maskSource } from "./source-mask-lib.mjs";

const bam = (s) => createHash("sha256").update(s).digest("hex").slice(0, 16);

/** Bỏ chú thích để sửa lời chú thích không đòi xem lại bài. HTML có chú thích dạng khác nên bỏ riêng. */
const boChuThich = (tep, src) => (tep.endsWith(".html") ? src.replace(/<!--[\s\S]*?-->/g, "") : maskSource(src, { strings: false, comments: true })).replace(/\s+/g, " "); // maskSource thay chú thích bằng khoảng trắng cùng độ dài: gộp lại để thêm bớt chú thích không đổi dấu vân

export const dauVanNeo = (root, neo) => bam(neo.map((t) => `${t}\n${boChuThich(t, readFileSync(join(root, t), "utf8"))}`).join("\n"));
export const dauVanChu = (b) => bam(JSON.stringify([b.tieuDe, b.moDau, b.noiDung, b.neo]));
