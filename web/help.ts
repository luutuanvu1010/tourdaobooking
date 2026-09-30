import { APP_NAME, APP_VERSION, formatLongDate, formatReleaseLine } from "../src/shared/app-info";
import { CHANGELOG, CHANGE_KIND_LABEL, isNewForViewer, type ChangeKind } from "../src/shared/changelog";
import { HUONG_DAN, nhomCuaToi, phanTich, phutDoc, type DoanChu, type Khoi, type NhomHuongDan } from "../src/shared/huong-dan";
import { hasPermission } from "../src/shared/permissions";
import { byId, h, replaceChildren, type Child } from "./dom";
import { markHelpSeen, readHelpSeen } from "./help-seen";
import { initShell } from "./shell";

const KIND_CLASS: Record<ChangeKind, string> = { moi: "badge badge-confirmed", sua: "badge badge-draft", doi: "badge badge-cancelled" };

const seenBefore = readHelpSeen();
markHelpSeen(APP_VERSION);
replaceChildren(byId("release"), `${APP_NAME} · ${formatReleaseLine()}`);
replaceChildren(
  byId("changelog"),
  ...CHANGELOG.map((note) =>
    h(
      "section",
      { class: "release-note" },
      h("h3", null, `Phiên bản ${note.version} — ngày ${formatLongDate(note.date)}`, isNewForViewer(note.version, seenBefore, APP_VERSION) && h("span", { class: "badge badge-new" }, "Mới cập nhật")),
      h("ul", { class: "release-items" }, ...note.items.map((it) => h("li", null, h("span", { class: KIND_CLASS[it.kind] }, CHANGE_KIND_LABEL[it.kind]), " ", it.text))),
    ),
  ),
);

// ---------------------------------------------------------------- hướng dẫn theo vai (src/shared/huong-dan.ts)

const chu = (ds: readonly DoanChu[]): Child[] =>
  ds.map((d) => (d.k === "chu" ? d.t : d.k === "dam" ? h("strong", null, d.t) : h("span", { class: "hd-nut" }, d.t)));

function khoi(k: Khoi): HTMLElement {
  switch (k.k) {
    case "tieuDe": return h("h4", { class: "hd-tieu-de" }, ...chu(k.t));
    case "doan": return h("p", null, ...chu(k.t));
    case "ghiChu": return h("p", { class: "hd-ghi-chu" }, ...chu(k.t));
    case "dsSo": return h("ol", { class: "hd-ds" }, ...k.muc.map((m) => h("li", null, ...chu(m))));
    case "dsCham": return h("ul", { class: "hd-ds" }, ...k.muc.map((m) => h("li", null, ...chu(m))));
  }
}

const noiDung = (md: string): HTMLElement => h("div", { class: "hd-noi-dung" }, ...phanTich(md).map(khoi));

function nhom(n: NhomHuongDan, moNhanh: boolean): HTMLElement {
  return h(
    "div",
    { class: "hd-nhom" },
    h("h3", null, n.tieuDe, " ", h("span", { class: "muted hd-phut" }, `· khoảng ${phutDoc(n)} phút đọc`)),
    h("p", { class: "muted" }, n.gioiThieu),
    h("details", { class: "hd-muc hd-nhanh", open: moNhanh }, h("summary", null, "Bắt đầu nhanh"), noiDung(n.batDauNhanh)),
    ...n.muc.map((m) => h("details", { class: "hd-muc" }, h("summary", null, m.tieuDe), noiDung(m.noiDung))),
  );
}

const staff = await initShell();
const cuaToi = nhomCuaToi(staff.permissions);
const nhomVai = cuaToi.filter((n) => n.quyen.length > 0);
// Nhóm vai của mình đứng TRƯỚC Phần chung (người mới cần "Bắt đầu nhanh" của vai mình mở sẵn); tài khoản chưa có vai thì Phần chung mở sẵn.
// Quản trị cần đọc hướng dẫn của mọi vai để kèm nhân viên mới (chủ chấp nhận 30/9: chữ hướng dẫn không chứa gì nhạy cảm).
const vaiKhac = hasPermission(staff, "ADMIN") || hasPermission(staff, "SUPER_ADMIN") ? HUONG_DAN.filter((n) => !cuaToi.includes(n)) : [];
replaceChildren(
  byId("huong-dan"),
  h("p", { class: "muted" }, "Đọc \"Bắt đầu nhanh\" của vai bạn trước, rồi mở từng mục khi cần. Chữ trong khung xám là tên nút hoặc chữ đúng như trên màn hình."),
  ...nhomVai.map((n, i) => nhom(n, i === 0)),
  ...cuaToi.filter((n) => n.quyen.length === 0).map((n) => nhom(n, nhomVai.length === 0)),
  vaiKhac.length > 0 && h("details", { class: "hd-muc" }, h("summary", null, "Hướng dẫn các vai khác"), ...vaiKhac.map((n) => nhom(n, false))),
);
