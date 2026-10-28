import React from "react";
import { BieuTuong } from "../../hien-thi/bieu-tuong/BieuTuong.jsx";

export function Nut({ cap = "chinh", co = "thuong", bieuTuong, dangTai, tat, lyDoTat, rong, nhan, href, type = "button", onClick, className = "", children, ...con }) {
  const id = React.useId();
  const chiHinh = !children;
  const cls = ["ib-nut", "ib-nut--" + cap, co === "lon" && "ib-nut--lon", rong && "ib-nut--rong", chiHinh && "ib-nut--hinh", dangTai && "ib-nut--tai", className].filter(Boolean).join(" ");
  const chan = tat || dangTai;
  const bam = (e) => { if (chan) { e.preventDefault(); return; } onClick && onClick(e); };
  const ruot = React.createElement(React.Fragment, null,
    dangTai ? React.createElement("span", { className: "ib-nut__quay", "aria-hidden": "true" }) : bieuTuong ? React.createElement(BieuTuong, { ten: bieuTuong, co: 20 }) : null,
    children ? React.createElement("span", { className: "ib-nut__chu" }, children) : null
  );
  const chung = { className: cls, onClick: bam, "aria-label": nhan, "aria-disabled": tat ? "true" : undefined, "aria-busy": dangTai ? "true" : undefined, "aria-describedby": tat && lyDoTat ? id : undefined, ...con };
  const nut = href && !tat ? React.createElement("a", { href, ...chung }, ruot) : React.createElement("button", { type, ...chung }, ruot);
  if (tat && lyDoTat) {
    return React.createElement("span", { className: "ib-nut-boc" + (rong ? " ib-nut-boc--rong" : "") }, nut, React.createElement("span", { id, className: "ib-nut__ly-do" }, lyDoTat));
  }
  return nut;
}
