// Dải trên trang — luật thuần (đặc tả đợt 0, §5.6): thứ tự ưu tiên, chữ bảo trì, kiểu dải.
import assert from "node:assert/strict";
import test from "node:test";
import { CAU_NGOAI_MANG, KHOA_DAI_BAO_MAT_DA_DONG, TONG_DAI, UU_TIEN, cauBaoTri, chonDai } from "./dai-chu.ts";

test("chonDai: một dải một lúc, theo thứ tự bảo trì › ngoài mạng › thông báo › bảo mật", () => {
  assert.equal(chonDai([]), null);
  assert.equal(chonDai(["bao-mat", "thong-bao"]), "thong-bao");
  assert.equal(chonDai(["ngoai-mang", "bao-tri"]), "bao-tri");
  assert.equal(chonDai(["bao-mat", "ngoai-mang"]), "ngoai-mang");
  assert.equal(chonDai(new Set(["bao-mat"] as const)), "bao-mat");
});

test("UU_TIEN đúng bốn phần tử theo thứ tự", () => {
  assert.deepEqual([...UU_TIEN], ["bao-tri", "ngoai-mang", "thong-bao", "bao-mat"]);
});

test("cauBaoTri: có giờ dự kiến thì nói giờ, không thì chỉ báo đang bảo trì", () => {
  assert.equal(cauBaoTri("09:30"), "Đang bảo trì, dự kiến xong 09:30");
  assert.equal(cauBaoTri(null), "Đang bảo trì");
});

test("TONG_DAI: màu và biểu tượng từng loại; hằng chữ", () => {
  assert.deepEqual(TONG_DAI["bao-tri"], { tong: "bien", hinh: "history" });
  assert.deepEqual(TONG_DAI["ngoai-mang"], { tong: "cat", hinh: "clock" });
  assert.deepEqual(TONG_DAI["thong-bao"], { tong: "cat", hinh: "clock" });
  assert.equal(TONG_DAI["bao-mat"].hinh, "alertCircle");
  assert.equal(TONG_DAI["bao-mat"].tong, "do");
  assert.equal(CAU_NGOAI_MANG, "Đang ngoài mạng — dữ liệu lần xem gần nhất");
  assert.equal(KHOA_DAI_BAO_MAT_DA_DONG, "dai-bao-mat-da-dong");
});
