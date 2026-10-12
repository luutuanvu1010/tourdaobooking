// TÀI XẾ BỔ SUNG TÊN KHÁCH (ADR-0052 D5b; Vận chuyển Đợt 5 A-1b Task 14 — chủ duyệt 5/10): route `POST /api/van-chuyen/cuoc-cua-toi/:id/hanh-khach`, ô
// `trip.passenger.add` (tài xế công ty — assigned). Chạy CẢ ứng dụng trên SQLite thật, đồng hồ giả (ngày chạy 2027-03-11 — tests/audit/dieu-phoi-khung.mjs). Tên, SĐT GIẢ.
// Luật: chuyến mình đang lái, trong ngày chạy, suất khách MỞ chưa có tên của đúng chuyến; lô: cổng (version máy chủ đọc) → nhật ký → sự kiện PASSENGER_NAMED →
// câu orders (dòng hành khách source DRIVER, gác id nhật ký) → gắn tên suất → bản chốt dòng thêm sau xuất bến (nếu xe đang chạy). Phản hồi KHÔNG tên.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import {
  ADM, DRIVER, DRIVER2, DRIVER_PARTNER, NGAY_SAU, SALES, SUP, batDongHo, chiTiet, chuyenSan, denGio, don, setup, tienDo, uuid,
} from "../../../tests/audit/dieu-phoi-khung.mjs";

const boSung = (w: any, tripId: string, than: Record<string, unknown>, as = DRIVER) =>
  w.call("POST", `/api/van-chuyen/cuoc-cua-toi/${tripId}/hanh-khach`, { as, body: { requestId: uuid(), fullName: "Khách Tài Xế Nhập", birthYear: 1977, paxCode: null, ...than } });
// Kiểm định kỳ (scripts/audit-checks.mjs) trên dữ liệu DO LÔ THẬT ghi: R-ORD-11 (vế DRIVER đòi sự kiện PASSENGER_NAMED trên suất mang khoá người) + mọi R-VC-* mức
// fail — lệch allocation_id / trip_id giữa sự kiện và suất thì `audit-invariants --db remote` đỏ ngay lần tài xế đầu tiên bổ sung tên.
const { CHECKS } = (await import(new URL("../../../scripts/audit-checks.mjs", import.meta.url).href)) as { CHECKS: { code: string; sql: string; level: string; mode?: string }[] };
function kiemDinhKySach(w: any) {
  const ds = CHECKS.filter((c) => c.code === "R-ORD-11" || (c.code.startsWith("R-VC-") && c.level === "fail"));
  assert.ok(ds.some((c) => c.code === "R-ORD-11"), "chống bài rỗng: có R-ORD-11");
  for (const c of ds) {
    const rows = w.q(c.sql.replace(/\s+/g, " ").trim());
    const n = c.mode === "rows" ? rows.length : Number(Object.values(rows[0] ?? { n: 0 })[0]);
    assert.equal(n, 0, `${c.code} có vi phạm`);
  }
}
const suatChuaTen = (w: any, tripId: string): string[] =>
  w.q("SELECT id FROM vc_trip_allocation WHERE trip_id = ? AND kind = 'PASSENGER' AND valid_to_at IS NULL AND passenger_key IS NULL ORDER BY id", tripId).map((r: any) => r.id);

test("D5b chuyến LÊN KẾ HOẠCH trong ngày chạy: tài xế bổ sung tên → 200 { ok, soNguoi } không tên; dòng hành khách source DRIVER, suất gắn đúng khoá, sự kiện + nhật ký không tên; lần hai 409; lặp requestId → một lần", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await chuyenSan(w, { soNguoi: 2, ten: 1 });
    const [s] = suatChuaTen(w, a.id);
    assert.ok(s, "chống bài rỗng: có một suất chưa tên");
    const rid = uuid();
    const r = await boSung(w, a.id, { suatId: s, requestId: rid });
    assert.equal(r.status, 200, r.text);
    assert.deepEqual(r.json, { ok: true, soNguoi: 1 });
    assert.doesNotMatch(r.text, /Khách Tài Xế Nhập|1977/);
    const hk = w.q("SELECT id, person_key, previous_id, source, full_name, birth_year, created_by FROM ord_passenger WHERE order_id = ? AND source = 'DRIVER'", a.don.id);
    assert.equal(hk.length, 1);
    assert.deepEqual([hk[0].person_key, hk[0].previous_id, hk[0].full_name, hk[0].birth_year, hk[0].created_by], [hk[0].id, null, "Khách Tài Xế Nhập", 1977, DRIVER]);
    assert.equal(w.q("SELECT passenger_key k FROM vc_trip_allocation WHERE id = ?", s)[0].k, hk[0].person_key, "suất gắn đúng khoá người mới");
    const ev = w.q("SELECT kind, allocation_id, count FROM vc_trip_event WHERE trip_id = ? AND kind = 'PASSENGER_NAMED'", a.id);
    assert.deepEqual(ev.map((x: any) => ({ ...x })), [{ kind: "PASSENGER_NAMED", allocation_id: s, count: 1 }]);
    const nk = w.q("SELECT detail FROM audit_log WHERE action = 'trip_passenger_named'");
    assert.equal(nk.length, 1);
    assert.match(nk[0].detail, new RegExp(`${a.ma}.*${a.don.code}`));
    assert.doesNotMatch(nk[0].detail, /Khách Tài Xế Nhập|1977|Dò Tìm/);
    kiemDinhKySach(w);
    // Lặp cùng requestId → kết quả cũ, không ghi thêm.
    assert.equal((await boSung(w, a.id, { suatId: s, requestId: rid })).status, 200);
    assert.equal(w.q("SELECT count(*) n FROM ord_passenger WHERE source = 'DRIVER'")[0].n, 1);
    assert.equal(w.q("SELECT count(*) n FROM vc_trip_event WHERE request_id = ?", rid)[0].n, 1, "lặp: đúng một sự kiện PASSENGER_NAMED");
    // Suất đã có tên → 409.
    const lai = await boSung(w, a.id, { suatId: s });
    assert.equal(lai.status, 409, lai.text);
    assert.equal(lai.json.error.code, "suat_da_co_ten");
    // Đủ tên rồi: xuất bến không còn giữ "thiếu tên".
    denGio("12:40");
    assert.equal((await tienDo(w, "tai-xe", a.id, "xuat-ben")).status, 200);
  } finally {
    tat();
  }
});

test("D5b xe ĐANG CHẠY: suất chưa tên do văn phòng thêm sau xuất bến → tài xế bổ sung tên → bản chốt thêm dòng sau xuất bến trỏ dòng hành khách mới", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await chuyenSan(w);
    const b = await don(w, { gio: "13:30", soNguoi: 2, ten: 1, noiDon: "Khách sạn Hai Dò Tìm" });
    denGio("12:40");
    assert.equal((await tienDo(w, "tai-xe", a.id, "xuat-ben")).status, 200);
    denGio("12:41");
    const c = await chiTiet(w, a.id, ADM);
    const them = await w.call("POST", `/api/van-chuyen/chuyen/${a.id}/them-diem`, {
      as: ADM, body: { version: c.chuyen.version, requestId: uuid(), chang: [{ legId: b.legId, soSuat: 2 }], phaLe: { lyDo: "PHA_LE_SU_CO" } },
    });
    assert.equal(them.status, 200, them.text);
    const [s] = suatChuaTen(w, a.id);
    assert.ok(s, "chống bài rỗng: suất chưa tên trên xe đang chạy");
    denGio("12:42");
    const r = await boSung(w, a.id, { suatId: s });
    assert.equal(r.status, 200, r.text);
    const hk = w.q("SELECT id FROM ord_passenger WHERE order_id = ? AND source = 'DRIVER'", b.id);
    assert.equal(hk.length, 1);
    const chot = w.q("SELECT check_id, added_after_departure, passenger_row_id FROM vc_trip_manifest WHERE allocation_id = ?", s);
    assert.deepEqual(chot.map((x: any) => ({ ...x })), [{ check_id: null, added_after_departure: 1, passenger_row_id: hk[0].id }]);
    kiemDinhKySach(w);
  } finally {
    tat();
  }
});

test("D5b cổng: Bán hàng / Quản trị / tài xế đối tác 403; tài xế không lái chuyến 404; ngoài ngày chạy 404; suất lạ 404; thân sai 400; Toàn quyền không có route văn phòng — vẫn phải là người đang lái (404)", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await chuyenSan(w, { soNguoi: 2, ten: 1 });
    const [s] = suatChuaTen(w, a.id);
    for (const as of [SALES, ADM, DRIVER_PARTNER]) assert.equal((await boSung(w, a.id, { suatId: s }, as)).status, 403, `${as} 403`);
    assert.equal((await boSung(w, a.id, { suatId: s }, SUP)).status, 404, "Toàn quyền không đang lái");
    assert.equal((await boSung(w, a.id, { suatId: s }, DRIVER2)).status, 404, "tài xế khác");
    assert.equal((await boSung(w, a.id, { suatId: uuid() })).status, 404, "suất lạ");
    assert.equal((await boSung(w, a.id, { suatId: s, fullName: "" })).status, 400, "thiếu họ tên");
    assert.equal((await boSung(w, a.id, { suatId: s, birthYear: 1800 })).status, 400, "năm sinh sai");
    const mai = await chuyenSan(w, { soNguoi: 2, ten: 1, ngay: NGAY_SAU, taiXe: DRIVER2 });
    const [sm] = suatChuaTen(w, mai.id);
    assert.equal((await boSung(w, mai.id, { suatId: sm }, DRIVER2)).status, 404, "ngoài ngày chạy");
    assert.equal(w.q("SELECT count(*) n FROM ord_passenger WHERE source = 'DRIVER'")[0].n, 0, "từ chối thì không ghi");
    assert.equal(w.q("SELECT count(*) n FROM audit_log WHERE action = 'trip_passenger_named'")[0].n, 0);
  } finally {
    tat();
  }
});
