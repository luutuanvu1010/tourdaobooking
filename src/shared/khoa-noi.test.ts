// KHOÁ SO SÁNH NƠI — một nguồn (ADR-0050 VK1-B; kế hoạch I39, TC-49). Khuôn đã thử THẬT ở A0 bước 15–16 (nhật ký ADR-0049 mục 10.2): NFC → cắt hai đầu → gộp
// khoảng trắng → chữ thường; SHA-256 hex thường qua Web Crypto — cùng kết quả trên Node 22 và Worker. Đổi khuôn sau khi có dữ liệu = mọi place_key cũ lệch.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import type { ChangVao, DiemVao, SuatVao } from "./dieu-phoi-kieu.ts";
import { noiLechCuaSuat } from "./dieu-phoi-kiem.ts";
import { chuanHoaNoi, khoaNoi } from "./khoa-noi.ts";

const DUNG_SAN = "Khách sạn Sheraton Nha Trang";

test("chuanHoaNoi: dạng dựng sẵn = dạng tổ hợp dấu (NFD); hoa = thường (kể cả Đ Ư Ơ); khoảng trắng thừa, tab, NBSP gộp; đầu / cuối cắt", () => {
  assert.notEqual(DUNG_SAN, DUNG_SAN.normalize("NFD"), "hai dạng Unicode khác nhau thật");
  assert.equal(chuanHoaNoi(DUNG_SAN.normalize("NFD")), chuanHoaNoi(DUNG_SAN));
  assert.equal(chuanHoaNoi(DUNG_SAN), "khách sạn sheraton nha trang");
  assert.equal(chuanHoaNoi("  ĐƯỜNG  Ơ\tTRẦN PHÚ Ư \t"), "đường ơ trần phú ư");
  assert.equal(chuanHoaNoi("   "), "");
});

test("khoaNoi: điểm danh mục → 'L:<id>'; chữ tự do → 'T:' + 64 hex thường (SHA-256 UTF-8 của chữ đã chuẩn hoá); không nơi → null", async () => {
  assert.equal(await khoaNoi({ locationId: "a941dd7d-faab-4098-9ab9-1df7fa6dd551", placeText: null }), "L:a941dd7d-faab-4098-9ab9-1df7fa6dd551");
  assert.equal(await khoaNoi({ locationId: "loc-1", placeText: "chữ bị bỏ qua khi có điểm" }), "L:loc-1");
  const k = await khoaNoi({ locationId: null, placeText: DUNG_SAN });
  assert.match(k ?? "", /^T:[0-9a-f]{64}$/);
  assert.equal(k, `T:${createHash("sha256").update("khách sạn sheraton nha trang", "utf8").digest("hex")}`, "khớp một cài đặt SHA-256 khác (node:crypto)");
  // Giá trị đã thấy ở A0 bước 15 (Node 22 = Worker): một chiều, khoá cố định.
  assert.equal(k, "T:eabf50a8821c80a64c8e59b894ca8afdea9982e316c0b13073a2d60641d70ca5");
  assert.equal(await khoaNoi({ locationId: null, placeText: DUNG_SAN.normalize("NFD") }), k, "dạng tổ hợp dấu cùng khoá");
  assert.equal(await khoaNoi({ locationId: null, placeText: `  ${DUNG_SAN.toUpperCase()} ` }), k, "hoa / thừa khoảng trắng cùng khoá");
  assert.equal(await khoaNoi({ locationId: null, placeText: null }), null);
  assert.equal(await khoaNoi({ locationId: null, placeText: " \t " }), null);
});

test("khoaNoi tính trên chữ CHƯA che: hai nơi chỉ khác ở một dãy từ 8 chữ số → hai khoá KHÁC nhau", async () => {
  const a = await khoaNoi({ locationId: null, placeText: "Căn hộ 0905123456 Mường Thanh" });
  const b = await khoaNoi({ locationId: null, placeText: "Căn hộ 0905999999 Mường Thanh" });
  assert.notEqual(a, b);
  assert.equal(a, "T:8601fb9b301d5ae10e3826e7a872e36e7fb1efb33de128a450551ef60c5f8b5d", "giá trị A0 bước 15");
});

test("dựng điểm từ chặng rồi so NGAY → khớp (không giữ nhầm); đổi nơi → lệch", async () => {
  const khoaDon = (await khoaNoi({ locationId: null, placeText: "  Khách sạn Amiana  " }))!;
  const khoaTra = (await khoaNoi({ locationId: "loc-cang", placeText: null }))!;
  const chang = { legId: "leg-1", khoaNoiDon: khoaDon, khoaNoiTra: khoaTra } as ChangVao;
  const diemLen = { id: "d-1", placeKey: chang.khoaNoiDon } as DiemVao;
  const diemXuong = { id: "d-9", placeKey: chang.khoaNoiTra! } as DiemVao;
  const suat = { id: "s-1", boardStopId: "d-1", alightStopId: "d-9" } as SuatVao;
  assert.deepEqual(noiLechCuaSuat(suat, diemLen, diemXuong, chang), { don: false, tra: false });
  const doi = { ...chang, khoaNoiDon: (await khoaNoi({ locationId: null, placeText: "Khách sạn Sheraton" }))! };
  assert.deepEqual(noiLechCuaSuat(suat, diemLen, diemXuong, doi), { don: true, tra: false });
});

test("một nguồn: chỉ src/shared/khoa-noi.ts băm nơi (Web Crypto, không thư viện); luật thuần, không import module", () => {
  const src = readFileSync(new URL("./khoa-noi.ts", import.meta.url), "utf8");
  assert.match(src, /\bcrypto\.subtle\.digest\("SHA-256"/);
  assert.match(src, /normalize\("NFC"\)/);
  assert.doesNotMatch(src, /toLocaleLowerCase/);
  assert.doesNotMatch(src, /from\s+["'][^"']*modules\//);
  assert.doesNotMatch(src, /from\s+["']node:/);
});
