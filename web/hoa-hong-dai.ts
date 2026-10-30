// Dải cảnh báo phủ mức ở đầu trang Hoa hồng (đặc tả hoa-hong-cap-dai-ly §5.1): loại đối tác nào còn thiếu mức hôm nay.
// Luật phủ ở src/shared/hoa-hong-phu-muc.ts, câu chữ và việc chọn câu ở src/shared/hoa-hong-hien-thi.ts (`cauDai`); tệp này chỉ vẽ. Không có gì để báo thì ẩn hẳn.
import { cauDai } from "../src/shared/hoa-hong-hien-thi";
import { phuMucLoai } from "../src/shared/hoa-hong-phu-muc";
import { h, replaceChildren } from "./dom";
import type { DuLieuHoaHong } from "./hoa-hong";
import { icon } from "./icons";

export function veDai(goc: HTMLElement, d: DuLieuHoaHong): void {
  const ds = d.loai.map((l) => ({
    ten: l.ten,
    ...phuMucLoai({ loai: l, dong: d.dong, muc: d.mucTa.muc, dichVu: d.dichVuPhu, homNay: d.homNay }),
  }));
  const nd = cauDai(ds.map((x) => ({ ten: x.ten, ketQua: x.ketQua, sapApTu: x.sapApTu })));
  if (nd === null) {
    replaceChildren(goc);
    goc.hidden = true;
    return;
  }
  const cau = h(
    "div",
    { class: "dai-cau" },
    nd.tieuDe !== null && h("strong", null, nd.tieuDe),
    nd.than !== null && h("p", null, nd.than),
    nd.dong.length > 0 && h("ul", null, ...nd.dong.map((c) => h("li", null, c))),
    nd.tat !== null && h("p", null, nd.tat),
    nd.chuaKiem !== null && h("p", null, nd.chuaKiem),
  );
  replaceChildren(goc, h("div", { class: "dai", "data-tong": "cat", role: "status" }, icon("alertCircle", 18), cau));
  goc.hidden = false;
}
