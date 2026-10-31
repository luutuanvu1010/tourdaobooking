// Phương án A (31/10): «Chờ đối chiếu» và «Thu trước đơn huỷ» thành dòng của thẻ «Đang chờ bạn», cổng GIỮ NGUYÊN theo hàm gốc của hai khối chi tiết cũ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { nguonCanTai, viecCuaBan } from "./viec-cua-ban.ts";
import { PERMISSION_CODES, type PermissionHolder } from "./permissions.ts";
import { coKhoiChoDoiChieu } from "./ben-kia-hien-thi.ts";
import { coKhoiThuTruoc } from "./thu-truoc-hien-thi.ts";

const nguoi = (...p: string[]): PermissionHolder => ({ id: `t-${p.join("-")}`, permissions: p as PermissionHolder["permissions"] });
const TAT = (w: PermissionHolder, n: Parameters<typeof viecCuaBan>[1]) => { const r = viecCuaBan(w, n); return [...r.the, ...r.conLaiThe]; };

test("dòng doiChieu / thuTruoc: có số thì hiện kèm đích cuộn tới khối chi tiết; số 0 thì ẩn; nguồn lỗi (null) hiện «—», không phải 0", () => {
  const kt = nguoi("ACCOUNTING");
  const co = TAT(kt, { doiChieu: 2, thuTruoc: 1 });
  assert.deepEqual(co.filter((t) => t.khoa === "doiChieu" || t.khoa === "thuTruoc").map((t) => [t.khoa, t.nhan, t.so, t.href]), [
    ["doiChieu", "Chờ đối chiếu", 2, "#dash-doi-chieu"], ["thuTruoc", "Thu trước đơn huỷ", 1, "#dash-thu-truoc"],
  ]);
  assert.equal(TAT(kt, { doiChieu: 0, thuTruoc: 0 }).length, 0);
  assert.equal(TAT(kt, { doiChieu: null }).find((t) => t.khoa === "doiChieu")?.so, null);
});

test("1024 tập quyền: dòng và nguồn cần tải khớp ĐÚNG hàm gốc của khối cũ (coKhoiChoDoiChieu, coKhoiThuTruoc); không ai có quyền Đối tác thấy", () => {
  for (let m = 0; m < 1 << PERMISSION_CODES.length; m++) {
    const w = nguoi(...PERMISSION_CODES.filter((_, i) => m & (1 << i)));
    const dong = TAT(w, { doiChieu: 5, thuTruoc: 5 }).map((t) => t.khoa);
    assert.equal(dong.includes("doiChieu"), coKhoiChoDoiChieu(w), `doiChieu tập ${m}`);
    assert.equal(dong.includes("thuTruoc"), coKhoiThuTruoc(w), `thuTruoc tập ${m}`);
    assert.equal(nguonCanTai(w).includes("doiChieu"), coKhoiChoDoiChieu(w));
    assert.equal(nguonCanTai(w).includes("thuTruoc"), coKhoiThuTruoc(w));
    if (w.permissions.includes("PARTNER")) assert.ok(!dong.includes("doiChieu") && !dong.includes("thuTruoc"), `Đối tác tập ${m}`);
  }
});
