import React from "react";

const RONG_DONG = ["100%", "88%", "56%", "94%", "72%"];

export function KhungXuong({ kieu = "dong", soDong = 3, rong, nhan = "Đang tải", className = "" }) {
  let ruot;
  if (kieu === "so") {
    ruot = <React.Fragment><span className="ib-xuong__khoi ib-xuong__so" style={rong ? { width: rong } : undefined} /><span className="ib-xuong__khoi ib-xuong__dong" style={{ width: "60%" }} /></React.Fragment>;
  } else if (kieu === "vien") {
    ruot = <span className="ib-xuong__khoi ib-xuong__vien" style={rong ? { width: rong } : undefined} />;
  } else {
    ruot = Array.from({ length: soDong }, (_, i) => <span key={i} className="ib-xuong__khoi ib-xuong__dong" style={{ width: soDong === 1 ? rong || "100%" : i === 0 && rong ? rong : RONG_DONG[i % RONG_DONG.length] }} />);
  }
  return <span className={"ib-xuong ib-xuong--" + kieu + " " + className} role="status" aria-label={nhan}>{ruot}</span>;
}
