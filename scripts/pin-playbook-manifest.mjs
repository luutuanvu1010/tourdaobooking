// Ghi playbook/.PINNED_SHA256. Chạy: node scripts/pin-playbook-manifest.mjs
// CHỈ chạy sau khi việc chép/nâng ghim đã được chủ dự án duyệt (Hiến pháp N9): script này làm bài kiểm băm khớp với đĩa, nên chạy bừa là che một thay đổi.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { MANIFEST_NAME, renderManifest } from "./playbook-manifest-lib.mjs";

const dir = fileURLToPath(new URL("../playbook", import.meta.url));
const text = renderManifest(dir);
writeFileSync(join(dir, MANIFEST_NAME), text);
console.log(`Đã ghi playbook/${MANIFEST_NAME}: ${text.split("\n").length - 1} tệp`);
