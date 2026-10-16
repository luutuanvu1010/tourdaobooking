// SỔ VÀNG VẬN CHUYỂN — bài chạy THẬT cho hai ca VC-19, VC-20 (tài xế đối tác từ chối trong hạn / quá hạn).
// Nguồn đáp án: golden/van-chuyen/dieu-phoi-30-ca.json (chủ xác nhận 2026-10-16). Chạy CẢ ứng dụng trên SQLite thật, đúng số liệu của ca (4 khách bớt 2, xe 15 chỗ đã giữ 12…).
// Khác các bài NT-5 / A4 T7 / A4 T8 cùng thư mục ở chỗ: số liệu và câu hỏi lấy từ ca vàng, không từ kế hoạch thi công. Tên khách, SĐT, số giấy tờ GIẢ.
// LUẬT ĐỒNG HỒ (xem đầu tu-choi.test.ts): đường Từ chối thành công đi qua trigger so GIỜ THẬT của CSDL — nhóm VC-19/20 bật đồng hồ giả theo giờ thật và gieo chuyến ngày thật + 2.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { seedStaff } from "../../../tests/audit/harness.mjs";
import {
  ACC, ADM, DRIVER, DRIVER_PARTNER, SALES, SUP, batDongHo, chiTiet, chuyenSan, denGio, nhaXeKhung, setup, uuid, xeNhaXe,
} from "../../../tests/audit/dieu-phoi-khung.mjs";
import { msToVnLocal } from "../../shared/vn-date.ts";

type W = any;
const DRIVER_PARTNER2 = "66666666-6666-4666-8666-666666666669";
const AT = "2026-09-01T00:00:00.000Z";
let so = 0;

// ───────────── Tài xế đối tác từ chối (VC-19, VC-20) ─────────────
function laiChoNhaXe(w: W, staffId: string, carrierId: string) {
  so++;
  w.sqlite.prepare(`INSERT INTO pty_party_relationship (id, from_party_id, to_party_id, relationship_type_code, valid_from_date, created_at, updated_at)
    VALUES (?, ?, ?, 'DRIVES_FOR', '2026-09-01', ?, ?)`).run(uuid(), `pty-${staffId}`, carrierId, AT, AT);
  w.sqlite.prepare(`INSERT INTO pty_person_document (id, party_id, document_type_code, document_number, number_key, issued_place, license_class_code, expiry_date, created_at, updated_at)
    VALUES (?, ?, 'GPLX', ?, ?, 'Nơi cấp Dò Tìm', 'D', '2030-12-31', ?, ?)`).run(`g-sv-${so}`, `pty-${staffId}`, `79660000000${so}`, `79660000000${so}`, AT, AT);
}
function theGioiDoiTac(w: W) {
  seedStaff(w.sqlite, { id: DRIVER_PARTNER2, phone: "0900000036", name: "Tài Xế Đối Tác Hai", perms: ["DRIVER_PARTNER"] });
  const nx = nhaXeKhung(w, "Nhà xe Một");
  laiChoNhaXe(w, DRIVER_PARTNER, nx);
  laiChoNhaXe(w, DRIVER_PARTNER2, nx);
  return { nx, xe1: xeNhaXe(w, nx) };
}

const ngayThat = (n: number) => msToVnLocal(Date.now() + n * 86_400_000).date;
const tuChoi = (w: W, id: string, body: Record<string, unknown>, as = DRIVER_PARTNER) => w.call("POST", `/api/van-chuyen/cuoc-cua-toi/${id}/tu-choi`, { as, body });
const soNhatKyTuChoi = (w: W, id: string) => w.q("SELECT count(*) n FROM audit_log WHERE action = 'trip_driver_refused' AND target_id = ?", id)[0].n as number;
const tinTuChoi = async (w: W, as: string) => ((await w.call("GET", "/api/thong-bao?ngan=tat-ca", { as })).json.tin as any[]).filter((t) => t.loai === "chuyen" && /từ chối/.test(t.cau));
/** Chuyến 07:30–09:00 ngày thật + 2 của tài xế đối tác; hạn từ chối = 07:30 − 720 phút = 19:30 ngày thật + 1. */
async function chuyen0730() {
  const tat = batDongHo(Date.now());
  const w = setup();
  const { xe1 } = theGioiDoiTac(w);
  const a = await chuyenSan(w, { taiXe: DRIVER_PARTNER, xe: xe1, ngay: ngayThat(2), bd: "07:30", kt: "09:00", gio: "07:45" });
  return { tat, w, a };
}

test("VC-19 từ chối trong hạn: hạn 19:30, bây giờ 18:00 → chấp nhận, MỘT dòng nhật ký không tên, chuyến về «chưa có tài xế», Quản trị / Toàn quyền nhận tin, Kế toán / tài xế khác không; bấm lại vẫn thành công, không ghi thêm", async () => {
  const { tat, w, a } = await chuyen0730();
  try {
    denGio("18:00", ngayThat(1));
    const rid = uuid();
    const r = await tuChoi(w, a.id, { requestId: rid, lyDo: "TCC_BAN_LICH_KHAC" });
    assert.equal(r.status, 200, r.text);
    assert.deepEqual(r.json, { daTuChoi: true });
    assert.equal(soNhatKyTuChoi(w, a.id), 1);
    const nk = w.q("SELECT detail FROM audit_log WHERE action = 'trip_driver_refused' AND target_id = ?", a.id)[0].detail as string;
    assert.doesNotMatch(nk, /Tài Xế|Khách Dò Tìm|0900/, "nhật ký không tên");
    const vp = await chiTiet(w, a.id, SALES);
    assert.equal(vp.chuyen.taiXe, null);
    assert.ok(vp.chuyen.lyDoGiu.some((l: any) => l.ma === "CHUA_CO_TAI_XE"), "về «chưa có tài xế»");
    for (const as of [ADM, SUP]) {
      const t = await tinTuChoi(w, as);
      assert.equal(t.length, 1, `${as} nhận tin`);
      assert.ok(t[0].cau.endsWith("— cần xếp người khác"), t[0].cau);
      assert.doesNotMatch(t[0].cau, /Tài Xế Đối Tác|Bận lịch|TCC_/, "tin không tên tài xế, không lý do");
    }
    for (const as of [ACC, DRIVER, DRIVER_PARTNER2]) assert.deepEqual(await tinTuChoi(w, as), [], `${as} không nhận tin`);
    const lap = await tuChoi(w, a.id, { requestId: rid, lyDo: "TCC_BAN_LICH_KHAC" });
    assert.equal(lap.status, 200, "bấm lại cùng lệnh vẫn thành công");
    assert.equal(soNhatKyTuChoi(w, a.id), 1, "không ghi thêm");
  } finally {
    tat();
  }
});

test("VC-20 từ chối quá hạn: hạn 19:30, bây giờ 20:00 (quá 30 phút) → BỊ TỪ CHỐI refuse_deadline_passed; chuyến vẫn do tài xế đó giữ, không ghi gì", async () => {
  const { tat, w, a } = await chuyen0730();
  try {
    denGio("20:00", ngayThat(1));
    const r = await tuChoi(w, a.id, { requestId: uuid(), lyDo: "TCC_KHAC" });
    assert.equal(r.status, 409, r.text);
    assert.equal(r.json.error.code, "refuse_deadline_passed");
    assert.equal(soNhatKyTuChoi(w, a.id), 0);
    assert.equal(w.q("SELECT valid_to_at v FROM vc_trip_driver WHERE trip_id = ? ORDER BY rowid", a.id)[0].v, null, "dòng lái vẫn mở");
    assert.equal((await chiTiet(w, a.id, SALES)).chuyen.taiXe !== null, true, "chuyến vẫn có tài xế");
  } finally {
    tat();
  }
});

