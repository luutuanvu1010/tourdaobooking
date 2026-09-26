import { test } from "node:test";
import assert from "node:assert/strict";
import { hetHan, ketNoiQuaHan, docHanGiay, kiemOrigin, keHoachTram } from "./rules.ts";

test("hetHan: mốc hết hạn = bây giờ + hạn giây (đổi ra mili-giây)", () => {
  assert.equal(hetHan(1_000_000, 900), 1_000_000 + 900_000);
  assert.equal(hetHan(0, 5), 5000);
});

test("ketNoiQuaHan: lọc đúng phần tử đã tới hoặc quá mốc hết hạn (nửa mở, đúng mốc = quá hạn)", () => {
  const danhSach = [
    { id: "a", hetHan: 1000 },
    { id: "b", hetHan: 2000 },
    { id: "c", hetHan: 3000 },
  ];
  assert.deepEqual(ketNoiQuaHan(danhSach, 2000).map((x) => x.id), ["a", "b"]);
  assert.deepEqual(ketNoiQuaHan(danhSach, 999).map((x) => x.id), []);
  assert.deepEqual(ketNoiQuaHan(danhSach, 3000).map((x) => x.id), ["a", "b", "c"]);
  assert.deepEqual(ketNoiQuaHan([], 999999), []);
});

test("docHanGiay: mặc định 900 khi vắng hoặc không phải số nguyên dương", () => {
  assert.equal(docHanGiay({}), 900);
  assert.equal(docHanGiay({ BANG_TIN_HAN_GIAY: undefined }), 900);
  for (const raw of ["", "abc", "0", "-5", "10.5", "NaN", " ", "Infinity"]) {
    assert.equal(docHanGiay({ BANG_TIN_HAN_GIAY: raw }), 900, raw);
  }
});

test("docHanGiay: giới hạn [5, 3600] khi số nguyên dương hợp lệ nằm ngoài khoảng", () => {
  assert.equal(docHanGiay({ BANG_TIN_HAN_GIAY: "1" }), 5);
  assert.equal(docHanGiay({ BANG_TIN_HAN_GIAY: "4" }), 5);
  assert.equal(docHanGiay({ BANG_TIN_HAN_GIAY: "5" }), 5);
  assert.equal(docHanGiay({ BANG_TIN_HAN_GIAY: "20" }), 20);
  assert.equal(docHanGiay({ BANG_TIN_HAN_GIAY: "3600" }), 3600);
  assert.equal(docHanGiay({ BANG_TIN_HAN_GIAY: "3601" }), 3600);
  assert.equal(docHanGiay({ BANG_TIN_HAN_GIAY: "999999" }), 3600);
});

test("kiemOrigin: true chỉ khi có header Origin và khớp đúng origin của url", () => {
  const url = new URL("https://booking.tourdao.vn/api/bang-tin");
  const cungOrigin = new Request(url, { headers: { Origin: "https://booking.tourdao.vn" } });
  assert.equal(kiemOrigin(cungOrigin, url), true);

  const khac = new Request(url, { headers: { Origin: "https://khac.tourdao.vn" } });
  assert.equal(kiemOrigin(khac, url), false);

  const vang = new Request(url);
  assert.equal(kiemOrigin(vang, url), false);
});

test("kiemOrigin: không dựa vào sec-fetch-site — Origin vắng vẫn từ chối dù sec-fetch-site same-origin", () => {
  const url = new URL("https://booking.tourdao.vn/api/bang-tin");
  const req = new Request(url, { headers: { "sec-fetch-site": "same-origin" } });
  assert.equal(kiemOrigin(req, url), false);
});

// keHoachTram — phần QUYẾT ĐỊNH của trạm (tram.ts) tách thành hàm thuần: tram.ts không nạp được dưới node --test (chỉ src/index.ts được nạp nó),
// nên mọi lựa chọn đóng/gửi/bỏ qua/đặt báo thức được kiểm ở đây; tram.ts chỉ còn vỏ gọi API Durable Object.
test("keHoachTram: quá hạn → đóng (không gửi); còn hạn + có nhãn chung → gửi; không nhãn chung → bỏ qua; báo thức = hạn sớm nhất còn lại", () => {
  const ketNoi = [
    { nhan: ["nguoi:a", "tat-ca"], hetHan: 5000, mo: true }, // 0: còn hạn, khớp tat-ca → gửi
    { nhan: ["nguoi:b"], hetHan: 1000, mo: true }, // 1: quá hạn → đóng, dù khớp nguoi:b
    { nhan: ["nguoi:c"], hetHan: 3000, mo: true }, // 2: còn hạn, không nhãn chung → bỏ qua (vẫn tính cho báo thức)
    { nhan: ["nguoi:b", "cho-nhan"], hetHan: 4000, mo: true }, // 3: còn hạn, khớp nguoi:b → gửi
  ];
  assert.deepEqual(keHoachTram(ketNoi, ["tat-ca", "nguoi:b"], 2000), { dong: [1], gui: [0, 3], baoThucKe: 3000 });
});

test("keHoachTram: mỗi kết nối nhiều nhất MỘT lần dù có nhiều nhãn trùng với sự kiện (theo chỉ số, không theo danh tính đối tượng)", () => {
  const ketNoi = [{ nhan: ["cho-nhan", "nguoi:a", "tat-ca"], hetHan: 9000, mo: true }];
  assert.deepEqual(keHoachTram(ketNoi, ["tat-ca", "nguoi:a", "cho-nhan"], 0), { dong: [], gui: [0], baoThucKe: 9000 });
});

test("keHoachTram: kết nối KHÔNG mở (đang đóng/đã đóng — getWebSockets có thể trả) → không đóng lại, không gửi, không tính báo thức", () => {
  const ketNoi = [
    { nhan: ["tat-ca"], hetHan: 100, mo: false }, // quá hạn nhưng đang đóng → bỏ qua
    { nhan: ["tat-ca"], hetHan: 9000, mo: false }, // còn hạn nhưng đang đóng → bỏ qua, không làm mốc báo thức
  ];
  assert.deepEqual(keHoachTram(ketNoi, ["tat-ca"], 500), { dong: [], gui: [], baoThucKe: null });
});

test("keHoachTram: lượt báo thức (nhãn sự kiện null) chỉ đóng quá hạn — đúng mốc = quá hạn; không còn ai → báo thức null", () => {
  const ketNoi = [
    { nhan: ["tat-ca"], hetHan: 2000, mo: true }, // đúng mốc → đóng
    { nhan: ["tat-ca"], hetHan: 0, mo: true }, // mất gắn kèm (tram.ts đặt 0) → đóng
  ];
  assert.deepEqual(keHoachTram(ketNoi, null, 2000), { dong: [0, 1], gui: [], baoThucKe: null });
  assert.deepEqual(keHoachTram([{ nhan: ["tat-ca"], hetHan: 7000, mo: true }], null, 2000), { dong: [], gui: [], baoThucKe: 7000 });
  assert.deepEqual(keHoachTram([], ["tat-ca"], 2000), { dong: [], gui: [], baoThucKe: null });
});
