// SINH bởi scripts/huong-dan-xem-lai.mjs, không sửa tay. Mỗi bài: dấu vân lúc xem lại gần nhất, kèm bản và ngày.
export interface DauVanBai { readonly neo: string; readonly chu: string; readonly ban: string; readonly ngay: string }
export const DAU_VAN: Readonly<Record<string, DauVanBai>> = {
  "kho-ve": {"neo":"bce6af8b13e5408b","chu":"e4942804afce83ed","ban":"3.25","ngay":"2026-11-21"},
  "quet-ve": {"neo":"32e130e72ac639cc","chu":"93c9e8217a60edd6","ban":"3.24","ngay":"2026-11-21"},
  "doi-chieu-ve": {"neo":"acf62b32e59c3576","chu":"80947f92445b6340","ban":"3.25","ngay":"2026-11-21"},
  "cai-dat-ve": {"neo":"1a9be7c66766df30","chu":"78895cd744fbcb8b","ban":"2.80","ngay":"2026-11-09"},
  "dich-vu-can-kiem-ve": {"neo":"7472f9f7d97d027a","chu":"b41fe0afa23fe41f","ban":"3.19","ngay":"2026-11-20"},
  "gioi-han-nhap-hoa-hong": {"neo":"5be668561a80de9f","chu":"f2fe829bae2aff80","ban":"2.58","ngay":"2026-11-03"},
  "han-muc-tra-sau": {"neo":"8a61a6bb6e49eb24","chu":"e55a75d65e11b187","ban":"3.27","ngay":"2026-11-21"},
  "xem-no-tra-sau": {"neo":"4db6f12ce2982896","chu":"fa963bef8425dbf2","ban":"3.6","ngay":"2026-11-15"},
  "giao-dien": {"neo":"7fde36318901a977","chu":"8d315591cb3389c0","ban":"3.6","ngay":"2026-11-15"},
  "phi-don": {"neo":"a0fcba41b1b5d9b4","chu":"19bd88ff8bec3e67","ban":"3.17","ngay":"2026-11-18"},
};
