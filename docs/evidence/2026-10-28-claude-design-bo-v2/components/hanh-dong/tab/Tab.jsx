import React from "react";

export function Tab({ muc = [], chon, onChon, nhan, rong, className = "" }) {
  return React.createElement("div", { role: "tablist", "aria-label": nhan, className: "ib-tab" + (rong ? " ib-tab--rong" : "") + " " + className },
    muc.map((m) => {
      const dangChon = m.id === chon;
      return React.createElement("button", {
        key: m.id, type: "button", role: "tab", "aria-selected": dangChon ? "true" : "false", tabIndex: dangChon ? 0 : -1,
        className: "ib-tab__muc" + (dangChon ? " is-chon" : "") + (m.xem ? " " + m.xem : ""),
        onClick: () => onChon && onChon(m.id),
      }, m.nhan, m.dem != null ? React.createElement("span", { className: "ib-tab__dem" }, m.dem) : null);
    })
  );
}
