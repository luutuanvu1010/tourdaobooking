// C3 (gói A+C Vận chuyển; đánh giá ERP 7/10 C32, C33, C34) qua ROUTE THẬT — những gì giao diện bảng điều phối dựa vào, KHÔNG đổi hợp đồng API:
//   - C34: MỘT `POST …/phan-bo` nhận nhiều chặng, trọn hoặc không (một chặng sai → 409, không chặng nào được mở); giới hạn 50 chặng là con số CHUNG với màn.
//   - C32: phản hồi lệnh xếp mang cảnh báo "giờ hẹn nằm ngoài khung giờ chuyến" của đúng các chặng vừa xếp (chỉ cảnh báo — lệnh vẫn chạy, ADR-0096 Đ3.5).
//   - C33: suất của chi tiết chuyến (văn phòng) mang giờ hẹn của chặng — nhiều đoàn cùng nơi khác giờ vẫn là MỘT điểm, điểm giữ giờ sớm nhất.
// Chạy CẢ ứng dụng trên SQLite thật, đồng hồ giả (tests/audit/dieu-phoi-khung.mjs). Tên khách GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { ACC, DRIVER, NGAY_SAU, SALES, batDongHo, chiTiet, don, setup, taoChuyen, uuid, xe } from "../../../tests/audit/dieu-phoi-khung.mjs";
import { canhBaoGioHenSauXep, doanTaiDiem, TOI_DA_CHANG_MOT_LAN } from "../../shared/dieu-phoi-loc.ts";

type W = any;
const xepNhieu = async (w: W, tripId: string, chang: { legId: string; soSuat: number }[], as = SALES) =>
  w.call("POST", `/api/van-chuyen/chuyen/${tripId}/phan-bo`, { as, body: { version: (await chiTiet(w, tripId)).chuyen.version, requestId: uuid(), chang } });
const moCua = (w: W, tripId: string): number => w.q("SELECT count(*) c FROM vc_trip_allocation WHERE trip_id = ? AND valid_to_at IS NULL", tripId)[0].c;

test("C34 + C32 + C33: một lệnh xếp BA chặng (hợp giờ, sớm hơn khung, muộn hơn khung) → 200; cảnh báo ngoài khung đúng hai chặng lệch; suất mang giờ hẹn từng đoàn; hai đoàn cùng nơi khác giờ là MỘT điểm giữ giờ sớm nhất", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const t = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}`, ngay: NGAY_SAU, bd: "12:30", kt: "15:00" });
    const hop = await don(w, { soNguoi: 2, ngay: NGAY_SAU, gio: "13:00", noiDon: "Khách sạn Chung" });
    const som = await don(w, { soNguoi: 3, ngay: NGAY_SAU, gio: "08:00", noiDon: "Khách sạn Chung" });
    const muon = await don(w, { soNguoi: 1, ngay: NGAY_SAU, gio: "16:30", noiDon: "Khách sạn Riêng" });
    const r = await xepNhieu(w, t.chuyen.id, [hop, som, muon].map((d, i) => ({ legId: d.legId, soSuat: [2, 3, 1][i]! })));
    assert.equal(r.status, 200, r.text);
    assert.equal(moCua(w, t.chuyen.id), 6, "cả sáu suất mở trong MỘT lệnh");
    // C32: cảnh báo đúng hai chặng ngoài khung, mỗi chặng một lần, kèm mã đơn; chặng trong khung không có.
    const nhan = r.json.canhBao.filter((x: any) => x.loai === "GIO_HEN_NGOAI_CHUYEN");
    assert.deepEqual(nhan.map((x: any) => x.legId).sort(), [som.legId, muon.legId].sort());
    assert.deepEqual(canhBaoGioHenSauXep(r.json.canhBao, [hop.legId, som.legId, muon.legId]).sort(), [`Giờ hẹn nằm ngoài khung giờ chuyến: ${muon.code}`, `Giờ hẹn nằm ngoài khung giờ chuyến: ${som.code}`].sort());
    assert.deepEqual(canhBaoGioHenSauXep(r.json.canhBao, [hop.legId]), [], "chỉ nhắc chặng vừa xếp");
    // C33: giờ hẹn từng đoàn nằm trong suất; hai đoàn "Khách sạn Chung" thành MỘT điểm đón (giờ sớm nhất 08:00), đoàn kia điểm riêng.
    const ct = await chiTiet(w, t.chuyen.id);
    const diemDon = ct.diem.filter((d: any) => d.loai === "PICKUP");
    assert.equal(diemDon.length, 2);
    const chung = diemDon.find((d: any) => d.soNguoi === 5);
    assert.ok(chung, "điểm chung có 5 khách (2 + 3)");
    assert.deepEqual(chung.gioHen, { ngay: NGAY_SAU, gio: "08:00" }, "điểm giữ giờ hẹn SỚM NHẤT");
    const doan = doanTaiDiem(chung.id, ct.suat);
    assert.deepEqual(doan.map((d) => [d.maDon, d.soNguoi, d.gioHen]), [[som.code, 3, { ngay: NGAY_SAU, gio: "08:00" }], [hop.code, 2, { ngay: NGAY_SAU, gio: "13:00" }]]);
    for (const s of ct.suat) assert.ok(s.gioHen && typeof s.gioHen.gio === "string", "mỗi suất khách có giờ hẹn của chặng");
    // Kế toán (trip.view) đọc chi tiết cũng thấy giờ hẹn — không tên, không SĐT.
    const kt = (await w.call("GET", `/api/van-chuyen/chuyen/${t.chuyen.id}`, { as: ACC })).json;
    assert.deepEqual(kt.suat.map((s: any) => s.gioHen), ct.suat.map((s: any) => s.gioHen));
  } finally {
    tat();
  }
});

test("C34: lệnh xếp nhiều chặng TRỌN HOẶC KHÔNG — một chặng vượt chỗ (hoặc không hợp lệ) → 409, KHÔNG chặng nào được mở, chuyến không đổi phiên bản", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const t = await taoChuyen(w, { xe: xe(w, 4), taiXe: `pty-${DRIVER}`, ngay: NGAY_SAU, bd: "12:30", kt: "15:00" });
    const a = await don(w, { soNguoi: 2, ngay: NGAY_SAU, gio: "13:00" });
    const b = await don(w, { soNguoi: 3, ngay: NGAY_SAU, gio: "13:10" });
    const truoc = (await chiTiet(w, t.chuyen.id)).chuyen.version;
    const r = await xepNhieu(w, t.chuyen.id, [{ legId: a.legId, soSuat: 2 }, { legId: b.legId, soSuat: 3 }]);
    assert.equal(r.status, 409, r.text);
    assert.ok(r.json.error.lyDo.some((l: any) => l.ma === "VUOT_SO_CHO"), JSON.stringify(r.json));
    assert.equal(moCua(w, t.chuyen.id), 0, "không chặng nào được mở");
    assert.equal((await chiTiet(w, t.chuyen.id)).chuyen.version, truoc, "chuyến không đổi");
    // Bỏ chặng lớn → chặng còn lại xếp được.
    const ok = await xepNhieu(w, t.chuyen.id, [{ legId: a.legId, soSuat: 2 }]);
    assert.equal(ok.status, 200, ok.text);
    // Chặng không có trong lịch cũng làm CẢ lệnh hỏng (chặng a vẫn ở lại như cũ).
    const sai = await xepNhieu(w, t.chuyen.id, [{ legId: uuid(), soSuat: 1 }, { legId: b.legId, soSuat: 1 }]);
    assert.equal(sai.status, 409, sai.text);
    assert.equal(moCua(w, t.chuyen.id), 2);
  } finally {
    tat();
  }
});

test("C34: giới hạn chặng một lệnh là TOI_DA_CHANG_MOT_LAN (50) — con số CHUNG máy chủ và màn: 51 chặng → 400 không hợp lệ; đúng 50 chặng lạ → qua kiểm thân (409 chặng không hợp lệ, không 400)", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const t = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}`, ngay: NGAY_SAU, bd: "12:30", kt: "15:00" });
    assert.equal(TOI_DA_CHANG_MOT_LAN, 50);
    const lan = (n: number) => Array.from({ length: n }, () => ({ legId: uuid(), soSuat: 1 }));
    const qua = await xepNhieu(w, t.chuyen.id, lan(TOI_DA_CHANG_MOT_LAN + 1));
    assert.equal(qua.status, 400, qua.text);
    assert.equal(qua.json.error.message, "Danh sách chặng không hợp lệ.");
    const vua = await xepNhieu(w, t.chuyen.id, lan(TOI_DA_CHANG_MOT_LAN));
    assert.notEqual(vua.status, 400, vua.text);
    assert.equal(vua.status, 409, vua.text);
  } finally {
    tat();
  }
});
