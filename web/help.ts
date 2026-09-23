import { APP_NAME, APP_VERSION, formatLongDate, formatReleaseLine } from "../src/shared/app-info";
import { CHANGELOG, CHANGE_KIND_LABEL, isNewForViewer, type ChangeKind } from "../src/shared/changelog";
import { byId, h, replaceChildren } from "./dom";
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
await initShell();
