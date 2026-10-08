import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { IMAGE_BYTES, LAYER_BY_ID, type Unit } from "./model";

// ---------- 画像（例えの写真） ----------

const PHOTO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" preserveAspectRatio="none">
<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4fa3e0"/><stop offset="1" stop-color="#bfe3f7"/></linearGradient></defs>
<rect width="300" height="200" fill="url(#s)"/>
<circle cx="230" cy="48" r="22" fill="#ffd54f"/>
<path d="M0 130 L70 60 L120 110 L170 50 L240 125 L300 90 L300 200 L0 200 Z" fill="#5d8a5e"/>
<path d="M150 72 L170 50 L188 70 Z M55 75 L70 60 L84 74 Z" fill="#ffffff"/>
<path d="M0 150 Q150 135 300 150 L300 200 L0 200 Z" fill="#2e7dbf"/>
<path d="M0 175 Q150 165 300 178 L300 200 L0 200 Z" fill="#c8a165"/>
</svg>`;
const PHOTO_URL = `url("data:image/svg+xml,${encodeURIComponent(PHOTO_SVG)}")`;

/** 画像の a〜b（0〜1 の割合）の横帯を背景として表示するスタイル */
export function photoSlice(a: number, b: number) {
  const h = b - a;
  return {
    backgroundImage: PHOTO_URL,
    backgroundRepeat: "no-repeat",
    backgroundSize: `100% ${100 / h}%`,
    backgroundPosition: `0 ${h >= 1 ? 0 : (a / (1 - h)) * 100}%`,
  };
}

export function sliceOf(unit: Unit) {
  return { a: (unit.seq - 1) / IMAGE_BYTES, b: (unit.seq - 1 + unit.bytes) / IMAGE_BYTES };
}

export const CIRCLED = ["①", "②", "③", "④", "⑤"];

/** 写真の切れ端1枚（番号付き） */
export function PhotoPiece({ unit, width = "100%" }: { unit: Unit; width?: number | string }) {
  const { a, b } = sliceOf(unit);
  return (
    <Box
      sx={{
        position: "relative",
        width,
        aspectRatio: `3 / ${2 * (b - a)}`,
        borderRadius: 1,
        boxShadow: 2,
        outline: "2px dashed #fff",
        outlineOffset: -3,
        ...photoSlice(a, b),
      }}
    >
      <Box
        sx={{
          position: "absolute",
          left: 6,
          top: "50%",
          transform: "translateY(-50%)",
          bgcolor: "rgba(0,0,0,0.55)",
          color: "#fff",
          borderRadius: 1,
          px: 0.75,
          fontWeight: 700,
          fontSize: "0.85rem",
        }}
      >
        {CIRCLED[unit.no! - 1]}
      </Box>
    </Box>
  );
}

/** 届かなかった切れ端の場所 */
export function MissingPiece({ unit, width = "100%" }: { unit: Unit; width?: number | string }) {
  const { a, b } = sliceOf(unit);
  return (
    <Box
      sx={{
        width,
        aspectRatio: `3 / ${2 * (b - a)}`,
        borderRadius: 1,
        border: "2px dashed #c62828",
        bgcolor: "#ffebee",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Typography sx={{ color: "#c62828", fontWeight: 700, fontSize: "0.8rem" }}>{CIRCLED[unit.no! - 1]} が届いていない</Typography>
    </Box>
  );
}

/** 切れ端とシーケンス番号を横に並べた札（問題で使う） */
export function PieceTag({ unit }: { unit: Unit }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
      <PhotoPiece unit={unit} width={120} />
      <Typography sx={{ fontFamily: "monospace", fontWeight: 700, fontSize: "0.8rem", color: LAYER_BY_ID.transport.color, whiteSpace: "nowrap" }}>
        seq {unit.seq.toLocaleString()}
      </Typography>
    </Box>
  );
}
