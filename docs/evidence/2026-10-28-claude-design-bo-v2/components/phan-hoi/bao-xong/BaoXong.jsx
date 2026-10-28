import React from "react";
import { BieuTuong } from "../../hien-thi/bieu-tuong/BieuTuong.jsx";

export function BaoXong({ mo = true, hoanTac, onDong, thoiGian = 3000, giuNguyen, trongKhung, children, className = "" }) {
  const [dung, datDung] = React.useState(false);
  React.useEffect(() => {
    if (!mo || giuNguyen || dung || !onDong) return undefined;
    const t = setTimeout(onDong, thoiGian);
    return () => clearTimeout(t);
  }, [mo, giuNguyen, dung, onDong, thoiGian]);
  if (!mo) return null;
  return (
    <div className={"ib-bao-xong-lop" + (trongKhung ? " ib-bao-xong-lop--trong-khung" : "") + " " + className}>
      <div className="ib-bao-xong" role="status" aria-live="polite" onMouseEnter={() => datDung(true)} onMouseLeave={() => datDung(false)} onFocus={() => datDung(true)} onBlur={() => datDung(false)}>
        <BieuTuong ten="check" className="ib-bao-xong__bt" />
        <span className="ib-bao-xong__chu">{children}</span>
        {hoanTac ? <button type="button" className="ib-bao-xong__hoan-tac" onClick={hoanTac}>Hoàn tác</button> : null}
        {onDong ? <button type="button" className="ib-bao-xong__dong" aria-label="Đóng" onClick={onDong}><BieuTuong ten="close" co={18} /></button> : null}
      </div>
    </div>
  );
}
