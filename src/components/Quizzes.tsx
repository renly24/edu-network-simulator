import { type ReactNode, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import {
  GATEWAY,
  LAYER_BY_ID,
  NODE_NAME,
  ROUTE_TABLE,
  SORT_ITEMS,
  SPLIT,
  TEST_QUESTIONS,
  UDP_COLOR,
  byteRange,
  nextHopLabel,
  stepIndexOf,
  type ChoiceQuiz,
  type MapNode,
  type Proto,
  type RouterId,
} from "./model";
import { DestinationCard, NetworkMap, RouteTable } from "./NetworkMap";
import { PieceTag } from "./photo";

// ---------- 共通部品 ----------

function Feedback({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.25,
        borderLeft: 4,
        borderColor: ok ? "success.main" : "error.main",
        bgcolor: ok ? "#f1f8e9" : "#ffebee",
        display: "flex",
        gap: 1,
        alignItems: "flex-start",
      }}
    >
      {ok ? <CheckCircleIcon color="success" fontSize="small" sx={{ mt: 0.25 }} /> : <CancelIcon color="error" fontSize="small" sx={{ mt: 0.25 }} />}
      <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
        {children}
      </Typography>
    </Paper>
  );
}

function OptionButton({
  label,
  state,
  onClick,
  disabled,
}: {
  label: ReactNode;
  state?: "ok" | "ng" | "picked";
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      variant={state === "picked" ? "contained" : "outlined"}
      color={state === "ok" ? "success" : state === "ng" ? "error" : "primary"}
      onClick={onClick}
      disabled={disabled && !state}
      sx={{
        justifyContent: "flex-start",
        textAlign: "left",
        textTransform: "none",
        fontWeight: 700,
        borderWidth: 2,
        "&:hover": { borderWidth: 2 },
        bgcolor: state === "ok" ? "#e8f5e9" : state === "ng" ? "#ffebee" : undefined,
        pointerEvents: disabled ? "none" : undefined,
      }}
    >
      {label}
    </Button>
  );
}

// ---------- 選択問題（予想問題・確認問題） ----------

export function ChoiceQuizView({ quiz, value, onAnswer }: { quiz: ChoiceQuiz; value: number | undefined; onAnswer: (v: number) => void }) {
  const answered = value !== undefined;
  return (
    <Stack spacing={1}>
      <Typography fontWeight={700}>Q. {quiz.question}</Typography>
      <Stack spacing={0.75}>
        {quiz.options.map((o, i) => (
          <OptionButton
            key={o}
            label={o}
            disabled={answered}
            state={answered ? (i === quiz.answer ? "ok" : i === value ? "ng" : undefined) : undefined}
            onClick={() => onAnswer(i)}
          />
        ))}
      </Stack>
      {answered && <Feedback ok={value === quiz.answer}>{value === quiz.answer ? quiz.ok : quiz.ng}</Feedback>}
    </Stack>
  );
}

// ---------- 体験問題：あなたはルータ ----------

const ROUTER_PATH: RouterId[] = ["a", "b", "d"];

export function RouterQuiz() {
  const [hop, setHop] = useState(0);
  const [wrong, setWrong] = useState<MapNode[]>([]);
  const [passed, setPassed] = useState(false);

  const router = ROUTER_PATH[hop];
  const table = ROUTE_TABLE[router];
  const hit = table.findIndex(([net]) => net.startsWith("203.0.113."));
  const next = table[hit][1];
  const done = passed && hop === ROUTER_PATH.length - 1;
  const route: MapNode[] = ["s", ...ROUTER_PATH.slice(0, hop + 1), ...(passed ? [next] : [])];
  const lit = route.slice(1).map((n, i) => [route[i], n] as [MapNode, MapNode]);

  const advance = () => {
    setHop(hop + 1);
    setWrong([]);
    setPassed(false);
  };
  const reset = () => {
    setHop(0);
    setWrong([]);
    setPassed(false);
  };

  return (
    <Stack spacing={1.5}>
      <NetworkMap here={done ? "w" : router} parked={[{ label: "①", at: passed ? next : router }]} lit={lit} />
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "minmax(0, 1fr) minmax(0, 1fr)" }, gap: 1.5, alignItems: "start" }}>
        <Stack spacing={1}>
          <DestinationCard />
          <RouteTable router={router} hit={passed ? hit : undefined} />
        </Stack>
        <Stack spacing={1}>
          <Typography fontWeight={700}>Q. {NODE_NAME[router]}：次はどこへ渡す？</Typography>
          {table.map(([, to]) => (
            <OptionButton
              key={to}
              label={nextHopLabel(router, to)}
              disabled={passed}
              state={passed && to === next ? "ok" : wrong.includes(to) ? "ng" : undefined}
              onClick={() => (to === next ? setPassed(true) : setWrong([...wrong, to]))}
            />
          ))}
          {passed ? (
            <Feedback ok>
              {hop === 0 &&
                `宛先 203.0.113.20 は「203.0.113.0/24」の行に当てはまるので、ルータB に渡します。`}
              {hop === 1 && "ルータB も同じように経路表を見て、ルータD に渡します。ルータは「次の相手」だけを決めています。"}
              {hop === 2 && `${GATEWAY.server.name}には宛先のネットワークが直接つながっているので、Web サーバに届けます。到着！`}
            </Feedback>
          ) : (
            wrong.length > 0 && <Feedback ok={false}>宛先 IP アドレス 203.0.113.20 と、経路表の「宛先ネットワーク」の列を見比べてみよう。</Feedback>
          )}
          <Stack direction="row" spacing={1}>
            {passed && !done && (
              <Button variant="contained" onClick={advance}>
                次のルータへ
              </Button>
            )}
            {(hop > 0 || passed) && (
              <Button variant="outlined" onClick={reset}>
                最初から
              </Button>
            )}
          </Stack>
        </Stack>
      </Box>
    </Stack>
  );
}

// ---------- 体験問題：足りないデータを見つける ----------

export function MissingQuiz() {
  const [picked, setPicked] = useState<number[]>([]);
  const solved = picked.includes(1);
  return (
    <Stack spacing={1}>
      <Typography fontWeight={700}>Q. 届いていないのは、画像の何バイト目？</Typography>
      {SPLIT.map((u, i) => (
        <OptionButton
          key={u.seq}
          label={`${byteRange(u)} バイト目`}
          disabled={solved}
          state={solved && i === 1 ? "ok" : picked.includes(i) && i !== 1 ? "ng" : undefined}
          onClick={() => setPicked([...picked, i])}
        />
      ))}
      {solved ? (
        <Feedback ok>
          正解！ seq 1 から 1,460 バイト分が①なので、次は seq 1,461 から始まるはず。でも届いたのは seq 2,921 でした。間の 1,461〜2,920 バイト目（②）が足りません。
        </Feedback>
      ) : (
        picked.length > 0 && <Feedback ok={false}>そこは届いています。seq 1 から 1,460 バイト分が①です。その次は何バイト目から始まるはず？</Feedback>
      )}
    </Stack>
  );
}

// ---------- 体験問題：元の順番に並べ替える ----------

const ARRIVED_ORDER = [0, 2, 1];

export function ReorderQuiz() {
  const [placed, setPlaced] = useState<number[]>([]);
  const [miss, setMiss] = useState<number | null>(null);
  const done = placed.length === SPLIT.length;

  const pick = (i: number) => {
    if (placed.includes(i)) return;
    if (i !== placed.length) {
      setMiss(placed.length);
      return;
    }
    setPlaced([...placed, i]);
    setMiss(null);
  };

  return (
    <Stack spacing={1}>
      <Typography fontWeight={700}>Q. シーケンス番号の小さい順にタップしよう</Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 1 }}>
        <Stack spacing={0.75}>
          <Typography variant="caption" color="text.secondary">
            届いた順
          </Typography>
          {ARRIVED_ORDER.map((i) => (
            <Box
              key={i}
              component="button"
              type="button"
              onClick={() => pick(i)}
              disabled={placed.includes(i)}
              aria-label={`seq ${SPLIT[i].seq} の切れ端`}
              sx={{
                p: 0.5,
                border: "2px solid #cfd8dc",
                borderRadius: 1.5,
                bgcolor: "#fff",
                cursor: "pointer",
                opacity: placed.includes(i) ? 0.3 : 1,
                "&:hover": { borderColor: LAYER_BY_ID.transport.color },
                "&:disabled": { cursor: "default" },
              }}
            >
              <PieceTag unit={SPLIT[i]} />
            </Box>
          ))}
        </Stack>
        <Stack spacing={0.75}>
          <Typography variant="caption" color="text.secondary">
            元の順番
          </Typography>
          {SPLIT.map((u, slot) => (
            <Box key={u.seq} sx={{ p: 0.5, border: "2px dashed #cfd8dc", borderRadius: 1.5, minHeight: 36 }}>
              {placed[slot] !== undefined && <PieceTag unit={SPLIT[placed[slot]]} />}
            </Box>
          ))}
        </Stack>
      </Box>
      {done ? (
        <Feedback ok>並べ替えられました！ これで元の画像の順番どおりです。</Feedback>
      ) : (
        miss !== null && (
          <Feedback ok={false}>小さい順に並べよう。次は seq {SPLIT[miss].seq.toLocaleString()} の切れ端です。</Feedback>
        )
      )}
    </Stack>
  );
}

// ---------- 体験問題：TCP と UDP の仕分け ----------

export function SortQuiz() {
  const [box, setBox] = useState<Record<string, Proto | undefined>>({});
  const [picked, setPicked] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  const put = (proto: Proto) => {
    if (!picked) return;
    setBox({ ...box, [picked]: proto });
    setPicked(null);
    setChecked(false);
  };
  const placedCount = SORT_ITEMS.filter((i) => box[i.label]).length;
  const correct = SORT_ITEMS.filter((i) => box[i.label] === i.answer).length;

  const card = (label: string) => {
    const state = checked && box[label] ? (SORT_ITEMS.find((i) => i.label === label)!.answer === box[label] ? "ok" : "ng") : undefined;
    return (
      <Button
        key={label}
        size="small"
        variant={picked === label ? "contained" : "outlined"}
        color={state === "ok" ? "success" : state === "ng" ? "error" : "primary"}
        onClick={(e) => {
          e.stopPropagation();
          setPicked(picked === label ? null : label);
        }}
        sx={{ textTransform: "none", fontWeight: 700, borderWidth: 2, "&:hover": { borderWidth: 2 }, bgcolor: state === "ok" ? "#e8f5e9" : state === "ng" ? "#ffebee" : undefined }}
      >
        {state === "ok" ? "○ " : state === "ng" ? "× " : ""}
        {label}
      </Button>
    );
  };

  const bin = (proto: Proto, title: string, color: string) => (
    <Box
      role="button"
      tabIndex={0}
      onClick={() => put(proto)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          put(proto);
        }
      }}
      sx={{
        border: `2px dashed ${color}`,
        borderRadius: 2,
        p: 1,
        minHeight: 130,
        bgcolor: picked ? "#fffde7" : "#fafafa",
        cursor: picked ? "pointer" : "default",
        display: "flex",
        flexDirection: "column",
        gap: 0.75,
        alignItems: "flex-start",
      }}
    >
      <Typography fontWeight={700} sx={{ color }}>
        {title}
      </Typography>
      {SORT_ITEMS.filter((i) => box[i.label] === proto).map((i) => card(i.label))}
    </Box>
  );

  return (
    <Stack spacing={1.5}>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, minHeight: 40 }}>
        {SORT_ITEMS.filter((i) => !box[i.label]).map((i) => card(i.label))}
        {placedCount === SORT_ITEMS.length && (
          <Typography variant="body2" color="text.secondary">
            全部仕分けました。「答え合わせ」を押そう。
          </Typography>
        )}
      </Box>
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
        {bin("tcp", "TCP（正確さが大事）", LAYER_BY_ID.transport.color)}
        {bin("udp", "UDP（速さが大事）", UDP_COLOR)}
      </Box>
      <Stack direction="row" spacing={1}>
        <Button variant="contained" disabled={placedCount < SORT_ITEMS.length} onClick={() => setChecked(true)}>
          答え合わせ
        </Button>
        <Button
          variant="outlined"
          onClick={() => {
            setBox({});
            setPicked(null);
            setChecked(false);
          }}
        >
          やり直す
        </Button>
      </Stack>
      {checked && (
        <Feedback ok={correct === SORT_ITEMS.length}>
          {correct === SORT_ITEMS.length
            ? "全問正解！ 1バイトでも欠けると困るもの（Webページ・メール・ファイル）は TCP、少し欠けても止まらずに流れてほしいもの（通話・ゲーム）は UDP が向いています。"
            : `${correct} / ${SORT_ITEMS.length} 正解。赤いカードを選んで、もう一方の箱に入れ直してみよう。`}
        </Feedback>
      )}
    </Stack>
  );
}

// ---------- まとめテスト ----------

export interface TestState {
  answers: (number | undefined)[];
  graded: boolean;
  /** 結果画面をスクリーンショットで提出するときの名前 */
  name: string;
}

export function FinalTest({ state, onChange, onSeek }: { state: TestState; onChange: (s: TestState) => void; onSeek: (index: number) => void }) {
  const { answers, graded, name } = state;
  const allAnswered = TEST_QUESTIONS.every((_, i) => answers[i] !== undefined);
  const score = TEST_QUESTIONS.filter((q, i) => answers[i] === q.answer).length;

  if (graded) {
    return (
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Box sx={{ textAlign: "center", bgcolor: "#f5f7fa", borderRadius: 3, px: 3, py: 1.5 }}>
            <Typography variant="caption" color="text.secondary">
              あなたの得点
            </Typography>
            <Typography sx={{ fontSize: "2.6rem", fontWeight: 700, lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>
              {score} / {TEST_QUESTIONS.length}
            </Typography>
          </Box>
          <Stack spacing={1} sx={{ flex: 1, minWidth: 0 }}>
            <TextField
              id="test-name"
              size="small"
              placeholder="名前を入力（提出用）"
              slotProps={{ htmlInput: { "aria-label": "名前（提出用）" } }}
              value={name}
              onChange={(e) => onChange({ ...state, name: e.target.value })}
            />
            <Typography fontWeight={700}>
              {score === TEST_QUESTIONS.length ? "全問正解です！" : score >= 3 ? "よくできました。× の問題を見直そう。" : "説明のスライドに戻って確認しよう。"}
            </Typography>
          </Stack>
        </Stack>
        <Stack spacing={0.75}>
          {TEST_QUESTIONS.map((q, i) => {
            const ok = answers[i] === q.answer;
            const review = stepIndexOf(q.review);
            return (
              <Paper key={q.question} variant="outlined" sx={{ p: 1, display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                {ok ? <CheckCircleIcon color="success" fontSize="small" /> : <CancelIcon color="error" fontSize="small" />}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={700}>
                    {i + 1}. {q.question}
                  </Typography>
                  {!ok && (
                    <Typography variant="caption" color="text.secondary">
                      正解：{q.options[q.answer]}
                    </Typography>
                  )}
                </Box>
                {!ok && (
                  <Button size="small" onClick={() => onSeek(review)}>
                    スライド {review + 1} で確認
                  </Button>
                )}
              </Paper>
            );
          })}
        </Stack>
        <Box>
          <Button variant="outlined" onClick={() => onChange({ answers: [], graded: false, name })}>
            もう一度解く
          </Button>
        </Box>
      </Stack>
    );
  }

  return (
    <Stack spacing={1.5}>
      {TEST_QUESTIONS.map((q, i) => (
        <Box key={q.question}>
          <Typography variant="body2" fontWeight={700} mb={0.5}>
            {i + 1}. {q.question}
          </Typography>
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
            {q.options.map((o, j) => (
              <Button
                key={o}
                size="small"
                variant={answers[i] === j ? "contained" : "outlined"}
                onClick={() => {
                  const next = [...answers];
                  next[i] = j;
                  onChange({ ...state, answers: next, graded: false });
                }}
                sx={{ textTransform: "none", fontWeight: 700 }}
              >
                {o}
              </Button>
            ))}
          </Stack>
        </Box>
      ))}
      <Box>
        <Button variant="contained" disabled={!allAnswered} onClick={() => onChange({ ...state, graded: true })}>
          採点する
        </Button>
      </Box>
    </Stack>
  );
}

// ---------- TCP と UDP の比較表 ----------

export function ProtocolTable() {
  const rows: [string, string, string][] = [
    ["届いたかの確認（ACK）", "する", "しない"],
    ["足りない分の再送", "する", "しない"],
    ["順番の並べ替え", "する（シーケンス番号）", "しない"],
    ["速さ", "確認の分だけ遅い", "速い"],
    ["向いている通信", "Web・メール・ファイル", "通話・ゲーム"],
  ];
  const cell = { border: "1px solid #cfd8dc", px: 1, py: 0.5, fontSize: "0.8rem", textAlign: "left" as const };
  return (
    <Box component="table" sx={{ borderCollapse: "collapse", width: "100%", mt: 1 }}>
      <thead>
        <tr>
          <Box component="th" sx={{ ...cell, bgcolor: "#eceff1" }} />
          <Box component="th" sx={{ ...cell, bgcolor: LAYER_BY_ID.transport.color, color: "#fff" }}>
            TCP
          </Box>
          <Box component="th" sx={{ ...cell, bgcolor: UDP_COLOR, color: "#fff" }}>
            UDP
          </Box>
        </tr>
      </thead>
      <tbody>
        {rows.map(([k, t, u]) => (
          <tr key={k}>
            <Box component="th" sx={{ ...cell, bgcolor: "#f5f7fa", fontWeight: 700 }}>
              {k}
            </Box>
            <Box component="td" sx={cell}>
              {t}
            </Box>
            <Box component="td" sx={cell}>
              {u}
            </Box>
          </tr>
        ))}
      </tbody>
    </Box>
  );
}
