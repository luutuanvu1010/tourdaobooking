// Thanh lọc dùng chung của Kho vé (web/loc-dich-vu-kho-ui.ts; kế hoạch 16 việc 21/11/2026, Việc 4) chạy trên DOM giả (src/dom-gia.ts) và đồng hồ giả của node:test.
// Canh cách thanh BÁO trang: chạm nhóm báo ngay; gõ chữ báo sau một nhịp (không gọi máy chủ ở mỗi phím); «Xoá lọc» chỉ báo khi đang lọc; dựng lại hàng nhóm không đổi thì giữ nguyên nút.
import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { dungDomGia, type NutGia } from "./dom-gia.ts";

dungDomGia();
const { taoThanhLocDv } = await import("../web/loc-dich-vu-kho-ui.ts");
type BoLocDv = import("./shared/loc-dich-vu-kho.ts").BoLocDv;

const NHOM = [{ code: "TOUR", name: "Tour" }, { code: "VUI_CHOI", name: "Vui chơi" }];
function dung() {
  const bao: BoLocDv[] = [];
  const t = taoThanhLocDv({ onDoi: (l) => bao.push(l) });
  const goc = t.root as unknown as NutGia;
  const nut = (): NutGia[] => goc.querySelectorAll(".catalog-nut-nhom");
  const chon = (): string => nut().find((b) => b.getAttribute("aria-checked") === "true")?.dataset.nhom ?? "?";
  const o = goc.querySelector("#vk-loc-tim") as NutGia & { value: string };
  o.value = ""; // trình duyệt: ô nhập mới luôn có value ""; DOM giả không tự có
  const go = (chu: string): void => { o.value = chu; o.dispatchEvent({ type: "input" }); };
  return { t, goc, bao, nut, chon, o, go };
}

describe("thanh lọc Kho vé", () => {
  beforeEach(() => mock.timers.enable({ apis: ["setTimeout"] }));
  afterEach(() => mock.timers.reset());

  it("hàng nhóm: Tất cả, nhóm theo thứ tự, «Chưa phân loại» khi cần; mặc định Tất cả, chỉ nút đang chọn nhận Tab; danh mục không nhóm thì ẩn hàng", () => {
    const { t, goc, nut, chon } = dung();
    assert.equal((goc.querySelector(".catalog-hang") as NutGia).hidden, true, "chưa có danh mục: ẩn hàng nhóm");
    t.datNhom(NHOM, true);
    assert.deepEqual(nut().map((b) => b.dataset.nhom), ["", "TOUR", "VUI_CHOI", "chua-phan-loai"]);
    assert.deepEqual(nut().map((b) => b.textContent), ["Tất cả", "Tour", "Vui chơi", "Chưa phân loại"]);
    assert.equal(chon(), "");
    assert.deepEqual(nut().map((b) => b.tabIndex), [0, -1, -1, -1]);
    assert.equal((goc.querySelector(".catalog-hang") as NutGia).hidden, false);
    t.datNhom([], false);
    assert.equal((goc.querySelector(".catalog-hang") as NutGia).hidden, true);
  });

  it("chạm nhóm: báo ngay MỘT lần; chạm lại nhóm đang chọn thì không báo", () => {
    const { t, bao, nut, chon } = dung();
    t.datNhom(NHOM, false);
    nut()[1]!.click();
    assert.deepEqual(bao, [{ nhom: "TOUR", tim: "" }]);
    assert.equal(chon(), "TOUR");
    assert.deepEqual(nut().map((b) => b.tabIndex), [-1, 0, -1]);
    nut()[1]!.click();
    assert.equal(bao.length, 1);
  });

  it("gõ chữ: chưa báo ở mỗi phím, báo sau một nhịp với chữ cuối; Enter báo ngay; giữ nhóm đang chọn", () => {
    const { t, bao, nut, go, o } = dung();
    t.datNhom(NHOM, false);
    nut()[2]!.click();
    go("v"); go("vi"); go("vịn");
    assert.equal(bao.length, 1, "chưa báo khi đang gõ");
    mock.timers.tick(299);
    assert.equal(bao.length, 1);
    mock.timers.tick(1);
    assert.deepEqual(bao.at(-1), { nhom: "VUI_CHOI", tim: "vịn" });
    o.value = "vinh";
    o.dispatchEvent({ type: "keydown", key: "Enter", preventDefault: () => undefined } as unknown as { type: string });
    assert.deepEqual(bao.at(-1), { nhom: "VUI_CHOI", tim: "vinh" });
    mock.timers.tick(1000);
    assert.equal(bao.length, 3, "Enter rồi không báo lặp");
  });

  it("«Xoá lọc»: về Tất cả + xoá chữ, báo một lần; khi không lọc gì thì không báo", () => {
    const { t, bao, nut, go, o, chon } = dung();
    t.datNhom(NHOM, false);
    const xoa = t.nutXoaLoc() as unknown as NutGia;
    assert.equal(xoa.textContent, "Xoá lọc");
    xoa.click();
    assert.equal(bao.length, 0, "không lọc gì: không báo, không tải lại");
    nut()[1]!.click();
    go("tour");
    xoa.click();
    mock.timers.tick(1000);
    assert.deepEqual(bao, [{ nhom: "TOUR", tim: "" }, { nhom: "", tim: "" }], "chữ đang gõ dở không còn báo sau khi xoá");
    assert.equal(o.value, "");
    assert.equal(chon(), "");
    assert.deepEqual(t.giaTri(), { nhom: "", tim: "" });
  });

  it("dựng lại hàng nhóm: không đổi thì giữ nguyên nút; nhóm đang chọn biến mất thì về Tất cả và báo", () => {
    const { t, bao, nut, chon } = dung();
    t.datNhom(NHOM, true);
    const cu = nut();
    t.datNhom(NHOM, true);
    assert.ok(nut().every((b, i) => b === cu[i]), "cùng danh sách: không dựng lại");
    nut()[3]!.click();
    assert.equal(chon(), "chua-phan-loai");
    t.datNhom(NHOM, false); // kho không còn mã ngoài danh mục ⇒ mất nút «Chưa phân loại»
    assert.equal(chon(), "");
    assert.deepEqual(bao.at(-1), { nhom: "", tim: "" });
  });
});
