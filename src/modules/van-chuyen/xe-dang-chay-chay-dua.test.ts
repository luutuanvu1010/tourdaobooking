// CHẠY ĐUA trên xe đang chạy (ADR-0052 D5 — kế hoạch Đợt 5 Task 5, Review Focus 1, 3). Hai lệnh đọc CÙNG phiên bản chuyến rồi chạy theo ba thứ tự: văn phòng
// trước, tài xế trước, song song (Promise.all — xen nhau ở các điểm chờ của trình xử lý). Lô là MỘT `db.batch` nguyên tử; cổng phiên bản / trạng thái quyết
// định bên thua. Sau mỗi ca: mọi kiểm định kỳ vận chuyển mức fail = 0 trên dữ liệu thật của lô. Đồng hồ giả (ngày chạy 2027-03-11). Tên, SĐT GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { ADM, LOC, batDongHo, chiTiet, chuyenSan, denGio, don, setup, tienDo, uuid } from "../../../tests/audit/dieu-phoi-khung.mjs";

const { CHECKS } = (await import(new URL("../../../scripts/audit-checks.mjs", import.meta.url).href)) as { CHECKS: { code: string; sql: string; level: string; mode?: string }[] };
function kiemDinhKySach(w: any, ca: string) {
  for (const c of CHECKS.filter((x) => x.code.startsWith("R-VC-") && x.level === "fail")) {
    const rows = w.q(c.sql.replace(/\s+/g, " ").trim());
    const n = c.mode === "rows" ? rows.length : Number(Object.values(rows[0] ?? { n: 0 })[0]);
    assert.equal(n, 0, `${ca}: ${c.code} có vi phạm`);
  }
}
type ThuTu = "van-phong-truoc" | "tai-xe-truoc" | "song-song";
const THU_TU: ThuTu[] = ["van-phong-truoc", "tai-xe-truoc", "song-song"];
/** Chạy hai lệnh (đã gắn sẵn phiên bản đọc trước) theo thứ tự cho trước; trả [văn phòng, tài xế]. */
async function dua(thuTu: ThuTu, vanPhong: () => Promise<any>, taiXe: () => Promise<any>): Promise<[any, any]> {
  if (thuTu === "song-song") return Promise.all([vanPhong(), taiXe()]);
  if (thuTu === "van-phong-truoc") {
    const v = await vanPhong();
    return [v, await taiXe()];
  }
  const t = await taiXe();
  return [await vanPhong(), t];
}
/** Chuyến A (2 khách, đón 13:00) đã xuất bến 12:40; đơn B (2 khách, đón 13:30, nơi khác) đã xác nhận, chưa xếp. */
async function xeDangChay(w: any) {
  const a = await chuyenSan(w);
  const b = await don(w, { gio: "13:30", soNguoi: 2, ten: 1, noiDon: "Khách sạn Hai Dò Tìm" });
  denGio("12:40");
  assert.equal((await tienDo(w, "tai-xe", a.id, "xuat-ben")).status, 200);
  denGio("12:41");
  return { a, b };
}
const themDiemVoi = (w: any, tripId: string, version: number, legId: string) => () =>
  w.call("POST", `/api/van-chuyen/chuyen/${tripId}/them-diem`, { as: ADM, body: { version, requestId: uuid(), chang: [{ legId, soSuat: 2 }], phaLe: { lyDo: "PHA_LE_SU_CO" } } });
const ok = (r: any) => r.status === 200;

test("1. Văn phòng thêm điểm ‖ tài xế bấm Kết thúc → đúng MỘT bên thắng; thua thì 409 câu tiếng Việt; không điểm 'thêm khi chạy' trên chuyến đã kết thúc", async () => {
  for (const thuTu of THU_TU) {
    const tat = batDongHo();
    try {
      const w = setup();
      const { a, b } = await xeDangChay(w);
      // Trả xong mọi khách của A để "Kết thúc" thường hợp lệ.
      for (const d of [`diem/${a.diemDon}/da-toi`, `phan-bo/${a.suat[0]}/don`, `phan-bo/${a.suat[1]}/don`, `diem/${a.diemTra}/da-toi`, `phan-bo/${a.suat[0]}/tra`, `phan-bo/${a.suat[1]}/tra`]) {
        assert.equal((await tienDo(w, "tai-xe", a.id, d)).status, 200, d);
      }
      const v = (await chiTiet(w, a.id, ADM)).chuyen.version;
      const [vp, tx] = await dua(thuTu, themDiemVoi(w, a.id, v, b.legId), () => tienDo(w, "tai-xe", a.id, "ket-thuc"));
      assert.equal([vp, tx].filter(ok).length, 1, `${thuTu}: ${vp.text} | ${tx.text}`);
      const thua = ok(vp) ? tx : vp;
      assert.equal(thua.status, 409, `${thuTu}: ${thua.text}`);
      assert.match(thua.json.error.message, /[ạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹđ]/, "câu báo tiếng Việt có dấu");
      const tt = w.q("SELECT status FROM vc_trip WHERE id = ?", a.id)[0].status;
      const them = w.q("SELECT count(*) n FROM vc_trip_stop WHERE trip_id = ? AND added_while_running = 1", a.id)[0].n;
      if (ok(tx)) assert.deepEqual([tt, them], ["ENDED", 0], `${thuTu}: kết thúc thắng — không điểm thêm`);
      // Thêm điểm thắng: điểm đón mới + điểm trả mới (điểm trả cũ đã xong — không dùng lại điểm đã tới) — kết thúc bị giữ vì khách mới.
      else assert.deepEqual([tt, them, tx.json.error.code], ["RUNNING", 2, "con_khach_chua_xong"], `${thuTu}: thêm điểm thắng — kết thúc bị giữ vì khách mới`);
      kiemDinhKySach(w, thuTu);
    } finally {
      tat();
    }
  }
});

test("2. Văn phòng báo huỷ ‖ tài xế bấm 'Đã đón' cùng suất → cờ không bao giờ được ĐẶT lên suất đã đón (đón sau báo huỷ = báo nhầm, hợp lệ)", async () => {
  for (const thuTu of THU_TU) {
    const tat = batDongHo();
    try {
      const w = setup();
      const { a, b } = await xeDangChay(w);
      const r = await themDiemVoi(w, a.id, (await chiTiet(w, a.id, ADM)).chuyen.version, b.legId)();
      assert.equal(r.status, 200, r.text);
      const diemB = r.json.diem.find((d: any) => d.themKhiChay).id;
      const suat = r.json.suat.find((s: any) => s.maDon === b.code).id;
      assert.equal((await tienDo(w, "tai-xe", a.id, `diem/${diemB}/da-toi`)).status, 200);
      const v = (await chiTiet(w, a.id, ADM)).chuyen.version;
      const [vp, tx] = await dua(
        thuTu,
        () => w.call("POST", `/api/van-chuyen/chuyen/${a.id}/phan-bo/${suat}/bao-huy`, { as: ADM, body: { version: v, requestId: uuid(), lyDo: "BAO_HUY_KHONG_DI" } }),
        () => tienDo(w, "tai-xe", a.id, `phan-bo/${suat}/don`),
      );
      assert.equal(tx.status, 200, `${thuTu}: tài xế luôn đón được (${tx.text})`);
      const s = w.q("SELECT status, office_cancel_at FROM vc_trip_allocation WHERE id = ?", suat)[0];
      assert.equal(s.status, "BOARDED");
      if (ok(vp)) assert.notEqual(s.office_cancel_at, null, `${thuTu}: báo huỷ thắng trước — cờ còn, khách vẫn lên (báo nhầm)`);
      else {
        assert.equal(vp.status, 409, `${thuTu}: ${vp.text}`);
        assert.equal(s.office_cancel_at, null, `${thuTu}: đón trước — không cờ`);
      }
      kiemDinhKySach(w, thuTu);
    } finally {
      tat();
    }
  }
});

test("3. Văn phòng cập nhật điểm ‖ tài xế bấm 'Đã tới' điểm cũ → không suất nào bị đóng mà không mở lại; suất đã ở điểm đã tới không bị dời", async () => {
  for (const thuTu of THU_TU) {
    const tat = batDongHo();
    try {
      const w = setup();
      const { a, b } = await xeDangChay(w);
      const r = await themDiemVoi(w, a.id, (await chiTiet(w, a.id, ADM)).chuyen.version, b.legId)();
      assert.equal(r.status, 200, r.text);
      const diemCu = r.json.diem.find((d: any) => d.themKhiChay).id;
      const o = (await w.call("GET", `/api/orders/${b.id}`, { as: ADM })).json.order;
      const l = o.services[0].legs[0];
      const sua = await w.call("PUT", `/api/orders/${b.id}/legs/${l.id}`, {
        as: ADM, body: { expectedUpdatedAt: l.updatedAt, leg: { pickupDate: l.pickupDate, pickupTime: l.pickupTime, pickupLocationId: null, pickupPlace: "Nơi đổi Dò Tìm", dropoffLocationId: LOC, dropoffPlace: "" }, datGap: { lyDo: "KHAC" } },
      });
      assert.equal(sua.status, 200, sua.text);
      const v = (await chiTiet(w, a.id, ADM)).chuyen.version;
      const [vp, tx] = await dua(
        thuTu,
        () => w.call("POST", `/api/van-chuyen/chuyen/${a.id}/cap-nhat-diem`, { as: ADM, body: { version: v, requestId: uuid() } }),
        () => tienDo(w, "tai-xe", a.id, `diem/${diemCu}/da-toi`),
      );
      assert.ok([vp, tx].some(ok), `${thuTu}: ít nhất một bên chạy (${vp.text} | ${tx.text})`);
      const tren = w.q("SELECT a.status, s.status diem FROM vc_trip_allocation a JOIN vc_trip_stop s ON s.id = a.board_stop_id WHERE a.trip_id = ? AND a.leg_id = ? AND a.valid_to_at IS NULL", a.id, b.legId);
      assert.equal(tren.length, 2, `${thuTu}: hai khách B vẫn trên xe`);
      if (ok(vp) && vp.json.daCapNhat > 0) assert.ok(tren.every((x: any) => x.diem === "PENDING"), `${thuTu}: đã dời sang điểm mới chưa tới`);
      else assert.ok(tren.every((x: any) => x.diem === "ARRIVED"), `${thuTu}: tài xế tới trước — khách ở lại điểm đã tới`);
      kiemDinhKySach(w, thuTu);
    } finally {
      tat();
    }
  }
});

test("4. Văn phòng thêm điểm ‖ tài xế Kết thúc gián đoạn → kết thúc gián đoạn luôn chạy; chặng thêm cuối cùng KHÔNG còn suất mở (về 'chưa xếp')", async () => {
  for (const thuTu of THU_TU) {
    const tat = batDongHo();
    try {
      const w = setup();
      const { a, b } = await xeDangChay(w);
      const v = (await chiTiet(w, a.id, ADM)).chuyen.version;
      const [vp, tx] = await dua(thuTu, themDiemVoi(w, a.id, v, b.legId), () => tienDo(w, "tai-xe", a.id, "ket-thuc-gian-doan", { lyDo: "GIAN_DOAN_XE_HONG" }));
      assert.equal(tx.status, 200, `${thuTu}: ${tx.text}`);
      if (!ok(vp)) assert.equal(vp.status, 409, `${thuTu}: ${vp.text}`);
      assert.equal(w.q("SELECT status FROM vc_trip WHERE id = ?", a.id)[0].status, "ENDED_INTERRUPTED");
      assert.equal(w.q("SELECT count(*) n FROM vc_trip_allocation WHERE leg_id = ? AND valid_to_at IS NULL", b.legId)[0].n, 0, `${thuTu}: chặng B không còn suất mở`);
      kiemDinhKySach(w, thuTu);
    } finally {
      tat();
    }
  }
});
