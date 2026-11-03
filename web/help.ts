// Trang Nhật ký thay đổi (bản vẽ Hỗ trợ › Hướng dẫn, mục E). Hướng dẫn đã sang /huong-dan. Mở trang là tính đã xem: chấm đỏ ở menu tắt, bản chưa xem vẫn ghi «chưa xem» trong trang.
import { APP_NAME, APP_VERSION, formatLongDate, formatReleaseLine } from "../src/shared/app-info";
import { CHANGELOG, CHANGE_KIND_LABEL, isNewForViewer, type ChangeKind } from "../src/shared/changelog";
import { byId, h, replaceChildren } from "./dom";
import { markHelpSeen, readHelpSeen } from "./help-seen";
import { icon, type IconName } from "./icons";
import { initShell } from "./shell";

const TONG: Record<ChangeKind, { tong: string; hinh: IconName }> = { moi: { tong: "cat", hinh: "plus" }, sua: { tong: "la", hinh: "check" }, doi: { tong: "bien", hinh: "swap" } };

const seenBefore = readHelpSeen();
markHelpSeen(APP_VERSION);
replaceChildren(byId("release"), `${APP_NAME} · bạn đang dùng ${formatReleaseLine().replace("Phiên bản", "bản").replace(" · ngày", ", ngày")}`);
replaceChildren(
  byId("changelog"),
  ...CHANGELOG.map((note) =>
    h(
      "section",
      { class: "the nk-ban" },
      h("h2", { class: "nk-ban-dau" }, `Phiên bản ${note.version} — ngày ${formatLongDate(note.date)}`,
        isNewForViewer(note.version, seenBefore, APP_VERSION) && h("span", { class: "nk-chua-xem" }, h("span", { class: "new-dot", role: "img", "aria-label": "Bản bạn chưa xem" }), "chưa xem")),
      ...note.items.map((it) =>
        h("div", { class: "nk-muc" },
          h("span", { class: "huy-hieu", "data-tong": TONG[it.kind].tong }, icon(TONG[it.kind].hinh, 14), CHANGE_KIND_LABEL[it.kind]),
          h("div", { class: "nk-chu" }, it.text, it.bai && h("a", { class: "nut nk-lien-bai", "data-cap": "loi", href: `/huong-dan?bai=${encodeURIComponent(it.bai.id)}` }, `Hướng dẫn: ${it.bai.ten}`)))),
    ),
  ),
);

await initShell();
