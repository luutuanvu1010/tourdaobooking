// Bài kiểm KIẾN TRÚC (ADR-0002 điều 8, ADR-0003): ranh giới module, sổ dữ liệu, chuẩn bảng mới, ranh giới SQL của module "nghiêm".
// Ràng buộc không có bài kiểm này là ràng buộc rỗng (Điều 8.2, 8.5: mặc định từ chối). Ngoại lệ có hạn ghi ở LEGACY bên dưới.
// SQL được kiểm bằng CHÍNH SQLite (EXPLAIN trên schema "ranh giới": view công bố v_* thay bằng bảng rỗng cùng cột) — không quét chuỗi SQL.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { renderDictionaryMarkdown } from "../scripts/data-dictionary-lib.mjs";
import { maskSource } from "../scripts/source-mask-lib.mjs";
import { registeredSql, type SqlEntry } from "./shared/sql-registry.ts";
import { vnToday } from "./shared/vn-date.ts";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const SRC = join(ROOT, "src");
const WEB = join(ROOT, "web");

/** Chiều phụ thuộc cho phép (ADR-0002 + ADR-0008). Module mới PHẢI khai ở đây. Không được có vòng. */
const ALLOWED_EDGES: Record<string, readonly string[]> = {
  accounts: ["staff", "auth", "audit", "maintenance"], // maintenance: không cho đổi SĐT của tài khoản chủ dự án (PATCH /api/staff/:id)
  audit: [],
  // ADR-0024 điều 2 (sổ tiền lượt 1, accepted 2026-09-29): billing giữ lần thu, phiếu sổ, dòng nợ; lấy câu `UPDATE orders` CHƯA chạy từ orders/index.ts và câu
  // bảo vệ "còn là người phụ trách" từ dispatch/index.ts (cạnh billing → dispatch CHỈ cho câu đó — ADR-0024 đ2); nhãn người qua staff/parties; nhật ký qua audit.
  billing: ["orders", "parties", "staff", "dispatch", "audit"],
  // maintenance: đăng nhập bị chặn khi bảo trì; GET /api/auth/config và /me báo trạng thái (chỉ đọc).
  // parties: ADR-0024 6.2 — GET /api/auth/config trả tên + MST công ty chủ qua hàm công bố ownerCompany (chỉ đọc; auth vốn đã tới parties bắc cầu qua
  // staff). NỚI hàng rào đã duyệt (Điều 9.4) — đã duyệt 2026-09-28 (chủ trả lời 'duyệt luật T2b'), xem docs/superpowers/plans/2026-09-28-t2b-de-xuat-luat.md.
  auth: ["staff", "maintenance", "parties"],
  bangtin: [], // ADR-0022: lá, không import module nào — dữ liệu đơn (mã đơn, ai lập/phụ trách) do gốc lắp ráp đọc qua orders/dispatch rồi truyền vào, không phải bangtin tự đọc
  catalog: ["audit"],
  // ADR-0024 điều 6 (6.2): GET /api/company đọc định danh Tour Đảo qua hàm công bố ownerCompany của parties; company_profile chỉ còn logo_url (6.3).
  // NỚI hàng rào đã duyệt (Điều 9.4) — đã duyệt 2026-09-28 (chủ trả lời 'duyệt luật T2b'), xem docs/superpowers/plans/2026-09-28-t2b-de-xuat-luat.md.
  company: ["parties"],
  // ADR-0006 điều 8: dispatch → orders, parties, locations (khoá ngoại của dsp_assignment). `orders` KHÔNG import dispatch và không có SQL đọc dsp_*:
  // `orders` cần "người dùng có phải người phụ trách" và "câu đặt người phụ trách mặc định cho đơn mới" thì gốc lắp ráp (src/index.ts) tiêm vào ctx (ADR-0007 điều 4(b)).
  // Import thật của mã: `orders` (findOrderOwner: đơn có không, ai lập), `staff` (tài khoản người được giao / danh sách người có thể được giao), `audit` (auditStatement).
  // View v_dsp_order_handler đọc view công bố v_pty_party_label và v_stf_staff_label ở tầng SQL (cạnh dispatch → parties, dispatch → staff).
  dispatch: ["orders", "parties", "locations", "staff", "audit"],
  feedback: ["staff", "audit"], // đọc nhãn nhân viên (v_stf_staff_label) + ghi nhật ký `feedback_*`; không module nào import feedback
  locations: ["audit"],
  maintenance: ["audit"], // ghi nhật ký `maintenance_changed`; là lá của cạnh auth → maintenance (không vòng)
  // pricing: ADR-0024 điều 2 — tỷ lệ chiết khấu/hoa hồng chụp trong luồng của đơn lúc Xác nhận (lượt 2; lượt 1 chưa import).
  orders: ["audit", "catalog", "staff", "parties", "locations", "pricing"],
  parties: ["locations", "audit"],
  // ADR-0024 điều 1–2: chính sách giá theo ngày (lượt 2). GIẢ ĐỊNH BỀ MẶT (kế hoạch Task 1a): lượt 1 CHƯA tạo thư mục src/modules/pricing/ (không SQL ⇒
  // chưa vào STRICT được) — chỉ khai ranh giới; tạo thư mục + STRICT ở lượt 2.
  pricing: ["parties", "catalog", "audit"],
  // ADR-0024 điều 1: biên nhận theo danh sách trắng — KHÔNG bảng, KHÔNG SQL (hạng KHONG_BANG); chuyển tay cầm DB cho hàm công bố của các module dưới.
  receipt: ["orders", "billing", "parties", "company"],
  staff: ["parties", "audit"],
  // ADR-0034: đọc view công bố (sự kiện đơn, người lập, người phụ trách, nhãn) + auditStatement + getStaffAccount; không module nào import thongbao
  thongbao: ["audit", "orders", "dispatch", "staff"],
  // ADR-0040 D1: Vận chuyển lượt 1a đọc parties qua hàm công bố (ownerCompany — chủ xe; expiringDriverDocuments — danh sách sắp hết hạn) và khoá ngoại
  // vc_vehicle.owner_party_id; ghi nhật ký qua auditStatement. Không module nào import van-chuyen.
  // NỚI hàng rào đã duyệt (Điều 9.4) — đã duyệt 2026-09-28 (chủ trả lời 'Duyệt tất cả, có mục Hiến chương'), xem docs/superpowers/plans/2026-09-28-van-chuyen-1a-de-xuat-luat.md.
  // ADR-0049 D1: suất trỏ chặng `ord_transfer_leg` + hàm hẹp của `orders` (chỉ gọi trong thân route sau `can()` — bài src/orders-cong-bo.test.ts); điểm dừng
  // trỏ `loc_location`. Vẫn KHÔNG module nào import van-chuyen (bài "không module nào import van-chuyen" ở dưới). NỚI hàng rào (Điều 9.4) — ĐÃ DUYỆT 2026-09-30 (lần 17)
  // ở docs/superpowers/plans/2026-09-29-adr-0049-de-xuat-luat.md mục 1.
  "van-chuyen": ["parties", "audit", "orders", "locations"],
  // ADR-0066: trợ lý Hỗ trợ (kho tri thức là tệp thuần ở src/shared/). ADR-0069 (accepted 2026-09-30) kéo theo hai cạnh: `audit` — ghi `tro_ly_settings_changed`
  // cùng lô với bản cài đặt mới (điều 5: "ai đổi lúc nào", không nội dung); `staff` — CHỈ ở tầng SQL, tên người hỏi / người lưu qua view công bố
  // v_stf_staff_label (điều 5: lịch sử "ai hỏi"; mẫu `feedback`). Không module nào import tro-ly. NỚI cạnh (Điều 9.4): ĐÃ DUYỆT 2026-09-30 (chủ chọn 'Đồng ý cả hai' sau báo cáo kiểm độc lập ADR-0069).
  "tro-ly": ["audit", "staff"],
};

/** Module đã áp điều 8(b) (SQL đăng ký qua defineSql). Module cũ nằm ở LEGACY cho tới hạn ghi kèm. */
const STRICT: readonly { module: string; file: string }[] = [
  { module: "auth", file: "modules/auth/repository.ts" },
  { module: "billing", file: "modules/billing/repository.ts" }, // ADR-0024 điều 1: nghiêm từ ngày đầu (sổ tiền lượt 1 — NT-R2)
  { module: "company", file: "modules/company/repository.ts" },
  { module: "dispatch", file: "modules/dispatch/repository.ts" },
  { module: "feedback", file: "modules/feedback/repository.ts" },
  { module: "locations", file: "modules/locations/repository.ts" },
  { module: "maintenance", file: "modules/maintenance/repository.ts" },
  { module: "parties", file: "modules/parties/repository.ts" },
  { module: "staff", file: "modules/staff/repository.ts" },
  { module: "thongbao", file: "modules/thongbao/repository.ts" },
  { module: "van-chuyen", file: "modules/van-chuyen/repository.ts" }, // ADR-0040 D1 (siết: SQL đi qua defineSql, EXPLAIN)
  { module: "van-chuyen", file: "modules/van-chuyen/chuyen-repo.ts" }, // ADR-0049 D1 (siết, Task A13 — R-P4 (ii) "bài nhận hai tệp"): SQL chuyến xe
  { module: "tro-ly", file: "modules/tro-ly/repository.ts" }, // ADR-0066: nghiêm từ ngày đầu
];

/**
 * NGOẠI LỆ CÓ HẠN (ADR-0002 điều 8(b)): SQL của module cũ chưa đăng ký — còn JOIN thẳng bảng module khác.
 * Hạn: `audit` và `orders` đã bỏ JOIN thẳng bảng (đọc qua view công bố) ở N1-B nhưng SQL của chúng chưa đăng ký — chuyển STRICT khi được chạm ở N2;
 * `wonGuard` của orders (đọc audit_log) ở lại tới N2; `accounts` chưa có SQL riêng đáng kể — chuyển STRICT khi có SQL mới. `catalog`: SQL mới (nhóm dịch vụ) đã ở tệp nửa nghiêm `nhom-repo.ts`; SQL cũ của `repository.ts` còn LEGACY tới hạn CATALOG_LEGACY_HAN (ADR-0058 Đ6).
 */
const LEGACY = ["accounts", "audit", "catalog", "orders"] as const;

/** ADR-0058 Đ6 (lệch có hạn, chủ chốt hạn 2027-03-31): `catalog` còn LEGACY; SQL mới chỉ ở tệp nửa nghiêm. Quá hạn → đỏ. Gỡ: đổi SQL cũ sang defineSql, bỏ xoá cứng catalog_override, đưa catalog lên STRICT. */
const CATALOG_LEGACY_HAN = "2027-03-31";
test("ADR-0058 Đ6: lệch có hạn — catalog còn LEGACY tới hạn", () => {
  if (!(LEGACY as readonly string[]).includes("catalog")) return; // đã lên STRICT: bài tự hết việc (bỏ hằng cùng lúc)
  assert.ok(CATALOG_LEGACY_HAN >= vnToday(new Date()), `catalog quá hạn LEGACY ${CATALOG_LEGACY_HAN} — lên STRICT hoặc chủ dự án gia hạn`);
});

/**
 * Hạng "module không dùng cơ sở dữ liệu" (KHONG_DB, ADR-0022, chủ duyệt 2026-09-25 — kế hoạch Bảng tin): nghiêm hơn
 * STRICT — không bảng, không câu SQL, không `env.DB`/`.prepare(`/`.batch(`/`DB.exec(` ở BẤT KỲ tệp nào trong module
 * (kể cả `index.ts`/`tram.ts`, không chỉ `repository.ts` — module này còn không có `repository.ts`).
 */
const KHONG_DB = ["bangtin"] as const;

/**
 * Hạng "module không bảng" (KHONG_BANG, ADR-0024 điều 1 — accepted 2026-09-29): chặt hơn STRICT (không bảng, không view, không câu SQL nào — không
 * `.prepare(`/`.batch(`/`.exec(` ở BẤT KỲ tệp `.ts` nào của module), lỏng hơn KHONG_DB (ĐƯỢC nhắc `env.DB` để chuyển tay cầm cho HÀM CÔNG BỐ của module
 * mình phụ thuộc). Hôm nay chỉ `receipt` (biên nhận = một cách nhìn dữ liệu của module khác theo danh sách trắng). Siết thêm, không nới KHONG_DB.
 */
const KHONG_BANG = ["receipt"] as const;

/**
 * ADR-0047 A3 (T3b) — SIẾT: tập bảng mang cờ `legacy: true` ở docs/data-dictionary.json bị KHOÁ đúng danh sách này (bảng tên cũ, có trước luật tiền tố).
 * Bảng mới không được trốn luật tiền tố (ADR-0002 điều 2) bằng cách đánh dấu `legacy` — bài kiểm "tập bảng legacy" ở cuối tệp đỏ ngay. Danh sách
 * chỉ được CO lại (một bảng cũ đổi tên sang có tiền tố); thêm tên vào đây là NỚI hàng rào (Điều 9.4) — cần chủ duyệt.
 */
const LEGACY_TABLES: readonly string[] = [
  "audit_log", // module audit — nhật ký, có từ 0001
  "catalog_item", // catalog — danh mục đồng bộ Sheet
  "catalog_override", // catalog — ghi đè có chủ đích
  "catalog_sync", // catalog — trạng thái đồng bộ
  "company_profile", // company — chỉ còn logo_url (ADR-0024 6.3)
  "login_attempt", // auth — chống dò PIN
  "order_item", // orders — dòng tiền
  "order_money_adjustment", // orders — dòng điều chỉnh chỉ-thêm (ADR-0014 điều 6)
  "order_service", // orders — dịch vụ của đơn
  "orders", // orders — đơn
  "staff", // staff — tài khoản (cột chết role/full_name, ADR-0005)
];

/**
 * TỆP "NỬA NGHIÊM" (ADR-0047 A3, Ruling R5) — SIẾT: module còn ở LEGACY nhưng TỆP này đã theo điều 8(b): mọi câu SQL đăng ký bằng `defineSql`, chịu bài
 * EXPLAIN (chỉ chạm bảng của mình / view công bố / khoá ngoại được phép) và bài `.prepare(<chuỗi thô>)` / `db.exec(<chuỗi thô>)`. Không quét cả thư mục
 * module (SQL cũ của `orders/repository.ts` vẫn là nợ LEGACY). Module lên STRICT thì bỏ khỏi đây.
 */
const NUA_NGHIEM: readonly { module: string; file: string }[] = [
  { module: "orders", file: "modules/orders/chang-hanh-khach-repo.ts" },
  // Sổ tiền lượt 1 (ADR-0024 điều 3–4 — SIẾT): câu mốc "Đã giao" / "Hoàn thành" + đọc trạng thái cho billing, mọi câu qua defineSql + EXPLAIN.
  { module: "orders", file: "modules/orders/hoan-tat-repo.ts" },
  // ADR-0068 Đ1 bước 5 (SIẾT): đọc đơn theo người đặt + câu đổi người đặt khi gộp hồ sơ — mọi câu qua defineSql + EXPLAIN.
  { module: "orders", file: "modules/orders/nguoi-dat-gop-repo.ts" },
  // ADR-0058 Đ6: SQL MỚI của `catalog` (hai bảng `ctl_`) chỉ ở tệp này; `repository.ts` cũ còn LEGACY tới CATALOG_LEGACY_HAN.
  { module: "catalog", file: "modules/catalog/nhom-repo.ts" },
];

/**
 * NGOẠI LỆ CÓ TÊN của R-N1-9 ("không xoá cứng bảng mới") — ADR-0047 A1, A2: chặng và hành khách của ĐƠN NHÁP xoá–chèn lại cùng lô khi lưu nháp
 * (như order_service). Lệch có chủ ý hẹp của Hiến chương 5.5 (chủ trả lời Q0 2026-09-29 "Cách 1: chỉ giữ bản cuối", điều phối chuyển lại). NỚI hàng
 * rào đã duyệt (Điều 9.4) — ĐÃ DUYỆT 2026-09-29 (lần 5) ở docs/superpowers/plans/2026-09-29-adr-0047-de-xuat-luat.md mục 2. Chỉ tên trong danh sách; mỗi câu phải có
 * điều kiện đơn nháp TRONG câu, và bảng đích phải có trigger `<bảng>_no_delete` (cấm xoá khi đơn không còn nháp). Danh sách chỉ được co lại (bài
 * "ngoại lệ thừa" ở cuối tệp).
 */
const XOA_CUNG_NHAP: readonly string[] = ["orders.leg_delete_draft", "orders.passenger_delete_draft"];

/**
 * NỢ CÓ TÊN, CÓ HẠN (ADR-0047 A3 "ghi nợ có tên, có hạn"): câu của tệp nửa nghiêm được đọc thẳng `audit_log` CHỈ trong lính gác `wonGuard`
 * (`EXISTS (SELECT 1 FROM audit_log WHERE id = ?)`) cùng lô với lưu nháp / sửa chuyến / route chặng / route hành khách (nợ LEGACY hiện có của orders:
 * "`wonGuard` của orders (đọc audit_log) ở lại tới N2" — xem LEGACY ở trên; `v_aud_order_event` lọc bỏ `updated`/`trip_updated` nên không thay được).
 * NỚI hàng rào đã duyệt (Điều 9.4) — ĐÃ DUYỆT 2026-09-29 (lần 5) ở docs/superpowers/plans/2026-09-29-adr-0047-de-xuat-luat.md mục 3 (hạn ĐỀ XUẤT, chủ chốt). Quá hạn → đỏ.
 * Gỡ khi: `orders` lên STRICT với lính gác qua view công bố của `audit`, hoặc ADR khác chọn cơ chế khác. Câu đầu lô (tự quyết thắng/thua, không lính gác)
 * mang tên KHÁC câu có lính gác — chỉ tên có lính gác vào đây.
 */
const DOC_AUDIT_LOG_WONGUARD = {
  han: "2027-03-31",
  ten: [
    "orders.leg_delete_draft", "orders.leg_insert_guarded", "orders.leg_update_guarded", "orders.leg_close_guarded", "orders.passenger_delete_draft",
    "orders.passenger_insert_guarded", "orders.passenger_void_guarded", "orders.order_touch_guarded", "orders.service_mirror_update_guarded",
  ],
} as const;

// vc_/vc: ADR-0040 D1 — NỚI hàng rào đã duyệt (Điều 9.4), đã duyệt 2026-09-28 (chủ trả lời 'Duyệt tất cả, có mục Hiến chương'), xem docs/superpowers/plans/2026-09-28-van-chuyen-1a-de-xuat-luat.md.
// ord_: ADR-0047 A3 (bảng mới của orders; bảng cũ orders/order_item/order_service/order_money_adjustment giữ tên) — NỚI hàng rào đã duyệt (Điều 9.4),
// ĐÃ DUYỆT 2026-09-29 (lần 5) ở docs/superpowers/plans/2026-09-29-adr-0047-de-xuat-luat.md mục 1.
// prc_/prc: ADR-0024 điều 1 (module pricing, bảng ở lượt 2).
// ctl_/catalog: ADR-0058 điều 1 (nhóm dịch vụ; bảng cũ catalog_* giữ tên) — NỚI hàng rào đã duyệt (Điều 9.4), chủ duyệt ADR-0058 ngày 2026-09-30 (lượt 1a).
const TABLE_PREFIX: Record<string, string> = { ctl_: "catalog", prc_: "pricing", pty_: "parties", loc_: "locations", stf_: "staff", fbk_: "feedback", dsp_: "dispatch", bil_: "billing", mnt_: "maintenance", aut_: "auth", ntf_: "thongbao", vc_: "van-chuyen", ord_: "orders", tl_: "tro-ly" };
const VIEW_PREFIX: Record<string, string> = { prc: "pricing", pty: "parties", loc: "locations", stf: "staff", ord: "orders", dsp: "dispatch", bil: "billing", aud: "audit", vc: "van-chuyen" };

// ---------------------------------------------------------------------------------------------------------------------
// Đọc mã nguồn
// ---------------------------------------------------------------------------------------------------------------------
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return walk(p);
    return p.endsWith(".ts") && !p.endsWith(".test.ts") && !p.endsWith(".d.ts") ? [p] : [];
  });
}

/** Mọi đường dẫn tương đối được import/export-from trong một tệp (import nhiều dòng, `import type`, `export … from`, `import "x"`). */
function relativeImports(file: string): string[] {
  const text = readFileSync(file, "utf8");
  const re = /(?:^|\n)[ \t]*(?:import|export)\s+(?:type\s+)?(?:[^'"`;]*?\sfrom\s+)?["']([^"']+)["']/g;
  const out: string[] = [];
  for (let m = re.exec(text); m; m = re.exec(text)) if (m[1]!.startsWith(".")) out.push(m[1]!);
  return out;
}

const relSrc = (file: string, spec: string): string => relative(SRC, resolve(dirname(file), spec)).split(sep).join("/");

const MODULES = readdirSync(join(SRC, "modules")).filter((d) => statSync(join(SRC, "modules", d)).isDirectory());

test("mọi module trong src/modules đều khai chiều phụ thuộc ở ALLOWED_EDGES", () => {
  for (const m of MODULES) assert.ok(m in ALLOWED_EDGES, `module "${m}" chưa khai trong ALLOWED_EDGES`);
});

test("ADR-0002 điều 8(a): module chỉ import index.ts của module khác, đúng chiều phụ thuộc", () => {
  const problems: string[] = [];
  for (const m of MODULES) {
    for (const file of walk(join(SRC, "modules", m))) {
      for (const spec of relativeImports(file)) {
        const rel = relSrc(file, spec);
        if (rel === `modules/${m}` || rel.startsWith(`modules/${m}/`) || rel.startsWith("shared/")) continue;
        const other = /^modules\/([^/]+)(\/index(?:\.ts)?)?$/.exec(rel);
        if (!other) {
          problems.push(`${relative(ROOT, file)}: import "${spec}" ra ngoài module (chỉ được ../<module> hoặc ../<module>/index, hoặc ../../shared/...)`);
          continue;
        }
        const target = other[1]!;
        if (!(ALLOWED_EDGES[m] ?? []).includes(target)) problems.push(`${relative(ROOT, file)}: cạnh ${m} → ${target} chưa được phép`);
      }
    }
  }
  assert.deepEqual(problems, []);
});

test("đồ thị phụ thuộc module không có vòng", () => {
  const state = new Map<string, "visiting" | "done">();
  const visit = (node: string, path: string[]): void => {
    if (state.get(node) === "done") return;
    assert.notEqual(state.get(node), "visiting", `vòng phụ thuộc: ${[...path, node].join(" → ")}`);
    state.set(node, "visiting");
    for (const next of ALLOWED_EDGES[node] ?? []) visit(next, [...path, node]);
    state.set(node, "done");
  };
  for (const node of Object.keys(ALLOWED_EDGES)) visit(node, []);
});

test("ADR-0002 điều 6/quy tắc 5: shared/ và web/ không import module", () => {
  const problems: string[] = [];
  for (const file of walk(join(SRC, "shared"))) {
    for (const spec of relativeImports(file)) if (relSrc(file, spec).startsWith("modules/")) problems.push(`${relative(ROOT, file)} import "${spec}"`);
  }
  for (const file of walk(WEB)) {
    for (const spec of relativeImports(file)) {
      const t = resolve(dirname(file), spec);
      if (t.startsWith(join(SRC, "modules")) || t === join(SRC, "index")) problems.push(`${relative(ROOT, file)} import "${spec}"`);
    }
  }
  assert.deepEqual(problems, []);
});

// ---------------------------------------------------------------------------------------------------------------------
// Schema thật từ migrations/*.sql
// ---------------------------------------------------------------------------------------------------------------------
interface Dict {
  version: number;
  modules: string[];
  tables: {
    name: string; module: string; kind: "table" | "lookup"; legacy?: boolean; deprecatedColumns?: string[];
    /** Tham chiếu LOGIC sang bảng module khác qua view công bố, KHÔNG khoá ngoại (R-P19 — ADR-0049 lượt 1). */
    logicalRefs?: { column: string; toTable: string; viaView: string; note: string }[];
  }[];
  views: { name: string; module: string; columns: string[] }[];
  integrityEdges: { fromTable: string; toTable: string; note: string }[];
}
const dict: Dict = JSON.parse(readFileSync(join(ROOT, "docs/data-dictionary.json"), "utf8"));

function buildSchema(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of readdirSync(join(ROOT, "migrations")).filter((n) => n.endsWith(".sql")).sort()) db.exec(readFileSync(join(ROOT, "migrations", f), "utf8"));
  return db;
}
const db = buildSchema();
const names = (type: string): string[] =>
  (db.prepare("SELECT name FROM sqlite_master WHERE type = ? AND name NOT LIKE 'sqlite_%' ORDER BY name").all(type) as { name: string }[]).map((r) => r.name);
const ownerOf = (name: string): string | undefined => dict.tables.find((t) => t.name === name)?.module ?? dict.views.find((v) => v.name === name)?.module;
const columns = (table: string) => db.prepare(`PRAGMA table_info(${table})`).all() as { name: string; type: string; notnull: number; pk: number }[];
const fks = (table: string) => db.prepare(`PRAGMA foreign_key_list(${table})`).all() as { table: string; from: string; to: string | null; on_delete: string }[];

test("ADR-0002 điều 1: mọi bảng/view của schema có trong sổ dữ liệu và ngược lại", () => {
  assert.deepEqual(dict.tables.map((t) => t.name).sort(), names("table"));
  assert.deepEqual(dict.views.map((v) => v.name).sort(), names("view"));
  for (const o of [...dict.tables, ...dict.views]) assert.ok(dict.modules.includes(o.module), `${o.name}: module "${o.module}" không có trong sổ`);
});

test("ADR-0002 điều 2: bảng mới có tiền tố đúng module; bảng không tiền tố phải đánh dấu legacy", () => {
  for (const t of dict.tables) {
    const prefix = Object.keys(TABLE_PREFIX).find((p) => t.name.startsWith(p));
    if (prefix) {
      assert.equal(TABLE_PREFIX[prefix], t.module, `${t.name} phải thuộc module ${TABLE_PREFIX[prefix]}`);
      assert.ok(!t.legacy, `${t.name} có tiền tố nên không được đánh dấu legacy`);
    } else assert.ok(t.legacy, `${t.name} không có tiền tố module nên phải đánh dấu "legacy": true (tên cũ giữ nguyên)`);
  }
});

test("ADR-0002 điều 5/6: khoá ngoại xuyên module đúng chiều phụ thuộc hoặc là cạnh toàn vẹn đã khai", () => {
  const integrity = new Set(dict.integrityEdges.map((e) => `${e.fromTable}>${e.toTable}`));
  const problems: string[] = [];
  for (const t of dict.tables) {
    for (const fk of fks(t.name)) {
      const parent = dict.tables.find((p) => p.name === fk.table);
      if (!parent) {
        problems.push(`${t.name}.${fk.from} → ${fk.table}: bảng cha không có trong sổ`);
        continue;
      }
      const pk = columns(parent.name).filter((c) => c.pk > 0).map((c) => c.name);
      if (fk.to !== null && !(pk.length === 1 && pk[0] === fk.to)) problems.push(`${t.name}.${fk.from} phải trỏ khoá chính của ${parent.name}, đang trỏ ${fk.to}`);
      if (t.module !== parent.module && !(ALLOWED_EDGES[t.module] ?? []).includes(parent.module) && !integrity.has(`${t.name}>${parent.name}`)) {
        problems.push(`${t.name}.${fk.from} → ${parent.name}: cạnh ${t.module} → ${parent.module} chưa được phép (khai ở integrityEdges nếu là cạnh toàn vẹn)`);
      }
    }
  }
  assert.deepEqual(problems, []);
  for (const e of dict.integrityEdges) assert.ok(fks(e.fromTable).some((f) => f.table === e.toTable), `cạnh toàn vẹn ${e.fromTable} → ${e.toTable} không có thật`);
});

test("ADR-0002 điều 3: view công bố — tên v_<tiền tố>_…, cột đúng sổ, không INSTEAD OF", () => {
  for (const v of dict.views) {
    const m = /^v_([a-z]+)_/.exec(v.name);
    assert.ok(m && VIEW_PREFIX[m[1]!] === v.module, `${v.name} phải đặt tên v_<tiền tố module ${v.module}>_…`);
    assert.deepEqual(columns(v.name).map((c) => c.name), v.columns, `cột của ${v.name} lệch sổ (đổi cột view là đổi hợp đồng — sửa sổ có chủ đích)`);
  }
  const triggers = db.prepare("SELECT name, sql FROM sqlite_master WHERE type = 'trigger'").all() as { name: string; sql: string }[];
  assert.deepEqual(triggers.filter((t) => /INSTEAD\s+OF/i.test(t.sql)).map((t) => t.name), [], "cấm trigger INSTEAD OF (sẽ lách quy tắc ghi)");
});

test("ADR-0003: bảng mới (không legacy) — cột kiểm toán, cột WHO không khoá ngoại, không CASCADE, tra cứu khoá mã", () => {
  const problems: string[] = [];
  for (const t of dict.tables.filter((x) => !x.legacy)) {
    const cols = columns(t.name);
    const byName = new Map(cols.map((c) => [c.name, c]));
    const foreign = fks(t.name);
    for (const fk of foreign) if (fk.on_delete !== "NO ACTION") problems.push(`${t.name}.${fk.from}: ON DELETE ${fk.on_delete} (bảng mới chỉ được NO ACTION)`);
    if (t.kind === "lookup") {
      const pk = cols.filter((c) => c.pk > 0);
      if (!(pk.length === 1 && pk[0]!.name === "code" && pk[0]!.type === "TEXT")) problems.push(`${t.name}: bảng tra cứu phải có khoá chính TEXT \`code\``);
      continue;
    }
    for (const c of ["created_at", "updated_at"]) if (!byName.get(c) || byName.get(c)!.notnull !== 1) problems.push(`${t.name}.${c}: thiếu hoặc không NOT NULL`);
    for (const c of ["created_by", "updated_by"]) {
      const col = byName.get(c);
      if (!col) problems.push(`${t.name}.${c}: thiếu`);
      else {
        if (col.notnull !== 0 || col.type !== "TEXT") problems.push(`${t.name}.${c}: phải TEXT NULL (NULL = hệ thống)`);
        if (foreign.some((fk) => fk.from === c)) problems.push(`${t.name}.${c}: cột WHO không được có khoá ngoại`);
      }
    }
  }
  assert.deepEqual(problems, []);
});

test("docs/DATA-DICTIONARY.md khớp bản sinh từ docs/data-dictionary.json (chạy `npm run dict`)", () => {
  assert.equal(readFileSync(join(ROOT, "docs/DATA-DICTIONARY.md"), "utf8"), renderDictionaryMarkdown(dict));
});

// ---------------------------------------------------------------------------------------------------------------------
// ADR-0002 điều 8(b): ranh giới SQL của module nghiêm — hỏi chính SQLite bằng EXPLAIN
// ---------------------------------------------------------------------------------------------------------------------
function boundaryDb(): DatabaseSync {
  const b = new DatabaseSync(":memory:");
  const master = db.prepare("SELECT type, name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' AND sql IS NOT NULL").all() as { type: string; name: string; sql: string }[];
  for (const m of master.filter((x) => x.type === "table")) b.exec(m.sql);
  for (const m of master.filter((x) => x.type === "index")) b.exec(m.sql);
  // View công bố → bảng rỗng cùng cột: SQLite không "trải" view thành bảng gốc nên câu SQL lộ đúng quan hệ nó dùng.
  for (const v of dict.views) b.exec(`CREATE TABLE ${v.name} (${columns(v.name).map((c) => c.name).join(", ")})`);
  return b;
}
const boundary = boundaryDb();
const relationOfRootPage = new Map<number, string>();
for (const r of boundary.prepare("SELECT tbl_name, rootpage FROM sqlite_master WHERE rootpage > 0").all() as { tbl_name: string; rootpage: number }[]) relationOfRootPage.set(r.rootpage, r.tbl_name);
const isView = (name: string): boolean => dict.views.some((v) => v.name === name);

/** Các quan hệ (bảng hoặc view công bố) một câu SQL đọc và ghi, theo EXPLAIN. */
function touched(sql: string): { reads: Set<string>; writes: Set<string> } {
  const reads = new Set<string>();
  const writes = new Set<string>();
  for (const op of boundary.prepare(`EXPLAIN ${sql}`).all() as { opcode: string; p2: number; p3: number }[]) {
    const rel = relationOfRootPage.get(op.p2);
    if (!rel || op.p3 !== 0) continue;
    if (op.opcode === "OpenRead") reads.add(rel);
    if (op.opcode === "OpenWrite") writes.add(rel);
  }
  return { reads, writes };
}

/**
 * Câu có thể XOÁ CỨNG dòng: `DELETE`, hoặc `… OR REPLACE` / `REPLACE INTO` (xoá dòng xung đột rồi chèn). Nhận diện theo LOẠI câu lệnh (từ khoá đầu),
 * không quét tên bảng; bảng bị ghi lấy từ EXPLAIN. (Opcode `Delete` của EXPLAIN không dùng được: UPDATE cũng sinh nó.)
 */
const isHardDelete = (sql: string): boolean => /^\s*(?:WITH\b[\s\S]*?\)\s*)?DELETE\b/i.test(sql) || /\bOR\s+REPLACE\b|^\s*REPLACE\b/i.test(sql);

/** `exceptions: false` = bỏ qua hai ngoại lệ có tên của ADR-0047 (dùng cho bài "ngoại lệ không thừa" — câu trong danh sách PHẢI vi phạm khi không có ngoại lệ). */
function violations(e: Pick<SqlEntry, "module" | "sql"> & { name?: string }, opts: { exceptions?: boolean } = {}): string[] {
  const deps = new Set([e.module, ...(ALLOWED_EDGES[e.module] ?? [])]);
  const integrity = new Set(dict.integrityEdges.map((x) => `${x.fromTable}>${x.toTable}`));
  const { reads, writes } = touched(e.sql);
  const out: string[] = [];
  const key = `${e.module}.${e.name ?? ""}`;
  const useExceptions = opts.exceptions !== false;
  // R-N1-9 (ADR-0003 điều 8): không xoá cứng bản ghi bảng MỚI — đóng hiệu lực (`valid_to`) hoặc `active = 0`. Ngoại lệ có tên XOA_CUNG_NHAP (ADR-0047).
  if (isHardDelete(e.sql) && !(useExceptions && XOA_CUNG_NHAP.includes(key)))
    for (const w of writes) if (dict.tables.find((t) => t.name === w)?.legacy !== true) out.push(`xoá cứng bảng ${w} (R-N1-9: đóng hiệu lực hoặc active = 0, không DELETE/REPLACE)`);
  const parentsOfWrites = new Map<string, string[]>();
  for (const w of writes) {
    if (ownerOf(w) !== e.module) out.push(`ghi bảng ${w} của module ${ownerOf(w) ?? "không có trong sổ"}`);
    for (const fk of (boundary.prepare(`PRAGMA foreign_key_list(${w})`).all() as { table: string }[])) parentsOfWrites.set(fk.table, [...(parentsOfWrites.get(fk.table) ?? []), w]);
  }
  for (const r of reads) {
    if (writes.has(r)) continue;
    const owner = ownerOf(r);
    if (owner === undefined) out.push(`đọc ${r}: không có trong sổ`);
    else if (owner === e.module) continue;
    else if (isView(r)) {
      if (!deps.has(owner)) out.push(`đọc view ${r} của module ${owner}: cạnh ${e.module} → ${owner} chưa khai`);
    } else if (parentsOfWrites.has(r)) {
      // Khoá ngoại của bảng đang ghi buộc SQLite đọc bảng cha để kiểm toàn vẹn — hợp lệ nếu cạnh đó được phép.
      const ok = deps.has(owner) || (parentsOfWrites.get(r) ?? []).some((w) => integrity.has(`${w}>${r}`));
      if (!ok) out.push(`khoá ngoại tới ${r} của module ${owner}: cạnh ${e.module} → ${owner} chưa khai`);
    } else if (r === "audit_log" && useExceptions && (DOC_AUDIT_LOG_WONGUARD.ten as readonly string[]).includes(key)) continue; // nợ có hạn (ADR-0047 A3)
    else out.push(`đọc TRỰC TIẾP bảng ${r} của module ${owner} (chỉ được đọc qua view công bố v_*)`);
  }
  return out;
}

test("bộ phân tích SQL: bắt đúng vi phạm và cho phép đúng cách dùng", () => {
  const cases: { module: string; sql: string; expect: RegExp | null }[] = [
    { module: "staff", sql: "SELECT id, phone FROM staff WHERE active = 1", expect: null },
    { module: "staff", sql: "SELECT s.id, a.id FROM staff s JOIN audit_log a ON a.staff_id = s.id", expect: /đọc TRỰC TIẾP bảng audit_log của module audit/ },
    { module: "orders", sql: "SELECT o.id, s.full_name FROM orders o JOIN staff s ON s.id = o.staff_id", expect: /đọc TRỰC TIẾP bảng staff của module staff/ },
    { module: "audit", sql: "UPDATE staff SET active = 0 WHERE id = ?", expect: /ghi bảng staff của module staff/ },
    { module: "orders", sql: "INSERT INTO orders (id, order_code, staff_id, customer_name, customer_phone, created_at, updated_at) VALUES (?,?,?,?,?,?,?)", expect: null },
    { module: "catalog", sql: "INSERT INTO orders (id, order_code, staff_id, customer_name, customer_phone, created_at, updated_at) VALUES (?,?,?,?,?,?,?)", expect: /ghi bảng orders của module orders/ },
  ];
  for (const c of cases) {
    const got = violations(c);
    if (c.expect === null) assert.deepEqual(got, [], c.sql);
    else assert.ok(got.some((g) => c.expect!.test(g)), `${c.sql} → ${JSON.stringify(got)}`);
  }
});

test("ADR-0002 điều 8(b): SQL đã đăng ký của module nghiêm chỉ chạm bảng của mình / view công bố / khoá ngoại được phép", async () => {
  // ADR-0047 A3 (R5, siết): tệp "nửa nghiêm" (NUA_NGHIEM) cũng được nạp — câu của nó vào sổ đăng ký và chịu CÙNG bộ phân tích `violations`.
  for (const s of [...STRICT, ...NUA_NGHIEM]) await import(pathToFileURL(join(SRC, s.file)).href);
  for (const s of [...STRICT, ...NUA_NGHIEM]) assert.ok(registeredSql().some((e) => e.module === s.module), `module nghiêm "${s.module}" chưa đăng ký câu SQL nào (${s.file} phải dùng defineSql)`);
  const problems = registeredSql().flatMap((e) => violations(e).map((v) => `${e.module}.${e.name}: ${v}`));
  assert.deepEqual(problems, []);
});

// ---------------------------------------------------------------------------------------------------------------------
// Lưới cho CƠ CHẾ của điều 8(b): bài kiểm EXPLAIN ở trên chỉ thấy SQL đã đăng ký qua `defineSql`. Một `db.prepare("SELECT …")`
// viết thẳng trong `repository.ts` của module nghiêm sẽ đi vòng qua nó. Vì vậy: trong tệp SQL của module nghiêm, đối số đầu của
// `.prepare(` phải là ĐỊNH DANH (hằng đã defineSql), không bao giờ là chuỗi hay template literal.
// ---------------------------------------------------------------------------------------------------------------------
/** Vị trí (`tệp:dòng`) có `.prepare(` mà đối số đầu là chuỗi/template thô. Bỏ dòng chú thích và chú thích cuối dòng như R-N1-14. */
function rawPrepareHits(rel: string, source: string): string[] {
  const code = source.split("\n").map((line) => (/^\s*(?:\/\/|\/\*|\*)/.test(line) ? "" : line.replace(/\/\/.*$/, ""))).join("\n");
  const out: string[] = [];
  const re = /\.prepare\(\s*[`'"]/g;
  for (let m = re.exec(code); m; m = re.exec(code)) out.push(`${rel}:${code.slice(0, m.index).split("\n").length}`);
  return out;
}

test("bộ bắt `.prepare(<chuỗi thô>)`: bắt chuỗi/template, cho qua hằng đã defineSql", () => {
  const cases: [string, boolean][] = [
    ['db.prepare("SELECT * FROM staff")', true],
    ["db.prepare('SELECT 1')", true],
    ["db.prepare(`SELECT ${col} FROM staff`)", true], // template literal: SQL động, càng phải cấm
    ["db.prepare(\n  `SELECT 1`,\n)", true], // xuống dòng vẫn bắt
    ["db.prepare(FIND_BY_ID)", false],
    ["db.prepare(SQL.list).bind(1)", false],
    ['// db.prepare("SELECT 1") — ví dụ trong chú thích', false],
    ["const x = 1; // db.prepare(`x`)", false],
  ];
  for (const [src, caught] of cases) assert.equal(rawPrepareHits("mau.ts", src).length > 0, caught, src);
  assert.deepEqual(rawPrepareHits("mau.ts", 'const a = 1;\ndb.prepare("SELECT 1");'), ["mau.ts:2"], "báo đúng tệp:dòng");
});

test("ADR-0002 điều 8(b): tệp SQL của module nghiêm không được `.prepare(` với chuỗi/template thô", () => {
  const problems = STRICT.flatMap((s) => rawPrepareHits(s.file, readFileSync(join(SRC, s.file), "utf8")));
  // ADR-0047 A3 (R5, siết): tệp "nửa nghiêm" — CHỈ tệp đó (repository.ts cũ của orders còn SQL thô, nợ LEGACY) — cấm cả `.prepare(`/`db.exec(` thô.
  for (const n of NUA_NGHIEM) {
    const code = readFileSync(join(SRC, n.file), "utf8");
    problems.push(...rawPrepareHits(n.file, code), ...rawExecHits(n.file, code));
  }
  assert.deepEqual(problems, [], "SQL viết thẳng vào .prepare(...) không qua defineSql nên bài kiểm ranh giới EXPLAIN không thấy — hãy khai bằng defineSql rồi .prepare(<hằng>)");
});

/**
 * Vị trí (`tệp:dòng`) có `db.exec(`/`env.DB.exec(` mà đối số đầu là chuỗi/template thô — cùng cơ chế với `rawPrepareHits` ở trên, quét thêm
 * hai lối ghi thẳng SQL này (D1 và `node:sqlite` đều có `.exec(chuỗi)` chạy nhiều câu, đi vòng qua `defineSql` y như `.prepare(chuỗi)`).
 * CHỈ khớp đúng hai tiền tố `db.exec(` / `env.DB.exec(`, KHÔNG bắt `.exec(` trần: `RegExp.prototype.exec()` (vd. `src/shared/vn-date.ts`,
 * `src/shared/order-lines.ts`, `src/shared/order-errors.ts`) là cách dùng hợp lệ, không phải SQL, và nằm ngoài 8 thư mục module nghiêm.
 */
function rawExecHits(rel: string, source: string): string[] {
  const code = source.split("\n").map((line) => (/^\s*(?:\/\/|\/\*|\*)/.test(line) ? "" : line.replace(/\/\/.*$/, ""))).join("\n");
  const out: string[] = [];
  const re = /\b(?:db|env\.DB)\.exec\(\s*[`'"]/g;
  for (let m = re.exec(code); m; m = re.exec(code)) out.push(`${rel}:${code.slice(0, m.index).split("\n").length}`);
  return out;
}

test("bộ bắt `db.exec(<chuỗi thô>)`/`env.DB.exec(<chuỗi thô>)`: bắt chuỗi/template, cho qua hằng, không đụng RegExp.exec()", () => {
  const cases: [string, boolean][] = [
    ['db.exec("DELETE FROM staff")', true],
    ["env.DB.exec('DELETE FROM staff')", true],
    ["db.exec(`UPDATE staff SET active = ${v}`)", true], // template literal: càng phải cấm
    ["db.exec(SQL_BATCH)", false], // hằng đã defineSql
    ["re.exec(text)", false], // RegExp.exec() — không phải đối tượng tên "db"/"env.DB", không được bắt
    ['// db.exec("DELETE FROM staff") — ví dụ trong chú thích', false],
  ];
  for (const [src, caught] of cases) assert.equal(rawExecHits("mau.ts", src).length > 0, caught, src);
});

// Lưới cho GAP đã tìm thấy (C-3, người kiểm độc lập 2026-09-22): hai bài kiểm trên chỉ quét `repository.ts` của module nghiêm. Một
// `service.ts`/`index.ts`/`rules.ts` cùng thư mục viết thẳng `.prepare("...")` hay `db.exec("...")` thì đi vòng qua ranh giới EXPLAIN mà
// KHÔNG bài kiểm nào bắt được — `npm test` vẫn xanh 100%. Bài kiểm dưới quét MỌI tệp `.ts` (trừ `*.test.ts`, dùng lại `walk()` ở trên) trong
// cả 8 thư mục module nghiêm, không chỉ `repository.ts`. Cố tình KHÔNG quét 4 module LEGACY (`accounts`, `audit`, `catalog`, `orders`):
// đó là phong cách chấp nhận được của SQL cũ, một cuộc di trú khác, lớn hơn, không thuộc phạm vi việc này.
test("ADR-0002 điều 8(b) mở rộng: MỌI tệp trong thư mục module nghiêm (không chỉ repository.ts) không được `.prepare(`/`db.exec(`/`env.DB.exec(` với chuỗi/template thô", () => {
  const problems: string[] = [];
  for (const s of STRICT) {
    for (const file of walk(join(SRC, "modules", s.module))) {
      const rel = relative(SRC, file).split(sep).join("/");
      const code = readFileSync(file, "utf8");
      problems.push(...rawPrepareHits(rel, code), ...rawExecHits(rel, code));
    }
  }
  assert.deepEqual(
    problems,
    [],
    "SQL viết thẳng (không qua defineSql) ở BẤT KỲ tệp nào trong thư mục module nghiêm — không chỉ repository.ts — đi vòng qua ranh giới EXPLAIN; hãy khai bằng defineSql rồi .prepare(<hằng>)",
  );
});

test("R-N1-12: vai trò hồ sơ không là điều kiện cho phép — chỉ module parties nhắc `pty_party_role`", () => {
  const problems: string[] = [];
  for (const file of [...walk(SRC), ...walk(WEB)]) {
    const rel = relative(ROOT, file).split(sep).join("/");
    if (rel.startsWith("src/modules/parties/")) continue;
    if (readFileSync(file, "utf8").includes("pty_party_role")) problems.push(rel);
  }
  assert.deepEqual(problems, [], "vai trò hồ sơ (HDV, tài xế…) chỉ để ghi và truy vấn, không bao giờ để cho/chặn thao tác (ADR-0001 mục 4, ADR-0005)");
});

test("module không nghiêm phải nằm trong LEGACY (ngoại lệ có hạn), KHONG_DB hoặc KHONG_BANG — module mới không được trốn 8(b)", () => {
  const strict = new Set(STRICT.map((s) => s.module));
  const khongDb = new Set<string>(KHONG_DB);
  const khongBang = new Set<string>(KHONG_BANG);
  for (const m of MODULES) {
    assert.ok(
      strict.has(m) || (LEGACY as readonly string[]).includes(m) || khongDb.has(m) || khongBang.has(m),
      `module "${m}" không nghiêm, không có trong LEGACY, không thuộc KHONG_DB/KHONG_BANG: thêm vào STRICT (kèm repository dùng defineSql)`,
    );
  }
  for (const m of LEGACY) assert.ok(!strict.has(m), `module "${m}" đã nghiêm — bỏ khỏi LEGACY`);
  for (const m of khongDb) assert.ok(!strict.has(m) && !(LEGACY as readonly string[]).includes(m), `module "${m}" thuộc KHONG_DB thì không được đồng thời ở STRICT hoặc LEGACY`);
  for (const m of khongBang) {
    assert.ok(!strict.has(m) && !(LEGACY as readonly string[]).includes(m) && !khongDb.has(m), `module "${m}" thuộc KHONG_BANG thì không được đồng thời ở STRICT, LEGACY hoặc KHONG_DB`);
  }
});

// ---------------------------------------------------------------------------------------------------------------------
// KHONG_DB (ADR-0022): module không dùng cơ sở dữ liệu — không bảng, không SQL, không env.DB/.prepare(/.batch(/DB.exec(.
// Dùng lại đúng cách che chú thích (dòng // và cả dòng /*, */, *) như rawPrepareHits/rawExecHits/R-N1-14 ở trên trong
// tệp này, để chuỗi trong chú thích (ví dụ, giải thích) không bị bắt nhầm là vi phạm thật.
// ---------------------------------------------------------------------------------------------------------------------
function khongDbHits(rel: string, source: string): string[] {
  const code = source.split("\n").map((line) => (/^\s*(?:\/\/|\/\*|\*)/.test(line) ? "" : line.replace(/\/\/.*$/, ""))).join("\n");
  const out: string[] = [];
  for (const needle of ["env.DB", ".prepare(", ".batch(", "DB.exec("]) if (code.includes(needle)) out.push(`${rel}: chứa "${needle}"`);
  return out;
}

test("KHONG_DB: mọi tệp .ts (trừ *.test.ts) của module hạng KHONG_DB không được đụng env.DB/.prepare(/.batch(/DB.exec(", () => {
  const problems: string[] = [];
  for (const m of KHONG_DB) {
    for (const file of walk(join(SRC, "modules", m))) {
      problems.push(...khongDbHits(relative(ROOT, file).split(sep).join("/"), readFileSync(file, "utf8")));
    }
  }
  assert.deepEqual(problems, [], "module KHONG_DB không được chạm cơ sở dữ liệu ở bất kỳ tệp nào (không có repository.ts) — xem ADR-0022");
});

// ---------------------------------------------------------------------------------------------------------------------
// KHONG_BANG (ADR-0024 điều 1): module không bảng — không câu SQL ở BẤT KỲ tệp .ts nào (trừ *.test.ts), không bảng/view nào trong sổ dữ liệu thuộc nó.
// Được nhắc `env.DB` (chuyển tay cầm cho hàm công bố của module khác). Che chú thích như khongDbHits.
// ---------------------------------------------------------------------------------------------------------------------
function khongBangHits(rel: string, source: string): string[] {
  const code = source.split("\n").map((line) => (/^\s*(?:\/\/|\/\*|\*)/.test(line) ? "" : line.replace(/\/\/.*$/, ""))).join("\n");
  const out: string[] = [];
  for (const needle of [".prepare(", ".batch(", ".exec("]) if (code.includes(needle)) out.push(`${rel}: chứa "${needle}"`);
  return out;
}

test("bộ bắt KHONG_BANG: bắt .prepare(/.batch(/.exec(, cho qua env.DB và chú thích", () => {
  assert.deepEqual(khongBangHits("m.ts", "const r = await ordersReceipt(env.DB, id);"), []);
  assert.deepEqual(khongBangHits("m.ts", "// env.DB.prepare(\"SELECT 1\") — ví dụ"), []);
  assert.equal(khongBangHits("m.ts", "await env.DB.prepare(SQL).first();").length, 1);
  assert.equal(khongBangHits("m.ts", "await env.DB.batch([a]);").length, 1);
  assert.equal(khongBangHits("m.ts", "await env.DB.exec(SQL);").length, 1);
});

test("KHONG_BANG: mọi tệp .ts (trừ *.test.ts) của module hạng KHONG_BANG không có .prepare(/.batch(/.exec(; không bảng/view nào trong sổ dữ liệu thuộc module đó", () => {
  const problems: string[] = [];
  for (const m of KHONG_BANG) {
    for (const o of [...dict.tables, ...dict.views]) if (o.module === m) problems.push(`sổ dữ liệu: ${o.name} thuộc module ${m} (hạng KHONG_BANG không có bảng/view)`);
    const dir = join(SRC, "modules", m);
    if (statSync(dir, { throwIfNoEntry: false }) === undefined) continue; // module chưa có thư mục (chưa thi công) — không có mã để quét
    for (const file of walk(dir)) problems.push(...khongBangHits(relative(ROOT, file).split(sep).join("/"), readFileSync(file, "utf8")));
  }
  assert.deepEqual(problems, [], "module KHONG_BANG không có SQL — gọi hàm công bố của module sở hữu dữ liệu (ADR-0024 điều 1)");
});

// ---------------------------------------------------------------------------------------------------------------------
// Tệp lớp Durable Object (`tram.ts`, Task 4b): CHỈ src/index.ts được nạp nó (mã DO thật chỉ chạy trong Worker, không
// chạy được dưới node --test — nạp nó ở nơi khác làm vỡ mọi khung thử). Quét TOÀN BỘ src/**/*.ts kể cả *.test.ts
// (khác walk() ở trên, dùng walkAll bên dưới) vì một tệp test cũng có thể lỡ import nó.
// ---------------------------------------------------------------------------------------------------------------------
function walkAll(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return walkAll(p);
    return p.endsWith(".ts") ? [p] : [];
  });
}

test("tệp lớp DO modules/bangtin/tram: chỉ src/index.ts được import; không index.ts nào của module chứa \"cloudflare:workers\"", () => {
  const problems: string[] = [];
  const rootIndex = join(SRC, "index.ts");
  for (const file of walkAll(SRC)) {
    if (resolve(file) === rootIndex) continue;
    for (const spec of relativeImports(file)) {
      // Tệp thuần/tệp test import bằng đuôi .ts tường minh (như rules.test.ts của chính module này) — bỏ đuôi trước khi so khớp.
      if (relSrc(file, spec).replace(/\.(?:ts|js|mjs)$/, "") === "modules/bangtin/tram") {
        problems.push(`${relative(ROOT, file)}: import "${spec}" (chỉ src/index.ts được nạp lớp Durable Object)`);
      }
    }
  }
  for (const f of readdirSync(join(ROOT, "scripts")).filter((n) => n.endsWith(".mjs"))) {
    if (readFileSync(join(ROOT, "scripts", f), "utf8").includes("bangtin/tram")) problems.push(`scripts/${f}: nhắc "bangtin/tram"`);
  }
  for (const m of MODULES) {
    const idx = join(SRC, "modules", m, "index.ts");
    if (statSync(idx, { throwIfNoEntry: false }) !== undefined && readFileSync(idx, "utf8").includes("cloudflare:workers")) {
      problems.push(`modules/${m}/index.ts: chứa "cloudflare:workers" (chỉ tram.ts được import từ "cloudflare:workers", và chỉ src/index.ts được nạp tram.ts)`);
    }
  }
  assert.deepEqual(problems, []);
});

// ---------------------------------------------------------------------------------------------------------------------
// ADR-0030 S20-13 (ADR-0006 điều 8, ADR-0007 điều 4(b), Hiến chương 5.3): `orders` KHÔNG đọc view công bố của `dispatch` (`v_dsp_*`). `orders` là
// LEGACY nên SQL của nó không qua bài EXPLAIN ở trên — câu đếm "Chưa phụ trách" của Trang chủ từng đọc thẳng view người phụ trách của dispatch
// (lệch H1/T3a). Nay tập "đơn đang có người" đi qua hàm tiêm `ctx.ordersWithHandler` (gốc lắp ráp nối vào dispatch); bài này khoá lại kết quả đó.
// Quét MỌI tệp `.ts` của `src/modules/orders/` KỂ CẢ `*.test.ts` (`walkAll`, khớp lệnh nghiệm thu `grep -rn "v_dsp_" src/modules/orders`), trên bản
// đã che CHÚ THÍCH nhưng KHÔNG che chuỗi: SQL nằm trong chuỗi/template, che chuỗi thì bài này mù. Không phân biệt hoa/thường (tên trong SQLite
// không phân biệt). KHÔNG canh: tên ghép động ("v_" + "dsp_…"), đọc thẳng BẢNG `dsp_assignment` (không qua view) — hai lối đó chưa có rào.
// ---------------------------------------------------------------------------------------------------------------------
/** Vị trí (`tệp:dòng`) có `v_dsp_` ngoài chú thích. */
function dispatchViewHits(rel: string, source: string): string[] {
  const code = maskSource(source, { strings: false, comments: true });
  const out: string[] = [];
  const re = /v_dsp_/gi;
  for (let m = re.exec(code); m; m = re.exec(code)) out.push(`${rel}:${code.slice(0, m.index).split("\n").length}`);
  return out;
}

test("bộ bắt `v_dsp_`: bắt trong SQL (chuỗi/template, mọi kiểu chữ), cho qua chú thích, báo đúng tệp:dòng", () => {
  const cases: [string, boolean][] = [
    ["db.prepare(`SELECT 1 FROM v_dsp_order_handler h WHERE h.order_id = o.id`)", true],
    ['const SQL = "SELECT order_id FROM v_dsp_order_handler";', true],
    ["db.prepare(`SELECT 1 FROM V_DSP_ORDER_HANDLER`)", true], // SQLite không phân biệt hoa/thường ở tên view
    ["// orders không đọc v_dsp_order_handler — lời giải thích", false],
    ["/* v_dsp_order_handler trong chú thích khối */ const x = 1;", false],
    ["/**\n * v_dsp_order_handler\n */", false],
    ["const x = 1; // v_dsp_ ở chú thích cuối dòng", false],
  ];
  for (const [src, caught] of cases) assert.equal(dispatchViewHits("mau.ts", src).length > 0, caught, src);
  assert.deepEqual(dispatchViewHits("mau.ts", "const a = 1;\n// v_dsp_x\nconst q = `FROM v_dsp_order_handler`;"), ["mau.ts:3"], "báo đúng tệp:dòng");
});

test("ADR-0030 S20-13: không tệp nào trong src/modules/orders/ (kể cả *.test.ts) chứa `v_dsp_` ngoài chú thích — orders không đọc view của dispatch", () => {
  const problems = walkAll(join(SRC, "modules", "orders")).flatMap((file) => dispatchViewHits(relative(ROOT, file).split(sep).join("/"), readFileSync(file, "utf8")));
  assert.deepEqual(
    problems,
    [],
    "`orders` không đọc view `v_dsp_*` của `dispatch` (ADR-0030 S20-13) — tập đơn đang có người phụ trách lấy qua hàm tiêm `ctx.ordersWithHandler` (gốc lắp ráp nối vào dispatch)",
  );
});

// ---------------------------------------------------------------------------------------------------------------------
// ADR-0024 điều 4 (sổ tiền lượt 1, siết — bản làm mới §4.1): `orders` KHÔNG BAO GIỜ đọc bảng/view `bil_` — không trong mã, không trong câu SQL. `orders`
// còn LEGACY (SQL cũ không qua EXPLAIN) nên cần bài riêng này: quét MỌI tệp `.ts` của src/modules/orders/ KỂ CẢ *.test.ts, che CHÚ THÍCH nhưng KHÔNG che
// chuỗi (SQL nằm trong chuỗi). Bắt cả `bil_…` lẫn `v_bil_…`, mọi kiểu chữ. Số "đã thu / còn phải thu" do `billing` trả qua route của nó.
// KHÔNG canh: tên ghép động ("bi" + "l_…"). Luật trigger (điều 5) có bài riêng ở cuối tệp.
// ---------------------------------------------------------------------------------------------------------------------
function billingNameHits(rel: string, source: string): string[] {
  const code = maskSource(source, { strings: false, comments: true });
  const out: string[] = [];
  const re = /bil_/gi;
  for (let m = re.exec(code); m; m = re.exec(code)) out.push(`${rel}:${code.slice(0, m.index).split("\n").length}`);
  return out;
}

test("bộ bắt `bil_`: bắt trong SQL (chuỗi/template, mọi kiểu chữ, cả v_bil_), cho qua chú thích, báo đúng tệp:dòng", () => {
  const cases: [string, boolean][] = [
    ["db.prepare(`SELECT 1 FROM bil_payment_receipt WHERE order_id = ?`)", true],
    ['const SQL = "SELECT paid_net FROM v_bil_order_paid";', true],
    ["db.prepare(`SELECT 1 FROM BIL_POSTING`)", true],
    ["// orders không đọc bil_payment_receipt — lời giải thích", false],
    ["/* bil_posting trong chú thích khối */ const x = 1;", false],
    ["const x = 1; // v_bil_ ở chú thích cuối dòng", false],
  ];
  for (const [src, caught] of cases) assert.equal(billingNameHits("mau.ts", src).length > 0, caught, src);
  assert.deepEqual(billingNameHits("mau.ts", "const a = 1;\n// bil_x\nconst q = `FROM bil_posting`;"), ["mau.ts:3"], "báo đúng tệp:dòng");
});

test("ADR-0024 điều 4: không tệp nào trong src/modules/orders/ (kể cả *.test.ts) nhắc `bil_` ngoài chú thích — orders không đọc sổ của billing", () => {
  const problems = walkAll(join(SRC, "modules", "orders")).flatMap((file) => billingNameHits(relative(ROOT, file).split(sep).join("/"), readFileSync(file, "utf8")));
  assert.deepEqual(problems, [], "`orders` không đọc bảng/view `bil_` (ADR-0024 điều 4) — số đã thu/còn lại lấy qua route của `billing`");
});

test("R-N1-9: câu DELETE trên bảng mới bị bắt (phải đóng hiệu lực hoặc active = 0); UPDATE thì không", () => {
  assert.ok(violations({ module: "locations", sql: "DELETE FROM loc_location WHERE id = ?" }).some((v) => /xoá cứng bảng loc_location/.test(v)));
  assert.deepEqual(violations({ module: "locations", sql: "UPDATE loc_location SET active = 0 WHERE id = ?" }), [], "UPDATE không phải xoá cứng");
});

// ---------------------------------------------------------------------------------------------------------------------
// R-N1-14 (đặc tả N1 §5): staff.role và staff.full_name là cột CHẾT (ADR-0005) — không SQL nào đọc chúng.
// Kiểm hai lớp: (1) KIỂU — StaffRecord/StaffProfile không có hai trường, đọc thuộc tính là lỗi `tsc`; (2) bài kiểm này quét mã nguồn.
// Quét chuỗi không phải cơ chế ranh giới (ADR-0002 điều 8) — chỉ là lưới thêm cho hai tên cột đã biết; SQL của staff còn được EXPLAIN kiểm ở trên.
// ---------------------------------------------------------------------------------------------------------------------
/**
 * NGOẠI LỆ CÓ TÊN của R-N1-14 (ADR-0047 A2): cột `ord_passenger.full_name` (họ tên hành khách — tên cột do ADR chốt) trùng TÊN với cột chết `staff.full_name`.
 * Chỉ tệp SQL nửa nghiêm của orders được nhắc chữ `full_name`; bù lại: bài "câu SQL có full_name không chạm bảng staff" ở cuối tệp (EXPLAIN) + bài
 * EXPLAIN của NUA_NGHIEM cấm tệp đó đọc thẳng bảng `staff`. NỚI hàng rào đã duyệt (Điều 9.4) — ĐÃ DUYỆT 2026-09-29 (lần 5) ở
 * docs/superpowers/plans/2026-09-29-adr-0047-de-xuat-luat.md mục 7.
 */
const FULL_NAME_ORD_PASSENGER_FILES = new Set(["src/modules/orders/chang-hanh-khach-repo.ts"]);

test("R-N1-14: không đọc staff.role / staff.full_name; không SELECT * FROM staff", () => {
  const WRITE_ONLY_FILES = new Set(["src/modules/staff/repository.ts", "scripts/staff-lib.mjs", ...FULL_NAME_ORD_PASSENGER_FILES]); // câu INSERT ghi hằng 'sales' và ''; ord_passenger (ADR-0047)
  const files = [...walk(SRC), ...readdirSync(join(ROOT, "scripts")).filter((f) => f.endsWith(".mjs")).map((f) => join(ROOT, "scripts", f))];
  const problems: string[] = [];
  for (const file of files) {
    const rel = relative(ROOT, file).split(sep).join("/");
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      if (/^\s*(?:\/\/|\/\*|\*)/.test(line)) return; // dòng chú thích (//, /* … */, * …)
      const code = line.replace(/\/\/.*$/, ""); // bỏ chú thích cuối dòng
      const where = `${rel}:${i + 1}`;
      if (/\bfull_name\b/.test(code) && !WRITE_ONLY_FILES.has(rel)) problems.push(`${where}: đọc/ghi full_name`);
      if (/SELECT\s+\*\s+FROM\s+staff\b/i.test(code) || /\bs\.\*/.test(code)) problems.push(`${where}: SELECT * trên staff`);
      if (/\b(?:s|t|staff)\.role\b/.test(code) || /\brole\s*=\s*'(?:admin|sales)'/.test(code) || /\brole\s+IN\s*\(/i.test(code)) problems.push(`${where}: đọc staff.role`);
    });
  }
  assert.deepEqual(problems, []);
});

test("sổ dữ liệu: cột đánh dấu chết (deprecatedColumns) có thật trong bảng", () => {
  for (const t of dict.tables) for (const c of t.deprecatedColumns ?? []) assert.ok(columns(t.name).some((x) => x.name === c), `${t.name}.${c} không tồn tại`);
});

// ---------------------------------------------------------------------------------------------------------------------
// ADR-0047 — tiền tố `ord_`, khoá danh sách bảng `legacy` (T3b), tệp "nửa nghiêm" của `orders`
// ---------------------------------------------------------------------------------------------------------------------
test("ADR-0047 A3 (T3b): tập bảng `legacy` bằng đúng LEGACY_TABLES — bảng mới không được trốn tiền tố", () => {
  assert.deepEqual(
    dict.tables.filter((t) => t.legacy === true).map((t) => t.name).sort(),
    [...LEGACY_TABLES].sort(),
    "bảng mới không được trốn tiền tố bằng cờ `legacy` — đặt tên có tiền tố module (TABLE_PREFIX); danh sách LEGACY_TABLES chỉ được co lại",
  );
});

test("ADR-0047 A3 (R5): module của tệp NUA_NGHIEM phải đang ở LEGACY (lên STRICT thì bỏ khỏi NUA_NGHIEM); tệp nằm trong thư mục của module đó", () => {
  for (const n of NUA_NGHIEM) {
    assert.ok((LEGACY as readonly string[]).includes(n.module), `module "${n.module}" của ${n.file} không còn ở LEGACY — bỏ khỏi NUA_NGHIEM`);
    assert.ok(n.file.startsWith(`modules/${n.module}/`), `${n.file} phải nằm trong thư mục modules/${n.module}/`);
  }
});

/** Câu SQL đã đăng ký của tệp nửa nghiêm (nạp tệp để sổ đăng ký có câu của nó). */
async function nuaNghiemSql(): Promise<readonly SqlEntry[]> {
  for (const n of NUA_NGHIEM) await import(pathToFileURL(join(SRC, n.file)).href);
  return registeredSql();
}
const sqlByKey = (entries: readonly SqlEntry[], key: string) => entries.find((x) => `${x.module}.${x.name}` === key);

test("ADR-0047 A1/A2 (ngoại lệ XOA_CUNG_NHAP — ĐÃ DUYỆT 2026-09-29 (lần 5), đề xuất luật mục 2): mỗi tên đang đăng ký, THẬT là câu xoá cứng (không ngoại lệ thì đỏ), có điều kiện đơn nháp TRONG câu, bảng đích có trigger <bảng>_no_delete", async () => {
  const entries = await nuaNghiemSql();
  const triggerNames = new Set((db.prepare("SELECT name FROM sqlite_master WHERE type = 'trigger'").all() as { name: string }[]).map((t) => t.name));
  assert.deepEqual([...XOA_CUNG_NHAP].sort(), ["orders.leg_delete_draft", "orders.passenger_delete_draft"], "danh sách chỉ được co lại — thêm tên là NỚI, cần chủ duyệt");
  for (const key of XOA_CUNG_NHAP) {
    const e = sqlByKey(entries, key);
    assert.ok(e, `${key}: không còn đăng ký — bỏ khỏi XOA_CUNG_NHAP (ngoại lệ thừa)`);
    assert.ok(violations(e, { exceptions: false }).some((v) => v.startsWith("xoá cứng bảng")), `${key}: không còn xoá cứng — ngoại lệ thừa, bỏ khỏi XOA_CUNG_NHAP`);
    assert.match(e.sql, /\bstatus = 'draft'/, `${key}: điều kiện "đơn nháp" phải nằm TRONG câu xoá`);
    for (const w of touched(e.sql).writes) assert.ok(triggerNames.has(`${w}_no_delete`), `${key}: bảng ${w} phải có trigger ${w}_no_delete (cấm xoá khi đơn không còn nháp)`);
  }
});

test("ADR-0047 A3 (nợ có hạn DOC_AUDIT_LOG_WONGUARD — ĐÃ DUYỆT 2026-09-29 (lần 5), đề xuất luật mục 3): còn hạn (giờ VN); mỗi tên đang đăng ký, THẬT đọc audit_log (không ngoại lệ thì đỏ), và CHỈ qua lính gác `EXISTS (SELECT 1 FROM audit_log WHERE id = ?N)`", async () => {
  const entries = await nuaNghiemSql();
  assert.ok(DOC_AUDIT_LOG_WONGUARD.han >= vnToday(new Date()), `nợ DOC_AUDIT_LOG_WONGUARD quá hạn ${DOC_AUDIT_LOG_WONGUARD.han} — gỡ nợ hoặc chủ dự án gia hạn`);
  for (const key of DOC_AUDIT_LOG_WONGUARD.ten) {
    const e = sqlByKey(entries, key);
    assert.ok(e, `${key}: không còn đăng ký — bỏ khỏi DOC_AUDIT_LOG_WONGUARD (ngoại lệ thừa)`);
    assert.ok(
      violations(e, { exceptions: false }).some((v) => v.startsWith("đọc TRỰC TIẾP bảng audit_log")),
      `${key}: không còn đọc audit_log — ngoại lệ thừa, bỏ khỏi DOC_AUDIT_LOG_WONGUARD`,
    );
    assert.equal((e.sql.match(/audit_log/g) ?? []).length, 1, `${key}: chỉ được nhắc audit_log MỘT lần — trong lính gác`);
    assert.match(e.sql, /EXISTS \(SELECT 1 FROM audit_log WHERE id = \?\d+\)/, `${key}: audit_log chỉ được đọc ở dạng lính gác wonGuard`);
  }
});

test("ADR-0047 A2 (ngoại lệ R-N1-14 — ĐÃ DUYỆT 2026-09-29 (lần 5), đề xuất luật mục 7): chỉ tệp nửa nghiêm được nhắc full_name; mọi câu có full_name chạm ord_passenger, KHÔNG chạm staff", async () => {
  const entries = await nuaNghiemSql();
  const nua = new Set(NUA_NGHIEM.map((n) => `src/${n.file}`));
  for (const f of FULL_NAME_ORD_PASSENGER_FILES) {
    assert.ok(nua.has(f), `${f}: ngoại lệ full_name chỉ dành cho tệp nửa nghiêm (có bài EXPLAIN)`);
    assert.match(readFileSync(join(ROOT, f), "utf8"), /\bfull_name\b/, `${f}: không còn nhắc full_name — ngoại lệ thừa`);
  }
  const nuaModules = new Set(NUA_NGHIEM.map((n) => n.module));
  const withFullName = entries.filter((e) => nuaModules.has(e.module) && /\bfull_name\b/.test(e.sql));
  assert.ok(withFullName.length > 0, "chống bài rỗng: phải có câu SQL nhắc full_name (ord_passenger)");
  for (const e of withFullName) {
    const { reads, writes } = touched(e.sql);
    const all = new Set([...reads, ...writes]);
    assert.ok(all.has("ord_passenger"), `${e.module}.${e.name}: câu có full_name phải chạm ord_passenger`);
    assert.ok(!all.has("staff"), `${e.module}.${e.name}: câu có full_name KHÔNG được chạm bảng staff (cột chết staff.full_name)`);
  }
});

// ---------------------------------------------------------------------------------------------------------------------
// ADR-0049 D1 (kế hoạch mục 1.4, 1.6; Task A12) — ba bài SIẾT đi cùng cạnh mới van-chuyen → orders, locations.
// ---------------------------------------------------------------------------------------------------------------------
test("ADR-0049 D1 (siết): KHÔNG module nào import van-chuyen — không cạnh nào trỏ tới \"van-chuyen\", không tệp src/modules/<khác>/** (kể cả *.test.ts) import ../van-chuyen", () => {
  const problems: string[] = [];
  for (const [m, edges] of Object.entries(ALLOWED_EDGES)) if (edges.includes("van-chuyen")) problems.push(`ALLOWED_EDGES["${m}"] trỏ tới van-chuyen`);
  for (const m of MODULES.filter((x) => x !== "van-chuyen")) {
    for (const file of walkAll(join(SRC, "modules", m))) {
      for (const spec of relativeImports(file)) {
        if (/^modules\/van-chuyen(?:\/|$)/.test(relSrc(file, spec))) problems.push(`${relative(ROOT, file)}: import "${spec}"`);
      }
    }
  }
  assert.deepEqual(problems, [], "orders nhận mốc tối thiểu qua hàm tiêm của gốc lắp ráp (ctx.mocToiThieu) — không module nào đọc van-chuyen (ADR-0049 D1)");
});

/**
 * View công bố mà trigger của van-chuyen được đọc (ADR-0049 kế hoạch mục 1.4; Hiến chương 5.3): sáu view của kế hoạch + `v_ord_passenger_row` (R-P19 — chủ
 * chốt 29/9, Trả lời lần 13: bỏ khoá ngoại sang ord_*, bản chốt kiểm bằng trigger đọc view). Thêm tên = NỚI (Điều 9.4).
 */
const VIEW_CHO_TRIGGER_VC = [
  "v_ord_leg_key", "v_ord_order_flag", "v_ord_passenger_key", "v_ord_passenger_row", "v_pty_carrier_driver", "v_pty_carrier", "v_pty_owner_company",
] as const;
/** Tên bảng / view (khác `vc_*` và khác sáu view) xuất hiện trong thân một trigger — câu báo trong dấu nháy đơn bỏ qua. */
function triggerDocNgoai(sql: string, objects: readonly string[]): string[] {
  const text = sql.replace(/'(?:[^']|'')*'/g, "''");
  return objects.filter((o) => !o.startsWith("vc_") && !(VIEW_CHO_TRIGGER_VC as readonly string[]).includes(o) && new RegExp(`\\b${o}\\b`, "i").test(text));
}

test("bộ bắt tên ngoài trong thân trigger: bắt JOIN orders / bảng pty_, cho qua vc_ + sáu view, bỏ qua chữ trong câu báo", () => {
  const objs = [...names("table"), ...names("view")];
  assert.deepEqual(triggerDocNgoai("CREATE TRIGGER x BEFORE INSERT ON vc_trip WHEN EXISTS (SELECT 1 FROM orders o) BEGIN SELECT RAISE(ABORT, 'x'); END", objs), ["orders"]);
  assert.deepEqual(triggerDocNgoai("CREATE TRIGGER x BEFORE INSERT ON vc_trip WHEN EXISTS (SELECT 1 FROM pty_party_role r) BEGIN SELECT 1; END", objs), ["pty_party_role"]);
  assert.deepEqual(triggerDocNgoai("CREATE TRIGGER x BEFORE INSERT ON vc_trip WHEN EXISTS (SELECT 1 FROM v_ord_leg_key k JOIN vc_trip t ON 1) BEGIN SELECT RAISE(ABORT, 'orders staff'); END", objs), []);
});

test("ADR-0049 D1 (siết, Hiến chương 5.3): thân MỌI trigger vc_* chỉ đọc bảng vc_ và view công bố đã liệt kê (v_ord_leg_key, v_ord_order_flag, v_ord_passenger_key, v_ord_passenger_row, v_pty_carrier_driver, v_pty_carrier, v_pty_owner_company)", () => {
  const objs = [...names("table"), ...names("view")];
  const trig = db.prepare("SELECT name, sql FROM sqlite_master WHERE type = 'trigger' AND name LIKE 'vc\\_%' ESCAPE '\\'").all() as { name: string; sql: string }[];
  assert.ok(trig.length >= 60, `chống bài rỗng: phải có ≥ 60 trigger vc_ (0033, 0039, 0041, 0042), thấy ${trig.length}`);
  const problems = trig.flatMap((t) => triggerDocNgoai(t.sql, objs).map((o) => `${t.name}: đọc ${o}`));
  assert.deepEqual(problems, [], "trigger của van-chuyen chỉ đọc bảng của mình hoặc view công bố đã liệt kê — không đọc thẳng bảng module khác");
});

test("ADR-0049 D2 (siết, kế hoạch mục 1.6): chỉ gốc lắp ráp (src/index.ts) và module van-chuyen nhắc `mocToiThieuHienHanh` trong mã (bỏ chú thích)", () => {
  const problems: string[] = [];
  for (const file of walk(SRC)) {
    const rel = relative(ROOT, file).split(sep).join("/");
    if (rel === "src/index.ts" || rel.startsWith("src/modules/van-chuyen/")) continue;
    if (/\bmocToiThieuHienHanh\b/.test(maskSource(readFileSync(file, "utf8"), { strings: false, comments: true }))) problems.push(rel);
  }
  assert.deepEqual(problems, [], "orders nhận mốc qua ctx.mocToiThieu — không gọi thẳng hàm công bố của van-chuyen");
});

test("ADR-0068 Đ6 (siết): chỉ gốc lắp ráp (src/index.ts) và module chủ nhắc sáu hàm công bố của gộp hồ sơ (bỏ chú thích)", () => {
  const CHU: Record<string, string> = {
    viecXeCuaNguoi: "src/modules/van-chuyen/",
    soDongNoCuaNguoi: "src/modules/billing/",
    soDonDangPhuTrachCua: "src/modules/dispatch/",
    cauDoiNguoiDat: "src/modules/orders/",
    soDangNhapTheoHoSo: "src/modules/staff/",
    donCuaNguoiDat: "src/modules/orders/",
  };
  const problems: string[] = [];
  for (const file of walk(SRC)) {
    const rel = relative(ROOT, file).split(sep).join("/");
    if (rel === "src/index.ts") continue;
    const text = maskSource(readFileSync(file, "utf8"), { strings: false, comments: true });
    for (const [ten, chu] of Object.entries(CHU)) if (!rel.startsWith(chu) && new RegExp(`\\b${ten}\\b`).test(text)) problems.push(`${rel}: ${ten}`);
  }
  assert.deepEqual(problems, [], "các hàm này tới parties qua ctx.gopHoSo — không module nào gọi thẳng");
});

// ADR-0049 Task A19 (siết do điều phối giao): `taoAppChoKhungThu` (src/index.ts) dựng ứng dụng với hàm tiêm GHI ĐÈ (mốc giả, bỏ nhãn người bấm…) — chỉ khung
// thử được gọi. Quét MỌI tệp mã của kho (src, web, scripts, tests, docs — .ts/.mjs/.js/.cjs, bỏ chú thích, GIỮ chuỗi vì khung thử nhắc tên trong chuỗi esbuild):
// chỉ hai tệp được nhắc tên — src/index.ts (đúng MỘT lần: chỗ khai `export function`) và tests/audit/harness.mjs.
function walkCode(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (name === "node_modules" || name.startsWith(".")) return [];
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return walkCode(p);
    return /\.(ts|mjs|js|cjs)$/.test(p) && !p.endsWith(".d.ts") ? [p] : [];
  });
}
test("ADR-0049 A19 (siết): `taoAppChoKhungThu` chỉ được khai ở src/index.ts và chỉ khung thử tests/audit/harness.mjs gọi", () => {
  const nhac = new Map<string, number>();
  for (const goc of ["src", "web", "scripts", "tests", "docs"]) {
    for (const file of walkCode(join(ROOT, goc))) {
      const rel = relative(ROOT, file).split(sep).join("/");
      if (rel === "src/architecture.test.ts") continue;
      const n = (maskSource(readFileSync(file, "utf8"), { strings: false, comments: true }).match(/\btaoAppChoKhungThu\b/g) ?? []).length;
      if (n > 0) nhac.set(rel, n);
    }
  }
  assert.deepEqual([...nhac.keys()].sort(), ["src/index.ts", "tests/audit/harness.mjs"], "chỉ gốc lắp ráp (khai) và khung thử (gọi) được nhắc taoAppChoKhungThu");
  assert.equal(nhac.get("src/index.ts"), 1, "src/index.ts chỉ KHAI hàm — mã chạy thật (export default) không gọi nó");
  const goc = maskSource(readFileSync(join(SRC, "index.ts"), "utf8"), { strings: false, comments: true });
  assert.match(goc, /\bexport function taoAppChoKhungThu\(/, "chỗ nhắc duy nhất ở gốc là chỗ khai");
});

test("R-P19 (chủ chốt 29/9, Trả lời lần 13): mỗi tham chiếu LOGIC của sổ dữ liệu — cột có thật, KHÔNG khoá ngoại trên cột đó, bảng đích và view trung gian có thật, view thuộc module của bảng đích", () => {
  const refs = dict.tables.flatMap((t) => (t.logicalRefs ?? []).map((r) => ({ t, r })));
  assert.ok(refs.length >= 3, "chống bài rỗng: leg_id, passenger_key, passenger_row_id");
  for (const { t, r } of refs) {
    assert.ok(columns(t.name).some((c) => c.name === r.column), `${t.name}.${r.column} không tồn tại`);
    assert.ok(!fks(t.name).some((f) => f.from === r.column), `${t.name}.${r.column} có khoá ngoại — tham chiếu logic thì không (R-P19)`);
    const dich = dict.tables.find((x) => x.name === r.toTable);
    const view = dict.views.find((x) => x.name === r.viaView);
    assert.ok(dich && view, `${t.name}.${r.column}: bảng ${r.toTable} / view ${r.viaView} không có trong sổ`);
    assert.equal(view!.module, dich!.module, `${r.viaView} phải là view công bố của module chủ ${r.toTable}`);
  }
});

// ---------------------------------------------------------------------------------------------------------------------
// ADR-0024 điều 5 (sổ tiền lượt 1, siết ADR-0002 điều 8): THÂN một trigger chỉ được đọc (a) bảng/view CÙNG module với bảng đặt trigger, hoặc (b) VIEW CÔNG BỐ
// của module mà module đó được phép phụ thuộc (ALLOWED_EDGES); chỉ được GHI bảng cùng module. Hỏi CHÍNH SQLite (không quét chuỗi): với mỗi trigger của
// schema thật, dựng CSDL "ranh giới" (bảng + chỉ mục + view công bố thay bằng bảng rỗng cùng cột — như `boundaryDb`) CHỈ cài đúng trigger đó, EXPLAIN một
// câu tối thiểu kích hoạt nó, trừ đi số lần mở quan hệ của CÙNG câu khi không có trigger — phần dư là thân trigger (spike R2 30/9: EXPLAIN của node:sqlite
// liệt kê cả chương trình con của trigger). Bài `vc_` quét chuỗi ở trên GIỮ NGUYÊN (gỡ = nới rào).
// ---------------------------------------------------------------------------------------------------------------------
function triggerBoundaryDb(): DatabaseSync {
  // TẮT khoá ngoại: có trigger thì SQLite sinh thêm lượt quét BẢNG CON để đếm vi phạm khoá ngoại (isMultiWrite) — những lần mở đó là của câu kích hoạt,
  // không phải của thân trigger (thử 30/9: bật khoá ngoại thì INSERT orders "đọc" dsp_assignment, audit_log chỉ vì có trigger).
  const b = new DatabaseSync(":memory:", { enableForeignKeyConstraints: false });
  const master = db.prepare("SELECT type, name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' AND sql IS NOT NULL").all() as { type: string; name: string; sql: string }[];
  for (const m of master.filter((x) => x.type === "table")) b.exec(m.sql);
  for (const m of master.filter((x) => x.type === "index")) b.exec(m.sql);
  for (const v of dict.views) b.exec(`CREATE TABLE ${v.name} (${columns(v.name).map((c) => c.name).join(", ")})`);
  return b;
}

/** Sự kiện của trigger: bảng, loại câu, danh sách cột `UPDATE OF` (null = mọi cột). */
function triggerEvent(sql: string): { table: string; kind: "INSERT" | "UPDATE" | "DELETE"; cols: string[] | null } {
  const m = /\b(?:BEFORE|AFTER)\s+(INSERT|DELETE|UPDATE(?:\s+OF\s+([\w\s,]+?))?)\s+ON\s+["`]?(\w+)/i.exec(sql);
  if (!m) throw new Error(`không đọc được sự kiện của trigger: ${sql.slice(0, 120)}`);
  const kind = m[1]!.toUpperCase().startsWith("UPDATE") ? "UPDATE" : (m[1]!.toUpperCase() as "INSERT" | "DELETE");
  return { table: m[3]!, kind, cols: m[2] ? m[2].split(",").map((c) => c.trim()) : null };
}

/** Quan hệ thân một trigger đọc/ghi (tên bảng hoặc view công bố), theo EXPLAIN có-trừ-không. `tb` là CSDL ranh giới KHÔNG có trigger nào khác. */
function triggerTouches(tb: DatabaseSync, name: string, sql: string): { table: string; reads: Set<string>; writes: Set<string> } {
  const ev = triggerEvent(sql);
  const cols = (tb.prepare(`PRAGMA table_info(${ev.table})`).all() as { name: string }[]).map((c) => c.name);
  const fire =
    ev.kind === "INSERT" ? `INSERT INTO ${ev.table} DEFAULT VALUES`
    : ev.kind === "DELETE" ? `DELETE FROM ${ev.table}`
    : `UPDATE ${ev.table} SET ${(ev.cols ?? cols).map((c) => `${c} = ${c}`).join(", ")}`;
  const rootOf = new Map<number, string>();
  for (const r of tb.prepare("SELECT tbl_name, rootpage FROM sqlite_master WHERE rootpage > 0").all() as { tbl_name: string; rootpage: number }[]) rootOf.set(r.rootpage, r.tbl_name);
  const count = (): Map<string, number> => {
    const out = new Map<string, number>();
    for (const op of tb.prepare(`EXPLAIN ${fire}`).all() as { opcode: string; p2: number; p3: number }[]) {
      const rel = rootOf.get(op.p2);
      if (!rel || op.p3 !== 0 || (op.opcode !== "OpenRead" && op.opcode !== "OpenWrite")) continue;
      const k = `${op.opcode}:${rel}`;
      out.set(k, (out.get(k) ?? 0) + 1);
    }
    return out;
  };
  const base = count();
  tb.exec(sql);
  try {
    const withTrigger = count();
    const reads = new Set<string>();
    const writes = new Set<string>();
    for (const [k, n] of withTrigger) {
      if (n <= (base.get(k) ?? 0)) continue;
      const [op, rel] = k.split(":") as [string, string];
      (op === "OpenWrite" ? writes : reads).add(rel);
    }
    return { table: ev.table, reads, writes };
  } finally {
    tb.exec(`DROP TRIGGER ${name}`);
  }
}

/** Vi phạm luật thân trigger (ADR-0024 điều 5) của một trigger. */
function triggerBodyViolations(tb: DatabaseSync, name: string, sql: string): string[] {
  const t = triggerTouches(tb, name, sql);
  const mod = ownerOf(t.table);
  if (mod === undefined) return [`${name}: bảng ${t.table} không có trong sổ dữ liệu`];
  const deps = new Set(ALLOWED_EDGES[mod] ?? []);
  const out: string[] = [];
  for (const w of t.writes) if (w !== t.table && ownerOf(w) !== mod) out.push(`${name} (${mod}): GHI ${w} của module ${ownerOf(w) ?? "không có trong sổ"}`);
  for (const r of t.reads) {
    const owner = ownerOf(r);
    if (owner === mod) continue;
    if (owner === undefined) out.push(`${name} (${mod}): đọc ${r} — không có trong sổ dữ liệu`);
    else if (!isView(r)) out.push(`${name} (${mod}): đọc TRỰC TIẾP bảng ${r} của module ${owner} (chỉ được đọc view công bố)`);
    else if (!deps.has(owner)) out.push(`${name} (${mod}): đọc view ${r} của module ${owner} — cạnh ${mod} → ${owner} chưa khai`);
  }
  return out;
}

test("bộ phân tích thân trigger (ADR-0024 đ5): đáp án biết trước của trigger có thật + bắt trigger đọc thẳng bảng module khác", () => {
  const tb = triggerBoundaryDb();
  const sqlOf = (n: string) => (db.prepare("SELECT sql FROM sqlite_master WHERE type = 'trigger' AND name = ?").get(n) as { sql: string } | undefined)?.sql;
  const known: [string, string[]][] = [
    ["lc1_stf_permission_external_partner_only", ["staff", "v_pty_open_role_group"]],
    ["orders_confirm_requires_trip", ["order_service"]],
    ["vc_vehicle_owner_ins", ["v_pty_carrier", "v_pty_owner_company"]],
  ];
  for (const [n, expect] of known) {
    const s = sqlOf(n);
    assert.ok(s, `trigger ${n} không còn trong schema — đổi ca đáp án biết trước`);
    const t = triggerTouches(tb, n, s);
    assert.deepEqual([...t.reads].filter((r) => r !== t.table).sort(), [...expect].sort(), `${n}: quan hệ thân trigger đọc`);
    assert.deepEqual(triggerBodyViolations(tb, n, s), [], `${n}: hợp lệ`);
  }
  // Trigger giả trên `orders` đọc thẳng bảng `pty_party` (của parties, không phải view) → vi phạm; đọc view công bố `v_pty_owner_company` → hợp lệ
  // (orders → parties đã khai); ghi `staff` → vi phạm.
  const bad = "CREATE TRIGGER t_tu_kiem_bad BEFORE UPDATE OF status ON orders WHEN EXISTS (SELECT 1 FROM pty_party) BEGIN SELECT RAISE(ABORT, 'x'); END";
  assert.ok(triggerBodyViolations(tb, "t_tu_kiem_bad", bad).some((v) => /đọc TRỰC TIẾP bảng pty_party của module parties/.test(v)));
  const ok = "CREATE TRIGGER t_tu_kiem_ok BEFORE UPDATE OF status ON orders WHEN EXISTS (SELECT 1 FROM v_pty_owner_company) BEGIN SELECT RAISE(ABORT, 'x'); END";
  assert.deepEqual(triggerBodyViolations(tb, "t_tu_kiem_ok", ok), []);
  const write = "CREATE TRIGGER t_tu_kiem_ghi AFTER UPDATE OF status ON orders BEGIN UPDATE staff SET active = active; END";
  assert.ok(triggerBodyViolations(tb, "t_tu_kiem_ghi", write).some((v) => /GHI staff của module staff/.test(v)));
});

test("ADR-0024 điều 5: thân MỌI trigger của schema chỉ đọc bảng cùng module / view công bố của module được phép phụ thuộc, chỉ ghi bảng cùng module", () => {
  const tb = triggerBoundaryDb();
  const trig = db.prepare("SELECT name, sql FROM sqlite_master WHERE type = 'trigger' ORDER BY name").all() as { name: string; sql: string }[];
  assert.ok(trig.length >= 130, `chống bài rỗng: phải có ≥ 130 trigger (0001–0043 có 135), thấy ${trig.length}`);
  const problems = trig.flatMap((t) => triggerBodyViolations(tb, t.name, t.sql));
  assert.deepEqual(problems, [], "trigger chỉ đọc bảng của module mình hoặc view công bố của module được phép phụ thuộc (ADR-0024 điều 5)");
});
