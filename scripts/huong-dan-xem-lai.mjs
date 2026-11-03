// Ghi dấu vân mới cho một bài theo việc SAU KHI đã đọc lại bài và mã. Dùng: npm run huong-dan:xem-lai -- <id bài>
// Lệnh này là lời khai «đã xem lại»; máy không biết người chạy có đọc thật hay không (đặc tả 2026-11-03, mục Giới hạn).
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { APP_VERSION } from "../src/shared/app-info.ts";
import { BAI_VIEC } from "../src/shared/huong-dan-bai-noi-dung.ts";
import { DAU_VAN } from "../src/shared/huong-dan-dau-van.ts";
import { dauVanChu, dauVanNeo } from "./huong-dan-dau-van-lib.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const id = process.argv[2];
const chon = id === "--tat-ca" ? BAI_VIEC : BAI_VIEC.filter((b) => b.id === id);
if (!chon.length) {
  console.error(`Không có bài "${id ?? ""}". Các bài: ${BAI_VIEC.map((b) => b.id).join(", ")}`);
  process.exit(2);
}
const ngay = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
const moi = { ...DAU_VAN };
for (const b of chon) moi[b.id] = { neo: dauVanNeo(ROOT, b.neo), chu: dauVanChu(b), ban: APP_VERSION, ngay };
const dong = BAI_VIEC.filter((b) => moi[b.id]).map((b) => `  ${JSON.stringify(b.id)}: ${JSON.stringify(moi[b.id])},`);
writeFileSync(join(ROOT, "src/shared/huong-dan-dau-van.ts"), `// SINH bởi scripts/huong-dan-xem-lai.mjs, không sửa tay. Mỗi bài: dấu vân lúc xem lại gần nhất, kèm bản và ngày.
export interface DauVanBai { readonly neo: string; readonly chu: string; readonly ban: string; readonly ngay: string }
export const DAU_VAN: Readonly<Record<string, DauVanBai>> = {
${dong.join("\n")}
};
`);
console.log(`Đã ghi dấu vân: ${chon.map((b) => b.id).join(", ")} (bản ${APP_VERSION}, ngày ${ngay}).`);
