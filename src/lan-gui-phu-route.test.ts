// HÀNG RÀO H2 (ADR-0094 đ1, T6): mọi route GHI có đăng nhập đi qua lớp vé. Router áp lớp cho mọi route ghi `access ≠ "public"` không có trong tệp miễn
// (src/shared/lan-gui-mien.ts) — nên "lọt lớp" chỉ xảy ra qua hai cửa, bài này canh cả hai:
//   (1) đổi một route ghi sang `"public"`: tập route ghi công khai phải BẰNG ĐÚNG 6 route `auth` đã biết ∪ mục miễn `congKhai: true`;
//   (2) tệp miễn: mỗi mục phải khớp một route ghi có thật (mục ma ⇒ đỏ) và có lý do.
// Bóc route bằng cùng khuôn `route("METHOD", "path", "access"` của src/route-write-guard.test.ts; số route bóc được phải bằng số lời gọi `route(` (khuôn lạ ⇒ đỏ).
// Giới hạn: canh QUÊN, không canh CỐ Ý (vd sửa router bỏ lớp — đó là việc của H1 và người kiểm đọc mã).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { maskSource } from "../scripts/source-mask-lib.mjs";
import { LAN_GUI_MIEN } from "./shared/lan-gui-mien.ts";

const SRC = fileURLToPath(new URL(".", import.meta.url));
const GHI = new Set(["POST", "PUT", "PATCH", "DELETE"]);
// ADR-0074 (Phần B Task 4, 2026-10-16): + "POST /api/auth/mfa/verify" — bước hai của đăng nhập, chưa có phiên (cổng là cookie chờ), như đăng nhập PIN.
// ADR-0074 (Phần B Task 6, 2026-10-16): + "POST /api/auth/mfa/enroll/start", "POST /api/auth/mfa/enroll/confirm" — bật lại lớp hai ở bước đăng nhập (cửa sổ 24 giờ),
// chưa có phiên (cổng là cookie chờ purpose "enroll"), như bước hai.
// ADR-0074 (Phần C Task 2, 2026-10-16): + "POST /api/auth/mfa/email" — gửi mã email ở bước hai, chưa có phiên (cổng là cookie chờ purpose "verify"), như bước hai.
const CONG_KHAI_DA_BIET = [
  "POST /api/auth/login", "POST /api/auth/passkey/options", "POST /api/auth/passkey/login", "POST /api/auth/logout", "POST /api/auth/session-ended", "POST /api/auth/mfa/verify",
  "POST /api/auth/mfa/enroll/start", "POST /api/auth/mfa/enroll/confirm", "POST /api/auth/mfa/email",
];

function routes(): { method: string; path: string; access: string }[] {
  const out: { method: string; path: string; access: string }[] = [];
  for (const mod of readdirSync(join(SRC, "modules")).sort()) {
    const f = join(SRC, "modules", mod, "index.ts");
    if (!existsSync(f)) continue;
    const text = readFileSync(f, "utf8");
    const khai = (maskSource(text).match(/\broute\(/g) ?? []).length;
    const boc = [...text.matchAll(/route\(\s*"(GET|POST|PUT|PATCH|DELETE)",\s*"([^"]+)",\s*"([^"]+)"/g)];
    assert.equal(boc.length, khai, `${mod}/index.ts: ${khai} lời gọi route( nhưng bóc được ${boc.length}`);
    for (const h of boc) out.push({ method: h[1]!, path: h[2]!, access: h[3]! });
  }
  return out;
}

test("H2 (1): route ghi công khai = đúng 9 route auth đã biết ∪ mục miễn congKhai — đổi route ghi sang public mà không khai ⇒ đỏ", () => {
  const congKhai = routes().filter((r) => GHI.has(r.method) && r.access === "public").map((r) => `${r.method} ${r.path}`).sort();
  const choPhep = [...CONG_KHAI_DA_BIET, ...LAN_GUI_MIEN.filter((m) => m.congKhai).map((m) => `${m.method} ${m.path}`)].sort();
  assert.deepEqual(congKhai, choPhep, "route ghi công khai không có trong danh sách — route này sẽ KHÔNG đi qua lớp chống ghi trùng");
});

test("H2 (2): mỗi mục tệp miễn khớp một route ghi có thật, có lý do; không trùng mục", () => {
  const co = new Set(routes().filter((r) => GHI.has(r.method)).map((r) => `${r.method} ${r.path}`));
  const da = new Set<string>();
  for (const m of LAN_GUI_MIEN) {
    const k = `${m.method} ${m.path}`;
    assert.ok(co.has(k), `mục miễn "${k}" không khớp route ghi nào (mục ma)`);
    assert.ok(m.lyDo.trim().length > 0, `mục miễn "${k}" thiếu lý do`);
    assert.ok(!da.has(k), `mục miễn "${k}" trùng`);
    da.add(k);
  }
});

test("H2 (3): router đọc ĐÚNG tệp miễn này và áp lớp theo access ≠ public", () => {
  const r = maskSource(readFileSync(join(SRC, "shared/router.ts"), "utf8"), { strings: false });
  assert.match(r, /import \{ laMienLanGui \} from "\.\/lan-gui-mien\.ts";/);
  assert.match(r, /if \(!WRITE_METHODS\.has\(request\.method\) \|\| !who \|\| laMienLanGui\(request\.method, hit\.r\.path\)\) return chayHandler\(env\);/);
  // Nhận main (bản 2.11) vào nhánh hồ sơ riêng tư: main thêm 1 route ghi (ADR-0128 Q1, POST …/van-chuyen/moc-ra-lenh; vé hỗ trợ đợt 2a chỉ thêm route đọc) => 217 + 1 = 218.
  // Sổ đại lý đợt 2 Task 5 (ADR-0132 điều 2): +1 «Bên kia đã nhận» POST /api/ledger/counterparty-receipts/:receiptId/confirm => 218 + 1 = 219 (đi qua lớp vé, không miễn;
  // MỘT db.batch — gửi lặp cùng vé phát lại, gửi mới thấy 409 «không còn chờ»).
  // Sổ đại lý đợt 2 Task 6 (ADR-0079 điều 7 b2): +1 «Chụp bù» POST /api/orders/:id/chup-bu => 219 + 1 = 220 (đi qua lớp vé, không miễn; MỘT db.batch — câu cổng đầu lô
  // so `updated_at` và «chưa có bản chụp nào», nên gửi lặp cùng vé phát lại, gửi mới thấy 409).
  assert.equal(routes().filter((x) => GHI.has(x.method) && x.access !== "public").length, 220, "số route ghi có đăng nhập đổi — cập nhật số này có chủ đích (L0: 129; gộp main a6fd0a3d: +2 lịch xe bận POST …/xe/:id/ban, …/ban/:bid/rut = 131; gộp vào Đợt 4 tiền xe thuê 5/10: +10 — bang-gia, bang-gia/:id/ket-thuc, tuyen, tuyen/:code, co-xe, co-xe/:code, bốn lệnh chuyen/:id/chi-phi/* = 141; gộp Đợt 4 vào Đợt 5 (dot5-sau-dot4): +2 xe đang chạy POST …/chuyen/:id/them-diem, …/phan-bo/:aid/bao-huy = 143; Đợt 5 A-1b tầng 3 (dot5-tang3): +1 tài xế bổ sung tên POST …/cuoc-cua-toi/:id/hanh-khach = 144; năm lỗi tiền Đợt 1 (ADR-0089): +1 phân loại lý do huỷ POST /api/orders/:id/cancel-reason = 145; Phần B: +6 lệnh cọc POST /api/orders/:id/coc/{duyet, duyet/:duyetId/huy, chi, chuyen, hoan-ngoai, hoan-ngoai/:ghiId/xac-nhan} = 151; TNV-G3 (ADR-0088 đ2): +1 \"Thay lần thu\" POST /api/ledger/receipt-replacements = 152; C14 (đánh giá ERP 7/10): +1 thay chặng POST /api/orders/:id/legs/:legId/replace = 153; gói A1 vận chuyển (ADR-0097 Đ2, Đ3): +2 POST …/chuyen/:id/phan-bo/:aid/dieu-chinh, …/chuyen/:id/thu-hoi-xuat-ben = 155; gói A2 (ADR-0063 D1): +1 POST /api/orders/:id/money-edit = 156; A4 T7 (ADR-0053 D8): +1 tài xế Từ chối chuyến POST …/cuoc-cua-toi/:id/tu-choi = 157; A4 T8 (ADR-0053 D9): +2 báo bận của tôi POST /api/van-chuyen/ban, …/ban/:id/rut = 159); nhập nền A4 vào gói A5 12/10: 159 (nền có A4) + 7 route ghi của A5 (gửi, rút, nhận, không nhận, cứu hộ, duyệt, bác) = 166; nhập main 1c471990 (QR thanh toán + sổ đại lý đợt 1) vào gói A+C: 166 + 7 route ghi của main (QR +1 PUT /api/parties/:id/tai-khoan-nhan-tien; sổ đại lý +4 POST /api/pricing/{hoa-hong, hoa-hong/:id/dong, cung-ung, cung-ung/:id/dong}, +1 POST /api/ledger/ky/:period/khoa, +1 POST /api/orders/:id/thuong-mai/:serviceId) = 173; ADR-0115 đợt 1 (điều chỉnh công nợ cần duyệt): +3 POST /api/ledger/adjustment-requests/:requestId/{approve, reject, withdraw} = 176; ADR-0117 lần 1 (loại đối tác là dữ liệu): +3 POST /api/pricing/loai-doi-tac, …/loai-doi-tac/:code/tat, …/loai-doi-tac/:code/bat = 179 (đi qua lớp vé, không miễn); ADR-0119 Việc 4 (quản lý nhóm hỗ trợ): +4 POST /api/feedback/admin/teams, PATCH …/admin/teams/:id, PUT và DELETE …/admin/teams/:id/members/:staffId = 183 (đi qua lớp vé, không miễn); ADR-0119 Việc 5c (nhận việc, xử lý theo nhóm): +2 POST /api/feedback/:id/claim, PATCH /api/feedback/:id/xu-ly = 185 (đi qua lớp vé, không miễn); ADR-0119 Việc 5d (chuyển nhóm): +1 POST /api/feedback/:id/transfer = 186 (đi qua lớp vé, không miễn); ADR-0074 Phần B Task 5 (tự phục vụ bảo mật hai lớp): +6 POST /api/account/mfa/{totp/start, totp/confirm, recovery/regenerate, remove, trusted/:id/forget, trusted/forget-all} = 192 (đi qua lớp vé, không miễn — vé chỉ lưu Location, không lưu thân phản hồi nên khoá / mã dự phòng không bị phát lại); ADR-0074 Phần B Task 6: +1 POST /api/staff/:id/mfa-reset (Quản trị/Toàn quyền tắt lớp hai) = 193 (đi qua lớp vé, không miễn); gộp ADR-0117 lần 2 vào nhánh hai lớp: +6 POST mức TA = 199; ADR-0074 Phần C Task 3 (tự bật yếu tố email): +2 POST /api/account/mfa/email/{start, confirm} = 201 (đi qua lớp vé, không miễn — start không có lô ghi mang vé: bộ đếm gửi thư và dòng mã ghi ngoài vé có tên, gửi lại sau 502 phải gửi được thư mới); ADR-0123 lát H-2 kho tệp: +1 POST /api/parties/:id/documents/:did/tep (tải ảnh giấy tờ) = 202 (đi qua lớp vé, không miễn; có tên ở GHI_NHIEU_LAN — ruling Q6; có ở BI_MAT); +1 POST /api/parties/tep-cho-xoa/chay-lai (chạy lại xoá kho) = 203 (đi qua lớp vé, không miễn; có tên ở GHI_NHIEU_LAN — ruling Q6); ADR-0124, ADR-0126 đ1 lát H-3 Task 3: +2 POST /api/parties/chinh-sach-rieng-tu (đăng chính sách), POST /api/parties/cua-toi/dong-y (đồng ý / rút đồng ý) = 205 (đi qua lớp vé, không miễn; mỗi route MỘT db.batch); lát H-3 Task 4: +2 POST /api/parties/cua-toi/phieu (gửi phiếu tự khai), POST /api/parties/cua-toi/phieu/:pid/rut (rút phiếu) = 207 (đi qua lớp vé, không miễn — gửi lặp cùng vé phát lại Location /account, bài Review Focus 4 cùng vé); lát H-4 việc 3: +1 POST /api/parties/xac-minh/:pid/xem-so (xem đủ số phiếu đang chờ) = 208 (đi qua lớp vé, không miễn; có ở BI_MAT; nhật ký ghi TRƯỚC khi trả số); lát H-4 việc 4: +2 POST /api/parties/xac-minh/:pid/chap-nhan, …/tu-choi = 210 (đi qua lớp vé, không miễn; MỘT db.batch mỗi route — lính gác trong câu quyết nên gửi lặp cùng vé phát lại, gửi mới thấy 409); lát H-5 việc 4: +2 POST /api/parties/cua-toi/phieu-xoa, POST …/phieu-xoa/:pid/rut = 212 (đi qua lớp vé, không miễn; MỘT db.batch mỗi route — gửi lặp cùng vé phát lại Location); lát H-5 việc 5: +3 POST /api/parties/phieu-xoa/:pid/thuc-hien, …/:pid/tu-choi, /api/parties/phieu-xoa/chay-lai = 215 (đi qua lớp vé, không miễn; thực hiện / chạy lại có tên ở GHI_NHIEU_LAN vì xoá kho R2 nằm giữa hai lần ghi D1); lát H-5 việc 6: +2 POST /api/parties/anh-can-xoa/xoa, POST /api/sessions/an-danh-cu = 217 (đi qua lớp vé, không miễn; xoá ảnh có tên ở GHI_NHIEU_LAN vì xoá kho R2 nằm giữa hai lần ghi D1; ẩn danh phiên MỘT db.batch); ADR-0128 Q1: +1 POST /api/van-chuyen/moc-ra-lenh = 218; sổ đại lý đợt 2 Task 5 (ADR-0132 điều 2): +1 POST /api/ledger/counterparty-receipts/:receiptId/confirm = 219 (đi qua lớp vé, không miễn); sổ đại lý đợt 2 Task 6 (ADR-0079 điều 7 b2): +1 POST /api/orders/:id/chup-bu = 220 (đi qua lớp vé, không miễn)");
});
