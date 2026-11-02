// ADR-0154 Đ3 — kế hoạch lượt 2 Task 2.2: đơn của Đối tác lập LÚC công tắc «Ẩn thông tin khách» BẬT mang dấu miễn danh sách (`orders.manifest_exempt`, chụp một lần lúc lập). Cổng cho xe chạy
// (`kiemXuatBen`, MỘT luật cho màn, lệnh và lịch chung) KHÔNG giữ vì «Đủ tên khách» với chặng của đơn mang dấu, chỉ NHẮC (`nhacDieuKien` ở chi tiết chuyến của văn phòng). Đơn không mang dấu
// (kể cả của Đối tác lập lúc TẮT, và đơn Bán hàng lúc BẬT) vẫn bị giữ như hôm nay; dấu không miễn THIEU_SUAT, KHACH_DA_DOI. Chạy CẢ ứng dụng trên SQLite thật, đồng hồ giả (ngày chạy 2027-03-11 —
// tests/audit/dieu-phoi-khung.mjs); đơn mang dấu dựng bằng đường thật `donDoiTacCoDau` (trigger cấm UPDATE dấu — không gieo tắt). Tên, SĐT là GIẢ.
// Khuôn: bo-sung-ten.test.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import {
  ACC, ADM, DRIVER, DRIVER2, NGAY, SALES, SUP, batDongHo, chiTiet, chuyenSan, datCongTacAnKhach, denGio, don, donDoiTac, donDoiTacCoDau, setup, tienDo, xepHet,
} from "../../../tests/audit/dieu-phoi-khung.mjs";

const { CHECKS } = (await import(new URL("../../../scripts/audit-checks.mjs", import.meta.url).href)) as { CHECKS: { code: string; sql: string; level: string; mode?: string }[] };
/** Kiểm định kỳ (scripts/audit-checks.mjs) trên dữ liệu do lô thật ghi: R-VC-4 (bản chốt khớp suất), R-VC-10 và mọi R-VC-* mức fail phải đếm 0. */
function kiemDinhKySach(w: any) {
  const ds = CHECKS.filter((c) => c.code.startsWith("R-VC-") && c.level === "fail");
  for (const ma of ["R-VC-4", "R-VC-10"]) assert.ok(ds.some((c) => c.code === ma), `chống bài rỗng: có ${ma}`);
  for (const c of ds) {
    const rows = w.q(c.sql.replace(/\s+/g, " ").trim());
    const n = c.mode === "rows" ? rows.length : Number(Object.values(rows[0] ?? { n: 0 })[0]);
    assert.equal(n, 0, `${c.code} có vi phạm`);
  }
}
const dau = (w: any, orderId: string): number => Number(w.q("SELECT manifest_exempt m FROM orders WHERE id = ?", orderId)[0].m);
const lyDoMa = async (w: any, tripId: string, as = SALES): Promise<string[]> => (await chiTiet(w, tripId, as)).chuyen.lyDoGiu.map((l: any) => l.ma);
const nhacMa = async (w: any, tripId: string, as = SALES): Promise<{ ma: string; maDon: string }[]> => (await chiTiet(w, tripId, as)).nhacDieuKien.map((x: any) => ({ ...x }));
/** Hai chuyến độc lập (xe, tài xế riêng) cho hai đơn — đơn `a` (tài xế DRIVER) và đơn `b` (DRIVER2); `soNguoi` mỗi đơn. */
async function haiChuyen(w: any, a: { id: string; code: string; legId: string }, b: { id: string; code: string; legId: string }, soNguoi = 2) {
  const t1 = await chuyenSan(w, { don: a, soNguoi, taiXe: DRIVER });
  const t2 = await chuyenSan(w, { don: b, soNguoi, taiXe: DRIVER2 });
  return { t1, t2 };
}

test("(h6) P16 — đổi công tắc KHÔNG đổi dấu: O1 lập lúc BẬT, O2 lập lúc TẮT; BẬT lại, TẮT lại: manifest_exempt vẫn 1 và 0; chi tiết chuyến của O1 luôn nhắc, của O2 luôn giữ THIEU_TEN; cho xe chạy: chuyến O1 200, chuyến O2 409 THIEU_TEN", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const o1 = await donDoiTacCoDau(w, { soNguoi: 2, noiDon: "Khách sạn Một Dò Tìm" }); // công tắc BẬT
    assert.equal(dau(w, o1.id), 1);
    await datCongTacAnKhach(w, false);
    const o2 = await donDoiTac(w, { soNguoi: 2, noiDon: "Khách sạn Hai Dò Tìm" }); // lập lúc TẮT: đối tác không gửi tên → thiếu tên như hôm nay
    assert.equal(dau(w, o2.id), 0);
    const { t1, t2 } = await haiChuyen(w, o1, o2);
    // Quét cả hai trạng thái công tắc, hai lần: dấu đã chụp quyết định, không phải công tắc hiện hành.
    for (const bat of [false, true, false, true, false]) {
      await datCongTacAnKhach(w, bat);
      assert.equal(dau(w, o1.id), 1, `công tắc ${bat ? "BẬT" : "TẮT"}: dấu O1 giữ nguyên`);
      assert.equal(dau(w, o2.id), 0, `công tắc ${bat ? "BẬT" : "TẮT"}: dấu O2 giữ nguyên`);
      assert.ok(!(await lyDoMa(w, t1.id)).includes("THIEU_TEN"), `công tắc ${bat ? "BẬT" : "TẮT"}: chuyến O1 không giữ vì tên`);
      assert.deepEqual(await nhacMa(w, t1.id), [{ ma: "KHONG_CAN_DANH_SACH", maDon: o1.code }], `công tắc ${bat ? "BẬT" : "TẮT"}: chuyến O1 nhắc`);
      assert.ok((await lyDoMa(w, t2.id)).includes("THIEU_TEN"), `công tắc ${bat ? "BẬT" : "TẮT"}: chuyến O2 vẫn giữ THIEU_TEN`);
      assert.deepEqual(await nhacMa(w, t2.id), [], `công tắc ${bat ? "BẬT" : "TẮT"}: chuyến O2 không nhắc`);
    }
    assert.equal(w.q("SELECT count(*) n FROM ord_partner_customer_policy")[0].n, 7, "chống bài rỗng: dòng gốc + BẬT + TẮT + 4 lần đổi trong vòng quét (chỉ-thêm; gửi đúng trạng thái đang có không ghi dòng)");
    denGio("12:40");
    const x1 = await tienDo(w, "tai-xe", t1.id, "xuat-ben");
    assert.equal(x1.status, 200, x1.text);
    const x2 = await tienDo(w, "tai-xe", t2.id, "xuat-ben", {}, DRIVER2);
    assert.equal(x2.status, 409, x2.text);
    assert.equal(x2.json.error.code, "chua_du_dieu_kien_xuat_ben");
    assert.deepEqual(x2.json.error.lyDo.map((l: any) => l.ma), ["THIEU_TEN"]);
    // Văn phòng bấm thay: cùng kết luận (MỘT luật).
    assert.equal((await tienDo(w, "van-phong", t2.id, "xuat-ben")).status, 409);
  } finally {
    tat();
  }
});

test("(h7) O1 xếp xe được khi trống tên (không chặn, không cảnh báo giữ); cho xe chạy: bản chốt không có dòng cho suất chưa tên, R-VC-4 và R-VC-10 đếm 0; chuyến đang chạy", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const o1 = await donDoiTacCoDau(w, { soNguoi: 3 });
    assert.equal(w.q("SELECT count(*) n FROM ord_passenger WHERE order_id = ?", o1.id)[0].n, 0, "chống bài rỗng: đơn mang dấu không có hành khách nào");
    const t = await chuyenSan(w, { don: o1, soNguoi: 3 }); // xếp xe qua route thật: xepHet khẳng định 200
    const suat = w.q("SELECT id, passenger_key k FROM vc_trip_allocation WHERE trip_id = ? AND kind = 'PASSENGER' AND valid_to_at IS NULL", t.id);
    assert.equal(suat.length, 3);
    assert.ok(suat.every((s: any) => s.k === null), "ba suất chưa tên");
    denGio("12:40");
    const x = await tienDo(w, "tai-xe", t.id, "xuat-ben");
    assert.equal(x.status, 200, x.text);
    assert.equal(w.q("SELECT status s FROM vc_trip WHERE id = ?", t.id)[0].s, "RUNNING");
    // Bản chốt: không dòng nào cho suất chưa tên (không bịa người) — chính sách bắt danh sách nhưng đơn được miễn.
    assert.equal(w.q("SELECT count(*) n FROM vc_trip_manifest WHERE allocation_id IN (SELECT id FROM vc_trip_allocation WHERE trip_id = ?)", t.id)[0].n, 0);
    assert.equal(w.q("SELECT count(*) n FROM vc_trip_departure_check WHERE trip_id = ?", t.id)[0].n, 1, "bản chụp điều kiện vẫn ghi đúng một dòng");
    kiemDinhKySach(w);
    // Suất chưa tên vẫn đi tiếp được vòng đời: tài xế bấm đã đón / vắng… không bị cổng nào chặn vì thiếu tên (chỉ cần chạy được lệnh đầu).
    const ct = await chiTiet(w, t.id, ADM);
    assert.equal(ct.chuyen.trangThai, "RUNNING");
  } finally {
    tat();
  }
});

test("(h8) màn tài xế (GET cuoc-cua-toi/:id) và biên nhận (GET orders/:id/receipt) của O1 không lỗi khi thiếu hành khách; số liên hệ là của đối tác; DTO tài xế không có nhắc, không tên giả", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const o1 = await donDoiTacCoDau(w, { soNguoi: 2 });
    const t = await chuyenSan(w, { don: o1, soNguoi: 2 });
    const sdtDoiTac = w.q("SELECT phone p FROM staff WHERE id = ?", "88888888-8888-4888-8888-888888888888")[0].p as string;
    // Màn tài xế: trước khi xuất bến (trong ngày chạy → thấy liên hệ).
    const cx = await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${t.id}`, { as: DRIVER });
    assert.equal(cx.status, 200, cx.text);
    assert.ok(!cx.json.dieuKienConThieu.some((d: any) => d.ma === "THIEU_TEN"), "tài xế không bị báo thiếu tên của đơn được miễn");
    assert.equal(cx.json.lienHe.length, 1);
    assert.deepEqual([cx.json.lienHe[0].maDon, cx.json.lienHe[0].sdtLienHe], [o1.code, sdtDoiTac], "liên hệ là của đối tác (không phải SĐT giả của trình duyệt)");
    assert.doesNotMatch(cx.text, /Tên Giả Của Trình Duyệt|0966666666|Khách Giả/);
    assert.ok(!("nhacDieuKien" in cx.json), "nhắc chỉ ở chi tiết chuyến của văn phòng");
    assert.ok(cx.json.suat.every((s: any) => s.hoTen === undefined), "suất chưa tên: không có họ tên");
    // Sau khi xuất bến vẫn đọc được.
    denGio("12:40");
    assert.equal((await tienDo(w, "tai-xe", t.id, "xuat-ben")).status, 200);
    const sau = await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${t.id}`, { as: DRIVER });
    assert.equal(sau.status, 200, sau.text);
    // Biên nhận: người có quyền xem (Kế toán, Toàn quyền) đọc được, không lỗi khi đơn không có hành khách.
    for (const ai of [ACC, SUP]) {
      const bn = await w.call("GET", `/api/orders/${o1.id}/receipt`, { as: ai });
      assert.equal(bn.status, 200, `${ai}: ${bn.text}`);
      assert.doesNotMatch(bn.text, /Tên Giả Của Trình Duyệt|0966666666|Khách Giả/);
    }
    // Chi tiết đơn của người xem được: tên liên hệ là của tài khoản đối tác.
    const dt = await w.call("GET", `/api/orders/${o1.id}`, { as: SUP });
    assert.equal(dt.status, 200, dt.text);
    assert.equal(dt.json.order.manifestExempt, true);
    assert.equal(dt.json.order.customerPhone, sdtDoiTac);
  } finally {
    tat();
  }
});

test("(h9) đơn Bán hàng thiếu tên vẫn giữ THIEU_TEN khi công tắc BẬT; chuyến chỉ có đơn đó: không nhắc, cho xe chạy 409", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    await datCongTacAnKhach(w, true);
    const b = await don(w, { soNguoi: 3, ten: 1 }); // Bán hàng lập: công tắc không áp cho nhân viên → không dấu
    assert.equal(dau(w, b.id), 0);
    const t = await chuyenSan(w, { don: b, soNguoi: 3 });
    assert.ok((await lyDoMa(w, t.id)).includes("THIEU_TEN"));
    assert.deepEqual(await nhacMa(w, t.id), []);
    denGio("12:40");
    const x = await tienDo(w, "tai-xe", t.id, "xuat-ben");
    assert.equal(x.status, 409, x.text);
    assert.deepEqual(x.json.error.lyDo.map((l: any) => l.ma), ["THIEU_TEN"]);
  } finally {
    tat();
  }
});

test("(o5) GET chi tiết chuyến của O1: nhacDieuKien có mã đơn (một dòng), lyDoGiu không có THIEU_TEN; không tên, không SĐT; mọi vai văn phòng đọc như nhau", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const o1 = await donDoiTacCoDau(w, { soNguoi: 2 });
    const t = await chuyenSan(w, { don: o1, soNguoi: 2 });
    for (const ai of [SALES, ADM, ACC, SUP]) {
      const r = await w.call("GET", `/api/van-chuyen/chuyen/${t.id}`, { as: ai });
      assert.equal(r.status, 200, `${ai}: ${r.text}`);
      assert.deepEqual(r.json.nhacDieuKien, [{ ma: "KHONG_CAN_DANH_SACH", maDon: o1.code }]);
      assert.ok(!r.json.chuyen.lyDoGiu.some((l: any) => l.ma === "THIEU_TEN"));
      assert.doesNotMatch(JSON.stringify(r.json.nhacDieuKien), /Tên Giả|0966666666|Khách Giả/);
    }
  } finally {
    tat();
  }
});

test("chuyến trộn: O1 (mang dấu) và O2 (không dấu, thiếu tên) cùng chuyến → lý do giữ chỉ nói về O2, nhắc chỉ có O1; cho xe chạy 409 chỉ vì O2", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const o1 = await donDoiTacCoDau(w, { soNguoi: 2, noiDon: "Khách sạn Một Dò Tìm" });
    await datCongTacAnKhach(w, false);
    const o2 = await donDoiTac(w, { soNguoi: 2, noiDon: "Khách sạn Hai Dò Tìm" });
    const t = await chuyenSan(w, { don: o1, soNguoi: 2 });
    await xepHet(w, { chuyen: { id: t.id } }, o2, 2);
    const ct = await chiTiet(w, t.id);
    const thieu = ct.chuyen.lyDoGiu.filter((l: any) => l.ma === "THIEU_TEN");
    assert.equal(thieu.length, 1, JSON.stringify(ct.chuyen.lyDoGiu));
    assert.ok(thieu[0].loiNhan.includes(o2.code) && !thieu[0].loiNhan.includes(o1.code), thieu[0].loiNhan);
    assert.deepEqual(ct.nhacDieuKien, [{ ma: "KHONG_CAN_DANH_SACH", maDon: o1.code }]);
    denGio("12:40");
    const x = await tienDo(w, "van-phong", t.id, "xuat-ben");
    assert.equal(x.status, 409, x.text);
    const ma = x.json.error.lyDo.filter((l: any) => l.ma === "THIEU_TEN");
    assert.equal(ma.length, 1);
    assert.ok(ma[0].loiNhan.includes(o2.code) && !ma[0].loiNhan.includes(o1.code), ma[0].loiNhan);
  } finally {
    tat();
  }
});

test("lịch chung (GET /api/van-chuyen/lich): chuyến của O1 không hiện «giữ» vì tên (MỘT luật với cổng); chuyến của O2 hiện THIEU_TEN", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const o1 = await donDoiTacCoDau(w, { soNguoi: 2, noiDon: "Khách sạn Một Dò Tìm" });
    await datCongTacAnKhach(w, false);
    const o2 = await donDoiTac(w, { soNguoi: 2, noiDon: "Khách sạn Hai Dò Tìm" });
    const { t1, t2 } = await haiChuyen(w, o1, o2);
    const lich = await w.call("GET", `/api/van-chuyen/lich?ngay=${NGAY}`, { as: SALES });
    assert.equal(lich.status, 200, lich.text);
    const ds = (id: string) => (lich.json.chuyen.find((c: any) => c.id === id)?.lyDoGiu ?? []).map((l: any) => l.ma);
    assert.ok(lich.json.chuyen.some((c: any) => c.id === t1.id) && lich.json.chuyen.some((c: any) => c.id === t2.id), "chống bài rỗng: cả hai chuyến có trong lịch");
    assert.ok(!ds(t1.id).includes("THIEU_TEN"));
    assert.ok(ds(t2.id).includes("THIEU_TEN"));
  } finally {
    tat();
  }
});

test("dấu miễn không che THIEU_SUAT: O1 xếp thiếu một suất → vẫn giữ THIEU_SUAT (không THIEU_TEN), cho xe chạy 409", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const o1 = await donDoiTacCoDau(w, { soNguoi: 3 });
    const t = await chuyenSan(w, { don: o1, soNguoi: 2 }); // đơn 3 người, chỉ xếp 2 suất
    const ma = await lyDoMa(w, t.id);
    assert.ok(ma.includes("THIEU_SUAT"), JSON.stringify(ma));
    assert.ok(!ma.includes("THIEU_TEN"));
    denGio("12:40");
    const x = await tienDo(w, "tai-xe", t.id, "xuat-ben");
    assert.equal(x.status, 409, x.text);
    assert.ok(x.json.error.lyDo.some((l: any) => l.ma === "THIEU_SUAT"));
  } finally {
    tat();
  }
});
