// Luật thuần quanh chữ tạm ở nơi đón (ADR-0221). Chạy trực tiếp bằng `node --test` (import đuôi .ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { NOI_DON_CHUA_GHI } from "./chang-dua-don.ts";
import { CHUA_CO_NOI_DON, dienNoiDonTam, kiemNoiDonGhi, laNoiDonTam, luotThieuNoiDon, nhanNoiDon } from "./noi-don-tam.ts";

// ---- ADR-0221: lượt thiếu nơi đón của tài khoản giữ quyền Đối tác (chữ tạm sinh từ một đường sống) ----
test("dienNoiDonTam: lượt CHIỀU ĐI không điểm danh mục, chữ nơi đón rỗng ⇒ điền chữ tạm; lượt có nơi, chiều về, thân lạ giữ nguyên; không sửa đầu vào", () => {
  const than = {
    customerName: "K",
    services: [
      { catalogCode: "A", legs: [
        { direction: "OUT", pickupLocationId: null, pickupPlace: "" },
        { direction: "OUT", pickupPlace: "   " },
        { direction: "OUT", pickupLocationId: "", pickupPlace: null },
        { direction: "OUT", pickupLocationId: null, pickupPlace: "Khách sạn A" },
        { direction: "OUT", pickupLocationId: "a941dd7d-faab-4098-9ab9-1df7fa6dd551", pickupPlace: "" },
        { direction: "RETURN", pickupLocationId: null, pickupPlace: "" },
      ] },
      { catalogCode: "B" },
      { catalogCode: "C", legs: "sai" },
    ],
  };
  const goc = JSON.stringify(than);
  const ra = dienNoiDonTam(than) as typeof than;
  assert.equal(JSON.stringify(than), goc, "không sửa đầu vào");
  const l = ra.services[0]!.legs as { pickupPlace?: unknown }[];
  assert.deepEqual(l.map((x) => x.pickupPlace), [NOI_DON_CHUA_GHI, NOI_DON_CHUA_GHI, NOI_DON_CHUA_GHI, "Khách sạn A", "", ""]);
  assert.deepEqual(ra.services[1], { catalogCode: "B" });
  assert.equal(ra.services[2]!.legs, "sai", "legs không phải mảng: để luật kiểm của máy chủ báo lỗi");
  assert.equal(ra.customerName, "K");
  for (const la of [null, undefined, 5, "x", [], { services: "x" }, {}]) assert.deepEqual(dienNoiDonTam(la), la);
  // chữ nơi đón không phải chuỗi (số, đối tượng): KHÔNG điền — để `kiemChang` báo lỗi kiểu như trước
  const sai = dienNoiDonTam({ services: [{ legs: [{ direction: "OUT", pickupPlace: 5 }] }] }) as { services: { legs: { pickupPlace: unknown }[] }[] };
  assert.equal(sai.services[0]!.legs[0]!.pickupPlace, 5);
});

test("laNoiDonTam, luotThieuNoiDon: lượt KHÔNG điểm danh mục và chữ đúng bằng chữ tạm; lượt có nơi thật không tính", () => {
  assert.equal(laNoiDonTam({ pickupLocationId: null, pickupPlace: NOI_DON_CHUA_GHI }), true);
  assert.equal(laNoiDonTam({ pickupLocationId: null, pickupPlace: "Khách sạn A" }), false);
  assert.equal(laNoiDonTam({ pickupLocationId: "x", pickupPlace: null }), false);
  assert.deepEqual(luotThieuNoiDon([{ id: "a", pickupLocationId: null, pickupPlace: NOI_DON_CHUA_GHI }, { id: "b", pickupLocationId: "x", pickupPlace: null }]).map((l) => l.id), ["a"]);
});

test("nhanNoiDon: nhãn là chữ tạm ⇒ «Chưa có nơi đón»; nhãn khác giữ nguyên", () => {
  assert.equal(CHUA_CO_NOI_DON, "Chưa có nơi đón");
  assert.equal(nhanNoiDon(NOI_DON_CHUA_GHI), "Chưa có nơi đón");
  assert.equal(nhanNoiDon("Khách sạn A"), "Khách sạn A");
  assert.equal(nhanNoiDon(""), "");
});

test("kiemNoiDonGhi: đúng MỘT trong hai (điểm danh mục hoặc chữ 1–200 ký tự); chữ tạm bị từ chối", () => {
  const LOCID = "a941dd7d-faab-4098-9ab9-1df7fa6dd551";
  assert.deepEqual(kiemNoiDonGhi({ pickupLocationId: LOCID }), { ok: true, id: LOCID, place: null });
  assert.deepEqual(kiemNoiDonGhi({ pickupPlace: "  Khách sạn A " }), { ok: true, id: null, place: "Khách sạn A" });
  for (const sai of [{}, { pickupPlace: "" }, { pickupPlace: "  " }, { pickupLocationId: LOCID, pickupPlace: "A" }, { pickupLocationId: "khong-phai-ma" }, { pickupPlace: "x".repeat(201) }, { pickupPlace: 5 }, null, "x"]) {
    assert.equal(kiemNoiDonGhi(sai).ok, false, JSON.stringify(sai));
  }
  for (const tam of [NOI_DON_CHUA_GHI, ` ${NOI_DON_CHUA_GHI} `]) assert.equal(kiemNoiDonGhi({ pickupPlace: tam }).ok, false, "chữ tạm không phải nơi đón thật");
});
