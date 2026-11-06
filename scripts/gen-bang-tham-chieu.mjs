// Sinh docs/BANG-THAM-CHIEU.md từ src/shared/bang-tham-chieu*.ts (ADR-0167). Chạy: npm run tham-chieu
// Bài src/bang-tham-chieu.test.ts so tệp này với bản sinh: lệch là đỏ.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { BO_QUA, VIEC_QUAN_TRONG } from "../src/shared/bang-tham-chieu-viec.ts";
import { CHU_DUNG_CHUNG, KHAI_NIEM, TEN_NHIEU_HANG } from "../src/shared/bang-tham-chieu-khai-niem.ts";
import { renderBangThamChieu } from "./bang-tham-chieu-lib.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
writeFileSync(join(ROOT, "docs/BANG-THAM-CHIEU.md"), renderBangThamChieu({ khaiNiem: KHAI_NIEM, chuDungChung: CHU_DUNG_CHUNG, tenNhieuHang: TEN_NHIEU_HANG, viec: VIEC_QUAN_TRONG, boQua: BO_QUA }));
console.log(`docs/BANG-THAM-CHIEU.md: ${KHAI_NIEM.length} khái niệm, ${CHU_DUNG_CHUNG.length} chữ dùng chung, ${VIEC_QUAN_TRONG.length} việc, ${BO_QUA.length} mục bỏ qua`);
