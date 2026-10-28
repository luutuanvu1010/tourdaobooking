import React from "react";
import { BieuTuong } from "../../hien-thi/bieu-tuong/BieuTuong.jsx";

export function Chip({ chon, tat, dem, bieuTuong, onClick, className = "", children }) {
  return React.createElement("button", {
    type: "button", "aria-pressed": chon ? "true" : "false", "aria-disabled": tat ? "true" : undefined,
    className: "ib-chip" + (chon ? " is-chon" : "") + " " + className,
    onClick: (e) => { if (!tat && onClick) onClick(e); },
  },
    chon ? React.createElement(BieuTuong, { ten: "check", co: 16 }) : bieuTuong ? React.createElement(BieuTuong, { ten: bieuTuong, co: 16 }) : null,
    React.createElement("span", null, children),
    dem != null ? React.createElement("span", { className: "ib-chip__dem" }, dem) : null
  );
}
