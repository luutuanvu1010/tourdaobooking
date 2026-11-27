// Trang mục lục «Thiết lập» (điện thoại, đợt 0 Task 5): mỗi dòng = một mục nhóm THIẾT LẬP mà bảng mục trả cho người này. Chỉ điều hướng, không gọi API riêng.
import { khoiThietLap, moTrang, thanhBen } from "../src/shared/muc-giao-dien";
import { homeRedirect } from "../src/shared/start-page";
import { byId, h } from "./dom";
import { icon, type IconName } from "./icons";
import { initShell, trinhBay } from "./shell";
import { trangThaiToanTrang } from "./trang-thai-he-thong";

const staff = await initShell();
if (!moTrang("thietLap", staff)) {
  trangThaiToanTrang("403", { trangDau: homeRedirect(staff) ?? "/" });
} else {
  const nav = byId("tl-muc");
  const muc = thanhBen({ staff }, "/thiet-lap").find((g) => g.nhom === "THIẾT LẬP")?.muc ?? [];
  const dongMuc = (m: (typeof muc)[number]): HTMLElement => {
    // Việc 16: hình của mục (khai cùng chỗ với thanh bên máy tính) đứng bên trái chữ, cùng hình ở mọi khổ.
    const a = h("a", { class: "dong", href: m.href }, m.bieuTuong && h("span", { class: "tl-muc-hinh" }, icon(m.bieuTuong as IconName, 20)), h("span", { class: "tl-muc-chu" }, m.nhan));
    const { badge, badgeClass } = trinhBay(m.trang, false);
    if (m.trang === "dichVu" && badge)
      void badge().then((n) => {
        if (n > 0) a.append(h("span", { class: `sidebar-item-badge ${badgeClass ?? ""}` }, String(n)));
      });
    return a;
  };
  // Nhóm con hiện sẵn, có tiêu đề (đặc tả 2026-11-26-menu-thiet-lap-nhieu-tang, câu 2: chủ chọn «hiện sẵn»). Nhóm một mục và danh sách ≤ 5 mục hiện phẳng.
  for (const k of khoiThietLap(muc)) {
    if (!("muc" in k)) nav.append(dongMuc(k));
    else nav.append(h("section", { class: "tl-nhom" }, h("h2", { class: "tl-nhom-ten" }, k.nhomGap.nhan), ...k.muc.map(dongMuc)));
  }
}
