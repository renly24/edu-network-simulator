// ---------- モデル（スライドの内容） ----------

export type Side = "client" | "server";
export type Layer = "app" | "transport" | "internet" | "link";
export type Phase = "request" | "response";
export type PartKind = "eth" | "ip" | "tcp" | "data" | "fcs";
export type Proto = "tcp" | "udp";
/** ネットワーク地図上の機器 */
export type MapNode = "s" | "a" | "b" | "c" | "d" | "w";

export const LAYERS: { id: Layer; name: string; osi: string; protocol: string; color: string }[] = [
  { id: "app", name: "アプリケーション層", osi: "OSI 第5〜7層", protocol: "HTTP", color: "#1e88e5" },
  { id: "transport", name: "トランスポート層", osi: "OSI 第4層", protocol: "TCP", color: "#43a047" },
  { id: "internet", name: "インターネット層", osi: "OSI 第3層", protocol: "IP", color: "#fb8c00" },
  { id: "link", name: "ネットワークインタフェース層", osi: "OSI 第1〜2層", protocol: "イーサネット", color: "#8e24aa" },
];

export const LAYER_BY_ID = Object.fromEntries(LAYERS.map((l) => [l.id, l])) as Record<
  Layer,
  (typeof LAYERS)[number]
>;

export const UDP_COLOR = "#00897b";

const PART_STYLE: Record<PartKind, { label: string; color: string }> = {
  eth: { label: "Eth", color: LAYER_BY_ID.link.color },
  ip: { label: "IP", color: LAYER_BY_ID.internet.color },
  tcp: { label: "TCP", color: LAYER_BY_ID.transport.color },
  data: { label: "データ", color: LAYER_BY_ID.app.color },
  fcs: { label: "FCS", color: LAYER_BY_ID.link.color },
};

/** ヘッダの短い名前と色（UDP のときはトランスポート層のヘッダを UDP として表示する） */
export function partStyle(kind: PartKind, proto: Proto = "tcp") {
  if (kind === "tcp" && proto === "udp") return { label: "UDP", color: UDP_COLOR };
  return PART_STYLE[kind];
}

export function partTitle(kind: PartKind, proto: Proto = "tcp") {
  if (kind === "eth") return "イーサネットヘッダ";
  if (kind === "data") return "データ（HTTP）";
  return `${partStyle(kind, proto).label}ヘッダ`;
}

export const HOST = {
  client: { name: "スマホ（SNSアプリ）", short: "スマホ", icon: "📱", ip: "192.168.1.10", mac: "AA:AA:AA:11:11:11", port: 50000 },
  server: { name: "Webサーバ（SNS）", short: "Webサーバ", icon: "🖥️", ip: "203.0.113.20", mac: "BB:BB:BB:22:22:22", port: 80 },
} as const;

/** それぞれの機器にいちばん近いルータ（デフォルトゲートウェイ） */
export const GATEWAY: Record<Side, { name: string; mac: string }> = {
  client: { name: "ルータA", mac: "CC:CC:CC:33:33:33" },
  server: { name: "ルータD", mac: "DD:DD:DD:44:44:44" },
};

export const MSS = 1460;
/** 説明のため、画像はとても小さいサイズにしている */
export const IMAGE_BYTES = 4000;
const RESPONSE_BYTES = 200;

export interface Unit {
  /** セグメント番号（分割されていない場合は null） */
  no: number | null;
  parts: PartKind[];
  bytes: number;
  seq: number;
  checked?: boolean;
}

export const CHAPTERS = [
  { id: 1, name: "パケットにする", color: "#1e88e5" },
  { id: 2, name: "行き先を決める（IP）", color: "#fb8c00" },
  { id: 3, name: "データを直す（TCP）", color: "#43a047" },
  { id: 4, name: "UDPだったら？", color: UDP_COLOR },
  { id: 5, name: "返事とまとめ", color: "#8e24aa" },
] as const;

export type ChapterId = (typeof CHAPTERS)[number]["id"];

export interface ChoiceQuiz {
  kind: "choice";
  question: string;
  options: string[];
  answer: number;
  ok: string;
  ng: string;
  /** true の予想問題は、答えるまで次のスライドへ進めない */
  gate?: boolean;
}

export type Quiz = ChoiceQuiz | { kind: "router" } | { kind: "missing" } | { kind: "reorder" } | { kind: "sort" } | { kind: "test" };

export type QuizLabel = "予想問題" | "体験問題" | "確認問題";

export function quizLabel(quiz: Quiz | undefined): QuizLabel | null {
  if (!quiz) return null;
  if (quiz.kind === "choice") return quiz.gate ? "予想問題" : "確認問題";
  if (quiz.kind === "test") return "確認問題";
  return "体験問題";
}

export const QUIZ_COLOR: Record<QuizLabel, string> = {
  予想問題: "#1565c0",
  体験問題: "#ef6c00",
  確認問題: "#2e7d32",
};

/** ネットワーク地図の場面 */
export interface MapScene {
  /** 注目しているルータ */
  here?: MapNode;
  /** 経路表を表示するルータと、当てはまる行 */
  table?: { router: RouterId; hit: number };
  /** その場に止まっているパケット */
  parked?: { label: string; at: MapNode }[];
  /** 地図の上を流れるパケット */
  packets?: { label: string; path: MapNode[]; lost?: boolean; delay: number }[];
  congested?: MapNode[];
}

export interface Step {
  id?: string;
  chapter: ChapterId;
  phase: Phase;
  where: { side: Side; layer: Layer } | "wire";
  title: string;
  description: string;
  units: Unit[];
  /** 詳細表で強調するヘッダ */
  focus?: PartKind;
  checks?: string[];
  /** 受信側で「ヘッダに書かれた宛先」と「自分のアドレス」を見比べる */
  compare?: { label: string; header: string; mine: string; result: string };
  /** 層の図の間（ネットワーク）を流れるもの */
  wire?: { dir: "right" | "left"; items: string[] };
  proto?: Proto;
  /** 上段左の表示（既定は層の図） */
  stage?: "layers" | "map" | "router" | "sort" | "test";
  map?: MapScene;
  quiz?: Quiz;
  /** 写真の見出し・欠けている切れ端。false で写真を出さない */
  photo?: { caption?: string; missing?: number } | false;
  /** TCP と UDP の比較表を出す */
  protocolTable?: boolean;
  /** 下段の「いまのデータ」を出さない */
  hideData?: boolean;
}

export const HEADERS_ALL: PartKind[] = ["eth", "ip", "tcp", "data", "fcs"];
export const HEADERS_IP: PartKind[] = ["ip", "tcp", "data"];
export const HEADERS_TCP: PartKind[] = ["tcp", "data"];
const DATA_ONLY: PartKind[] = ["data"];

function segments(total: number): { bytes: number; seq: number }[] {
  const result: { bytes: number; seq: number }[] = [];
  for (let offset = 0; offset < total; offset += MSS) {
    result.push({ bytes: Math.min(MSS, total - offset), seq: offset + 1 });
  }
  return result;
}

function withParts(units: Unit[], parts: PartKind[], checked = false): Unit[] {
  return units.map((u) => ({ ...u, parts, checked }));
}

export const SPLIT: Unit[] = segments(IMAGE_BYTES).map((s, i) => ({ no: i + 1, parts: DATA_ONLY, ...s }));

export function byteRange(u: Unit) {
  return `${u.seq.toLocaleString()}〜${(u.seq + u.bytes - 1).toLocaleString()}`;
}

// ---------- ルータの経路表 ----------

export type RouterId = "a" | "b" | "c" | "d";

export const NODE_NAME: Record<MapNode, string> = {
  s: "スマホ",
  a: "ルータA",
  b: "ルータB",
  c: "ルータC",
  d: "ルータD",
  w: "Webサーバ",
};

/** [宛先ネットワーク, 次に渡す相手] */
export const ROUTE_TABLE: Record<RouterId, [string, MapNode][]> = {
  a: [
    ["192.168.1.0/24", "s"],
    ["203.0.113.0/24", "b"],
    ["198.51.100.0/24", "c"],
  ],
  b: [
    ["192.168.1.0/24", "a"],
    ["203.0.113.0/24", "d"],
  ],
  c: [
    ["192.168.1.0/24", "a"],
    ["203.0.113.0/24", "d"],
  ],
  d: [
    ["198.51.100.0/24", "c"],
    ["203.0.113.0/24", "w"],
    ["192.168.1.0/24", "b"],
  ],
};

export function nextHopLabel(router: RouterId, to: MapNode) {
  const direct = (router === "a" && to === "s") || (router === "d" && to === "w");
  return direct ? `${NODE_NAME[to]}（直接つながっている）` : NODE_NAME[to];
}

// ---------- スライド ----------

function buildSteps(): Step[] {
  const image: Unit[] = [{ no: null, parts: DATA_ONLY, bytes: IMAGE_BYTES, seq: 1 }];
  const split = SPLIT;
  const got13 = [split[0], split[2]];
  const got132 = [split[0], split[2], split[1]];
  const reply: Unit[] = [{ no: null, parts: DATA_ONLY, bytes: RESPONSE_BYTES, seq: 1 }];
  const s = HOST.server;
  const c = HOST.client;
  const viaB: MapNode[] = ["s", "a", "b", "d", "w"];
  const viaC: MapNode[] = ["s", "a", "c"];

  return [
    // ---- 第1章 パケットにする（スマホ） ----
    {
      chapter: 1,
      phase: "request",
      where: { side: "client", layer: "app" },
      title: "画像を投稿する",
      description: `SNSアプリで写真を選んで「投稿」を押すと、アプリケーション層の HTTP が「この画像を保存してください」というリクエスト（POST /upload ＋ 画像データ）を作ります。画像の大きさは ${IMAGE_BYTES.toLocaleString()} バイトです（説明のため、とても小さな画像にしています）。`,
      units: image,
      focus: "data",
    },
    {
      chapter: 1,
      phase: "request",
      where: { side: "client", layer: "transport" },
      title: "いくつに分ける？",
      description: `一度に送れるデータの大きさには上限（MSS = ${MSS.toLocaleString()} バイト）があります。投稿する画像は ${IMAGE_BYTES.toLocaleString()} バイトです。`,
      units: image,
      focus: "data",
      quiz: {
        kind: "choice",
        gate: true,
        question: "画像はいくつに分けて送ることになる？",
        options: ["2つ", "3つ", "4つ"],
        answer: 1,
        ok: "正解！ 1,460 ＋ 1,460 ＋ 1,080 ＝ 4,000 バイト。3つに分けて送ります。",
        ng: "1,460 バイトずつ切っていくと、1,460 ＋ 1,460 ＝ 2,920 バイト。残りの 1,080 バイトでもう1つ必要なので、答えは3つです。",
      },
    },
    {
      id: "split",
      chapter: 1,
      phase: "request",
      where: { side: "client", layer: "transport" },
      title: "画像を分割する（パケットに分ける）",
      description: `画像を ${MSS.toLocaleString()} バイトずつ、${split.length} つに切り分けます。写真をハサミで切って、何通かの封筒に分けて送るイメージです。小分けにしておくと、途中で一部がなくなっても、なくなった部分だけを送り直せばすみます。`,
      units: split,
      focus: "data",
    },
    {
      chapter: 1,
      phase: "request",
      where: { side: "client", layer: "transport" },
      title: "それぞれにTCPヘッダを付ける",
      description:
        "切り分けたそれぞれに TCP ヘッダを付けます。送信元ポートはアプリのポート（50000）、宛先ポートは Web サーバの Web サービスのポート（80）です。さらにシーケンス番号（画像の何バイト目からか）を書いておくので、受け取った側は足りない部分に気づいたり、元の順番に並べ直したりできます。",
      units: withParts(split, HEADERS_TCP),
      focus: "tcp",
    },
    {
      chapter: 1,
      phase: "request",
      where: { side: "client", layer: "internet" },
      title: "IPヘッダを付ける",
      description: `IP ヘッダに送信元 IP アドレス（${c.ip}）と宛先 IP アドレス（${s.ip}）を書きます。宛先 IP アドレスは「最終的に届けたい相手」で、途中のルータを何台通っても書き換わりません。${split.length} 個の「IPパケット」ができました。`,
      units: withParts(split, HEADERS_IP),
      focus: "ip",
    },
    {
      chapter: 1,
      phase: "request",
      where: { side: "client", layer: "link" },
      title: "イーサネットヘッダを付けて送信",
      description: `Web サーバは別のネットワークにあるので、スマホから直接は届けられません。まずはいちばん近い${GATEWAY.client.name}（家の Wi-Fi ルータなど）に渡すため、${GATEWAY.client.name}の MAC アドレスを宛先にしてイーサネットヘッダを付けます。末尾には誤り検出用の FCS を付けて「フレーム」にします。`,
      units: withParts(split, HEADERS_ALL),
      focus: "eth",
    },
    {
      chapter: 1,
      phase: "request",
      where: { side: "client", layer: "link" },
      title: "ここまでの確認",
      description: "画像を小分けにして送る理由を確認しましょう。",
      units: withParts(split, HEADERS_ALL),
      focus: "data",
      quiz: {
        kind: "choice",
        question: "画像を小分けにして送ると、どんな良いことがある？",
        options: ["画像の画質が良くなる", "途中で一部がなくなっても、その部分だけ送り直せばすむ", "宛先の IP アドレスを書かなくてよくなる"],
        answer: 1,
        ok: "正解！ 大きな画像のまま送ると、少しでも失敗したら全部送り直しです。小分けなら、失敗した分だけですみます（第3章で実際に見ます）。",
        ng: "大きな画像のまま送ると、少しでも失敗したら全部送り直しです。小分けにしておけば、失敗した分だけ送り直せばすみます（第3章で実際に見ます）。",
      },
    },

    // ---- 第2章 IP アドレスで行き先を決める（ネットワーク） ----
    {
      id: "route",
      chapter: 2,
      phase: "request",
      where: "wire",
      stage: "map",
      map: { here: "a", table: { router: "a", hit: 1 }, parked: [{ label: "①", at: "a" }] },
      title: "ルータが宛先IPアドレスを見て、次の行き先を決める",
      description: `スマホと Web サーバの間には、たくさんのルータがあります。ルータはパケットの宛先 IP アドレス（${s.ip}）を見て、「経路表」から次に渡す相手を決めます。ルータが決めるのは最終的な行き先ではなく、「次はどこへ渡すか」だけです。これをバケツリレーのようにくり返して、パケットは目的地に近づいていきます。ルータを通るたびに MAC アドレスは次の相手あてに付け替えられますが、宛先 IP アドレスは変わりません。`,
      units: withParts(split, HEADERS_ALL),
      focus: "ip",
      photo: false,
    },
    {
      chapter: 2,
      phase: "request",
      where: "wire",
      stage: "router",
      title: "あなたはルータ",
      description: `パケット①が${GATEWAY.client.name}に届きました。宛先 IP アドレス ${s.ip} と経路表を見比べて、次に渡す相手を選んでください。Web サーバに届くまで続けます。`,
      units: withParts([split[0]], HEADERS_ALL),
      focus: "ip",
      quiz: { kind: "router" },
      photo: false,
    },
    {
      chapter: 2,
      phase: "request",
      where: "wire",
      stage: "map",
      map: {
        packets: [
          { label: "①", path: viaB, delay: 0 },
          { label: "③", path: viaB, delay: 1.2 },
        ],
        parked: [{ label: "②", at: "c" }],
        congested: ["c"],
      },
      title: "混んでいるルータに着いた②は？",
      description:
        "ルータどうしは道の混み具合などの情報を交換して、経路表をこまめに書き換えています。そのため、同じ宛先でもパケットごとに違う道を通ることがあります。②は経路表が書き換わったあとに送られ、ルータC を通ることになりました。ところが、ルータC はとても混んでいます。",
      units: withParts(split, HEADERS_ALL),
      focus: "ip",
      photo: false,
      quiz: {
        kind: "choice",
        gate: true,
        question: "ルータC に着いた②は、どうなる可能性がある？",
        options: ["ルータC が空くまで、いつまでも待ってもらえる", "処理しきれずに捨てられてしまう", "自動でルータB の道にワープする"],
        answer: 1,
        ok: "そのとおり。ルータは処理しきれないパケットを捨ててしまうことがあります（パケットロス）。IP には「ちゃんと届いたか」を確かめる仕組みがありません。",
        ng: "ルータが一時的にためておける量には限りがあります。あふれたパケットは捨てられてしまいます（パケットロス）。IP には「ちゃんと届いたか」を確かめる仕組みがありません。",
      },
    },
    {
      id: "lost",
      chapter: 2,
      phase: "request",
      where: "wire",
      stage: "map",
      map: {
        packets: [
          { label: "①", path: viaB, delay: 0 },
          { label: "②", path: viaC, lost: true, delay: 0.6 },
          { label: "③", path: viaB, delay: 1.2 },
        ],
        congested: ["c"],
      },
      title: "②が途中で消えた（パケットロス）",
      description:
        "①と③はルータB を通って Web サーバに届きましたが、②はルータC で捨てられてしまいました。Web サーバに届いたのは①と③だけです。送ったスマホも、受け取る Web サーバも、まだそのことを知りません。",
      units: withParts(got13, HEADERS_ALL),
      focus: "ip",
      photo: { caption: "Webサーバに届いた切れ端", missing: 2 },
    },
    {
      chapter: 2,
      phase: "request",
      where: { side: "server", layer: "link" },
      title: "宛先MACアドレスを確認",
      description: `Web サーバは、受け取ったフレームの宛先 MAC アドレスを確認します。最後の${GATEWAY.server.name}が、Web サーバの MAC アドレスあてにイーサネットヘッダを付け替えて届けてくれました。`,
      units: withParts(got13, HEADERS_ALL, true),
      focus: "eth",
      compare: { label: "MACアドレス", header: s.mac, mine: s.mac, result: "自分あてなので受け取る" },
      checks: ["FCS で誤りなし → イーサネットヘッダと FCS を外す"],
      photo: { caption: "届いた切れ端", missing: 2 },
    },
    {
      chapter: 2,
      phase: "request",
      where: { side: "server", layer: "internet" },
      title: "宛先IPアドレスを確認",
      description: "スマホが最初に書いた宛先 IP アドレスが、ルータをいくつ通ってもそのまま届いています。自分の IP アドレスと一致するので、IP ヘッダを外します。",
      units: withParts(got13, HEADERS_IP, true),
      focus: "ip",
      compare: { label: "IPアドレス", header: s.ip, mine: s.ip, result: "自分あてなので IPヘッダを外す" },
      photo: { caption: "届いた切れ端", missing: 2 },
    },
    {
      chapter: 2,
      phase: "request",
      where: { side: "server", layer: "internet" },
      title: "ここまでの確認",
      description: "3つのアドレス（MAC アドレス・IP アドレス・ポート番号）の役割を確認しましょう。",
      units: withParts(got13, HEADERS_IP, true),
      focus: "ip",
      photo: false,
      quiz: {
        kind: "choice",
        question: "ルータが「次にどこへ渡すか」を決めるときに見るのは？",
        options: ["宛先 MAC アドレス", "宛先 IP アドレス", "宛先ポート番号"],
        answer: 1,
        ok: "正解！ ルータは宛先 IP アドレスと経路表を見比べて、次の相手を決めます。MAC アドレスは「となりの機器まで」届けるためのもので、ルータを通るたびに付け替えられます。ポート番号は、届いた先でどのアプリに渡すかを決めるためのものです。",
        ng: "ルータが見るのは宛先 IP アドレスです。MAC アドレスは「となりの機器まで」届けるためのもので、ルータを通るたびに付け替えられます。ポート番号は、届いた先でどのアプリに渡すかを決めるためのものです。",
      },
    },

    // ---- 第3章 TCP がデータを直す（Web サーバ） ----
    {
      id: "missing",
      chapter: 3,
      phase: "request",
      where: { side: "server", layer: "transport" },
      title: "足りないデータを見つける",
      description:
        "TCP は、届いたデータのシーケンス番号（画像の何バイト目からか）を確認します。届いたのは seq 1 と seq 2,921 の2つです。どこが足りないか見つけてください。",
      units: withParts(got13, HEADERS_TCP, true),
      focus: "tcp",
      quiz: { kind: "missing" },
      photo: { caption: "届いた切れ端", missing: 2 },
    },
    {
      chapter: 3,
      phase: "request",
      where: { side: "server", layer: "transport" },
      title: "足りないと気づいたら？",
      description: `Web サーバの TCP は、${byteRange(split[1])} バイト目（②）が届いていないことに気づきました。`,
      units: withParts(got13, HEADERS_TCP, true),
      focus: "tcp",
      photo: { caption: "届いた切れ端", missing: 2 },
      quiz: {
        kind: "choice",
        gate: true,
        question: "足りないと気づいた TCP は、どうする？",
        options: ["足りないまま、画像として保存する", "スマホに「まだ届いていない」と知らせて、送り直してもらう", "何もしないで、②が届くまでずっと待つ"],
        answer: 1,
        ok: "正解！ TCP は受け取った分を確認応答（ACK）で知らせます。送る側は、届いていない分をもう一度送ります（再送）。",
        ng: "TCP は欠けたデータをそのままアプリに渡しません。受け取った分を確認応答（ACK）で知らせ、送る側は届いていない分をもう一度送ります（再送）。",
      },
    },
    {
      chapter: 3,
      phase: "request",
      where: { side: "server", layer: "transport" },
      wire: { dir: "left", items: ["ACK"] },
      title: "確認応答（ACK）で知らせる",
      description: `Web サーバは「${split[1].seq.toLocaleString()} バイト目から送ってください」という確認応答（ACK）をスマホに返します。TCP では、受け取ったデータには ACK を返す約束になっています。`,
      units: withParts(got13, HEADERS_TCP, true),
      focus: "tcp",
      checks: [`ACK 番号 ${split[1].seq.toLocaleString()} ＝「${split[0].bytes.toLocaleString()} バイト目までは届きました。次は ${split[1].seq.toLocaleString()} バイト目からください」`],
      photo: { caption: "届いた切れ端", missing: 2 },
    },
    {
      chapter: 3,
      phase: "request",
      where: { side: "client", layer: "transport" },
      wire: { dir: "right", items: ["②"] },
      title: "スマホが②を再送する",
      description:
        "ACK を受け取ったスマホは、②がまだ届いていないと分かり、②をもう一度送ります。送る側は、送ったデータに ACK が返ってくるまで、そのデータを手元に残しています。一定時間たっても ACK が返ってこないときも、同じように再送します。",
      units: withParts([split[1]], HEADERS_TCP),
      focus: "tcp",
      photo: { caption: "もう一度送る切れ端" },
    },
    {
      chapter: 3,
      phase: "request",
      where: { side: "server", layer: "transport" },
      title: "元の順番に並べ替える",
      description: "再送された②も届き、3つそろいました。ただし届いた順番は ①→③→② です。シーケンス番号を見て、元の順番に並べ替えてください。",
      units: withParts(got132, HEADERS_TCP, true),
      focus: "tcp",
      quiz: { kind: "reorder" },
      photo: { caption: "届いた順番（バラバラ）" },
    },
    {
      chapter: 3,
      phase: "request",
      where: { side: "server", layer: "transport" },
      title: "画像を統合する",
      description: `TCP ヘッダを外し、並べ替えた切れ端をつなげて、元の ${IMAGE_BYTES.toLocaleString()} バイトの画像に戻します。途中で②がなくなっても、TCP のおかげでアプリには欠けも順番の乱れもないデータが渡されます。`,
      units: image,
      focus: "data",
      photo: { caption: "元どおりにつながった画像" },
    },
    {
      chapter: 3,
      phase: "request",
      where: { side: "server", layer: "app" },
      title: "画像を受け取って保存",
      description: "Web サーバが HTTP リクエスト（POST /upload）と画像を受け取り、保存しました。",
      units: image,
      focus: "data",
      photo: { caption: "Webサーバに保存された画像" },
    },

    // ---- 第4章 UDP だったら？ ----
    {
      chapter: 4,
      phase: "request",
      where: { side: "server", layer: "transport" },
      proto: "udp",
      title: "UDPで送っていたら？",
      description:
        "トランスポート層には TCP のほかに UDP というプロトコルもあります。UDP は、TCP のような確認応答（ACK）や再送、並べ替えをしません。同じように②が途中で消えたとき、UDP だとどうなるでしょう？",
      units: withParts(got13, HEADERS_TCP, true),
      focus: "tcp",
      photo: false,
      quiz: {
        kind: "choice",
        gate: true,
        question: "UDP で送っていて②が消えたら、受け取ったアプリにはどう渡される？",
        options: ["TCP と同じように、②が再送されてから渡される", "②が欠けたまま、届いた順に渡される", "全部捨てられて、何も届かない"],
        answer: 1,
        ok: "正解！ UDP は届いたものを、届いた順にそのままアプリに渡します。②は欠けたままです。",
        ng: "UDP には再送や並べ替えの仕組みがありません。届いたものを届いた順にそのままアプリに渡すので、②は欠けたままになります。",
      },
    },
    {
      id: "udp",
      chapter: 4,
      phase: "request",
      where: { side: "server", layer: "transport" },
      proto: "udp",
      title: "UDP：確認しないぶん速い",
      description:
        "UDP ヘッダにはシーケンス番号がなく、ACK も返しません。そのため欠けや順番の乱れはそのままですが、確認を待たないぶん速く送れます。少しくらい欠けても、遅れるより止まらずに流れてほしい通信に向いています。",
      units: withParts(got13, HEADERS_TCP, true),
      focus: "tcp",
      protocolTable: true,
      photo: { caption: "UDPで受け取った画像", missing: 2 },
    },
    {
      chapter: 4,
      phase: "request",
      where: { side: "server", layer: "transport" },
      proto: "udp",
      stage: "sort",
      title: "TCPとUDPを仕分けよう",
      description:
        "6つの通信を、TCP と UDP のどちらが向いているかで仕分けてください。カードをタップしてから、入れたい箱をタップします。「少しくらい欠けても、遅れるより速いほうがいい？」がヒントです。",
      units: [],
      quiz: { kind: "sort" },
      photo: false,
      hideData: true,
    },

    // ---- 第5章 返事とまとめ ----
    {
      chapter: 5,
      phase: "response",
      where: { side: "server", layer: "link" },
      wire: { dir: "left", items: ["✉️"] },
      title: "「投稿できました」の返事を送る",
      description: `Web サーバは「201 Created（投稿できました）」という HTTP レスポンスを作り、今度は逆向きに送ります。返事は ${RESPONSE_BYTES} バイトと小さいので分割しません。TCP・IP・イーサネットのヘッダを付け、ルータをたどってスマホに届けます。送信元と宛先の IP アドレスが、行きとは入れ替わっています。`,
      units: withParts(reply, HEADERS_ALL),
      focus: "ip",
      photo: { caption: "Webサーバに保存された画像" },
    },
    {
      chapter: 5,
      phase: "response",
      where: { side: "client", layer: "app" },
      title: "「投稿しました」と表示",
      description:
        "スマホは行きと同じように、MAC アドレス → IP アドレス → ポート番号の順に確認してヘッダを外し、SNS アプリに HTTP レスポンス（201 Created）を渡します。画面に「投稿しました」と表示されて、画像のアップロードが完了です。",
      units: reply,
      focus: "data",
      photo: { caption: "Webサーバに保存された画像" },
    },
    {
      chapter: 5,
      phase: "response",
      where: { side: "client", layer: "app" },
      stage: "test",
      title: "まとめテスト",
      description:
        "ここまでの内容から5問です。全部答えたら「採点する」を押してください。間違えた問題は、説明のスライドに戻って確認できます。最後の結果画面をスクリーンショットして提出しましょう。",
      units: [],
      quiz: { kind: "test" },
      photo: false,
      hideData: true,
    },
  ];
}

export const STEPS = buildSteps();

export function stepIndexOf(id: string) {
  return STEPS.findIndex((s) => s.id === id);
}

export function senderOf(phase: Phase): Side {
  return phase === "request" ? "client" : "server";
}

export function headerRows(kind: PartKind, step: Step, unit: Unit): [string, string][] {
  const sender = senderOf(step.phase);
  const receiver: Side = sender === "client" ? "server" : "client";
  const src = HOST[sender];
  const dst = HOST[receiver];
  switch (kind) {
    case "eth": {
      if (step.where === "wire") {
        return [
          ["宛先MAC", "次のルータ"],
          ["送信元MAC", "前のルータ"],
        ];
      }
      const atReceiver = step.where.side === receiver;
      return atReceiver
        ? [
            ["宛先MAC", dst.mac],
            ["送信元MAC", `${GATEWAY[receiver].mac}（${GATEWAY[receiver].name}）`],
          ]
        : [
            ["宛先MAC", `${GATEWAY[sender].mac}（${GATEWAY[sender].name}）`],
            ["送信元MAC", src.mac],
          ];
    }
    case "ip":
      return [
        ["送信元IP", src.ip],
        ["宛先IP", dst.ip],
      ];
    case "tcp":
      return [
        ["送信元ポート", String(src.port)],
        ["宛先ポート", String(dst.port)],
        ["シーケンス番号", step.proto === "udp" ? "（UDPには無い）" : String(unit.seq)],
      ];
    case "data":
      return [
        [
          "内容",
          step.phase === "response"
            ? "HTTP/1.1 201 Created"
            : unit.no
              ? `画像の ${byteRange(unit)} バイト目`
              : "POST /upload ＋ 画像（photo.jpg）",
        ],
        ["大きさ", `${unit.bytes.toLocaleString()} バイト`],
      ];
    case "fcs":
      return [["誤り検出用の値", "（受信側で計算して照合）"]];
  }
}

// ---------- まとめテスト ----------

export const TEST_QUESTIONS: { question: string; options: string[]; answer: number; review: string }[] = [
  {
    question: "画像を小分けにして送ると、どんな良いことがある？",
    options: ["画像の画質が良くなる", "一部がなくなっても、その部分だけ送り直せばすむ", "IP アドレスがいらなくなる"],
    answer: 1,
    review: "split",
  },
  {
    question: "ルータが「次にどこへ渡すか」を決めるときに見るのは？",
    options: ["宛先 MAC アドレス", "宛先 IP アドレス", "宛先ポート番号"],
    answer: 1,
    review: "route",
  },
  {
    question: "途中のルータがとても混んでいるとき、パケットはどうなることがある？",
    options: ["捨てられてしまう", "自動で元の場所に戻る", "小さく圧縮される"],
    answer: 0,
    review: "lost",
  },
  {
    question: "TCP が「データが足りない」と気づけるのは、ヘッダの何を見るから？",
    options: ["MAC アドレス", "シーケンス番号", "FCS"],
    answer: 1,
    review: "missing",
  },
  {
    question: "ビデオ通話に向いているのは、TCP と UDP のどちら？",
    options: ["TCP", "UDP"],
    answer: 1,
    review: "udp",
  },
];

export const SORT_ITEMS: { label: string; answer: Proto }[] = [
  { label: "ビデオ通話", answer: "udp" },
  { label: "Webページを見る", answer: "tcp" },
  { label: "オンラインゲームの位置情報", answer: "udp" },
  { label: "メールを送る", answer: "tcp" },
  { label: "インターネット電話", answer: "udp" },
  { label: "ファイルのダウンロード", answer: "tcp" },
];
