import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { HOST, LAYER_BY_ID, NODE_NAME, ROUTE_TABLE, nextHopLabel, type MapNode, type MapScene, type RouterId } from "./model";

// ---------- ネットワーク地図（スマホ → ルータ → Webサーバ） ----------

const POS: Record<MapNode, [number, number]> = {
  s: [60, 125],
  a: [185, 125],
  b: [320, 60],
  c: [320, 190],
  d: [455, 125],
  w: [612, 125],
};

const LINKS: [MapNode, MapNode][] = [
  ["s", "a"],
  ["a", "b"],
  ["a", "c"],
  ["b", "d"],
  ["c", "d"],
  ["d", "w"],
];

const IP_COLOR = LAYER_BY_ID.internet.color;

function sameLink([a, b]: [MapNode, MapNode], [c, d]: [MapNode, MapNode]) {
  return (a === c && b === d) || (a === d && b === c);
}

function pathD(path: MapNode[]) {
  return path.map((n, i) => `${i === 0 ? "M" : "L"}${POS[n][0]} ${POS[n][1] - 30}`).join(" ");
}

function linksOf(path: MapNode[]): [MapNode, MapNode][] {
  return path.slice(1).map((n, i) => [path[i], n]);
}

function PacketShape({ label, fill = IP_COLOR }: { label: string; fill?: string }) {
  return (
    <>
      <rect x={-15} y={-13} width={30} height={26} rx={5} fill={fill} />
      <text x={0} y={5} textAnchor="middle" fill="#fff" fontSize={13} fontWeight={700}>
        {label}
      </text>
    </>
  );
}

export interface NetworkMapProps extends MapScene {
  /** 色を付けるつなぎ線（流れるパケットの経路は自動で色が付く） */
  lit?: [MapNode, MapNode][];
}

export function NetworkMap({ here, parked = [], packets = [], congested = [], lit = [] }: NetworkMapProps) {
  const litLinks = [...lit, ...packets.filter((p) => !p.lost).flatMap((p) => linksOf(p.path))];
  const lostLinks = packets.filter((p) => p.lost).flatMap((p) => linksOf(p.path));
  const dur = 3.2;

  return (
    <Box sx={{ overflowX: "auto" }}>
      <Box
        component="svg"
        viewBox="0 0 680 240"
        role="img"
        aria-label="スマホから Web サーバまでのネットワーク地図"
        sx={{ width: "100%", minWidth: 420, height: "auto", display: "block" }}
      >
        {LINKS.map((l) => {
          const on = litLinks.some((x) => sameLink(x, l));
          const lost = lostLinks.some((x) => sameLink(x, l));
          return (
            <line
              key={l.join("-")}
              x1={POS[l[0]][0]}
              y1={POS[l[0]][1]}
              x2={POS[l[1]][0]}
              y2={POS[l[1]][1]}
              stroke={on ? IP_COLOR : lost ? "#ef9a9a" : "#cfd8dc"}
              strokeWidth={5}
              strokeLinecap="round"
              strokeDasharray={lost && !on ? "8 6" : undefined}
              style={{ transition: "stroke 0.4s" }}
            />
          );
        })}

        {(Object.keys(POS) as MapNode[]).map((n) => {
          const [x, y] = POS[n];
          const isHost = n === "s" || n === "w";
          const w = isHost ? 104 : 84;
          const h = isHost ? 54 : 46;
          const isHere = here === n;
          const busy = congested.includes(n);
          return (
            <g key={n}>
              <rect
                x={x - w / 2}
                y={y - h / 2}
                width={w}
                height={h}
                rx={8}
                fill={isHere ? "#fff59d" : busy ? "#ffebee" : "#f5f7fa"}
                stroke={isHere ? IP_COLOR : busy ? "#c62828" : "#b0bec5"}
                strokeWidth={isHere ? 3 : 2}
                style={{ transition: "all 0.3s" }}
              />
              <text x={x} y={isHost ? y - 3 : y + 5} textAnchor="middle" fontSize={13} fontWeight={700} fill="#1d2330">
                {n === "s" ? `${HOST.client.icon} ` : n === "w" ? `${HOST.server.icon} ` : ""}
                {NODE_NAME[n]}
              </text>
              {isHost && (
                <text x={x} y={y + 15} textAnchor="middle" fontSize={11} fontFamily="monospace" fill="#546e7a">
                  {n === "s" ? HOST.client.ip : HOST.server.ip}
                </text>
              )}
              {busy && (
                <text x={x} y={y + h / 2 + 16} textAnchor="middle" fontSize={12} fontWeight={700} fill="#c62828">
                  🚧 混雑中
                </text>
              )}
            </g>
          );
        })}

        {parked.map((p) => (
          <g key={`parked-${p.label}`} transform={`translate(${POS[p.at][0]} ${POS[p.at][1] - 30})`} style={{ transition: "transform 0.7s ease-in-out" }}>
            <PacketShape label={p.label} />
          </g>
        ))}

        {packets.map((p) => {
          const begin = `${p.delay}s`;
          const end = POS[p.path[p.path.length - 1]];
          return (
            <g key={`moving-${p.label}`}>
              <g opacity={0}>
                <PacketShape label={p.label} fill={p.lost ? "#c62828" : IP_COLOR} />
                <animateMotion path={pathD(p.path)} dur={`${dur}s`} begin={begin} repeatCount="indefinite" keyPoints="0;1;1" keyTimes="0;0.75;1" calcMode="linear" />
                <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.08;0.85;1" dur={`${dur}s`} begin={begin} repeatCount="indefinite" />
              </g>
              {p.lost && (
                <text x={end[0] + 34} y={end[1] - 22} textAnchor="middle" fontSize={22} fontWeight={700} fill="#c62828">
                  ✕
                </text>
              )}
            </g>
          );
        })}
      </Box>
    </Box>
  );
}

/** ルータの経路表 */
export function RouteTable({ router, hit }: { router: RouterId; hit?: number }) {
  const cell = { border: "1px solid #cfd8dc", px: 1, py: 0.5, textAlign: "left" as const };
  return (
    <Box component="table" sx={{ borderCollapse: "collapse", width: "100%", fontSize: "0.85rem" }}>
      <Box component="caption" sx={{ textAlign: "left", fontWeight: 700, pb: 0.5, captionSide: "top" }}>
        📋 {NODE_NAME[router]}の経路表
      </Box>
      <thead>
        <tr>
          <Box component="th" sx={{ ...cell, bgcolor: "#eceff1", fontSize: "0.75rem", color: "text.secondary" }}>
            宛先ネットワーク
          </Box>
          <Box component="th" sx={{ ...cell, bgcolor: "#eceff1", fontSize: "0.75rem", color: "text.secondary" }}>
            次に渡す相手
          </Box>
        </tr>
      </thead>
      <tbody>
        {ROUTE_TABLE[router].map(([net, to], i) => (
          <Box component="tr" key={net} sx={{ bgcolor: hit === i ? "#fff59d" : "transparent", transition: "background-color 0.3s" }}>
            <Box component="td" sx={{ ...cell, fontFamily: "monospace", fontWeight: hit === i ? 700 : 400 }}>
              {net}
            </Box>
            <Box component="td" sx={{ ...cell, fontWeight: hit === i ? 700 : 400 }}>
              {nextHopLabel(router, to)}
            </Box>
          </Box>
        ))}
      </tbody>
    </Box>
  );
}

export function DestinationCard() {
  return (
    <Box sx={{ border: `2px solid ${IP_COLOR}`, borderRadius: 2, px: 1.5, py: 0.75 }}>
      <Typography variant="body2">
        ✉️ パケットの宛先IPアドレス：
        <Box component="span" sx={{ fontFamily: "monospace", fontWeight: 700, color: IP_COLOR }}>
          {HOST.server.ip}
        </Box>
      </Typography>
    </Box>
  );
}
