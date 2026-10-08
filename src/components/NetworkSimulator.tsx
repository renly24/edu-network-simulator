"use client";
import { type MouseEvent, useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { keyframes } from "@mui/material/styles";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import ReplayIcon from "@mui/icons-material/Replay";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import {
  CHAPTERS,
  HOST,
  IMAGE_BYTES,
  LAYERS,
  LAYER_BY_ID,
  QUIZ_COLOR,
  SPLIT,
  STEPS,
  UDP_COLOR,
  headerRows,
  partStyle,
  partTitle,
  quizLabel,
  senderOf,
  type Layer,
  type PartKind,
  type Phase,
  type Proto,
  type Side,
  type Step,
  type Unit,
} from "./model";
import { NetworkMap, RouteTable } from "./NetworkMap";
import { CIRCLED, MissingPiece, PhotoPiece, photoSlice, sliceOf } from "./photo";
import { ChoiceQuizView, FinalTest, MissingQuiz, ProtocolTable, ReorderQuiz, RouterQuiz, SortQuiz, type TestState } from "./Quizzes";

// ---------- 写真 ----------

function PhotoView({ step }: { step: Step }) {
  if (step.photo === false) return null;
  const pieces = step.units.filter((u) => u.no !== null);
  const missing = step.photo?.missing;
  const done = step.phase === "response";
  const caption = step.photo?.caption ?? (pieces.length === 0 ? "投稿する画像（photo.jpg）" : "切り分けた画像");

  // 欠けている切れ端は、本来の位置に「届いていない」として表示する
  const shown: { unit: Unit; missing: boolean }[] = pieces.map((u) => ({ unit: u, missing: false }));
  if (missing) {
    const at = shown.findIndex((p) => p.unit.no! > missing);
    shown.splice(at === -1 ? shown.length : at, 0, { unit: SPLIT[missing - 1], missing: true });
  }

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
        📷 {caption}
      </Typography>
      <Box sx={{ width: "100%", maxWidth: 170, position: "relative" }}>
        {pieces.length === 0 ? (
          <Box sx={{ aspectRatio: "3 / 2", borderRadius: 1.5, boxShadow: 2, ...photoSlice(0, 1) }} />
        ) : (
          <Stack spacing={0.5}>
            {shown.map((p) => (p.missing ? <MissingPiece key={`m${p.unit.no}`} unit={p.unit} /> : <PhotoPiece key={p.unit.no} unit={p.unit} />))}
          </Stack>
        )}
        {done && (
          <Chip icon={<CheckCircleIcon />} label="保存済み" color="success" size="small" sx={{ position: "absolute", top: 8, left: 8 }} />
        )}
      </Box>
    </Box>
  );
}

// ---------- 層の図 ----------

function LayerStack({ side, step }: { side: Side; step: Step }) {
  const host = HOST[side];
  const active = step.where !== "wire" && step.where.side === side ? step.where.layer : null;
  const sending = (step.phase === "request") === (side === "client");
  const proto: Proto = step.proto ?? "tcp";

  return (
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography textAlign="center" fontWeight={700} mb={0.5} sx={{ fontSize: { xs: "0.85rem", sm: "1rem" } }}>
        {host.icon} {host.name}
      </Typography>
      <Typography textAlign="center" variant="caption" color="text.secondary" display="block" mb={0.75}>
        {sending ? "送信 ⬇ ヘッダを付ける" : "受信 ⬆ ヘッダを外す"}
      </Typography>
      <Box
        sx={{
          mb: 1,
          px: 1,
          py: 0.5,
          borderRadius: 1.5,
          bgcolor: "#eceff1",
          border: "2px solid #90a4ae",
        }}
      >
        <Typography sx={{ fontSize: { xs: "0.62rem", sm: "0.72rem" }, fontWeight: 700, color: "#455a64", mb: 0.25 }}>
          🪪 自分のアドレス
        </Typography>
        {(
          [
            ["transport", "ポート", String(host.port)],
            ["internet", "IP", host.ip],
            ["link", "MAC", host.mac],
          ] as [Layer, string, string][]
        ).map(([layer, label, value]) => {
          const color = LAYER_BY_ID[layer].color;
          const lit = active === layer;
          return (
            <Stack
              key={layer}
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", sm: "center" }}
              columnGap={0.5}
              sx={{
                borderRadius: 1,
                px: 0.5,
                bgcolor: lit ? "#fff59d" : "transparent",
                outline: lit ? `2px solid ${color}` : "none",
                transition: "all 0.3s",
              }}
            >
              <Typography sx={{ fontSize: { xs: "0.6rem", sm: "0.72rem" }, fontWeight: 700, color }}>
                {label}
                {lit && (
                  <Box component="span" sx={{ ml: 0.5, color: "text.secondary", fontWeight: 600 }}>
                    {sending ? "→ ヘッダに記入" : "← ヘッダと照合"}
                  </Box>
                )}
              </Typography>
              <Typography sx={{ fontSize: { xs: "0.62rem", sm: "0.75rem" }, fontWeight: 600, fontFamily: "monospace", whiteSpace: "nowrap" }}>
                {value}
              </Typography>
            </Stack>
          );
        })}
      </Box>
      <Stack spacing={0.75}>
        {LAYERS.map((layer) => {
          const isActive = active === layer.id;
          const isUdp = layer.id === "transport" && proto === "udp";
          const color = isUdp ? UDP_COLOR : layer.color;
          return (
            <Box
              key={layer.id}
              sx={{
                border: 2,
                borderColor: color,
                borderRadius: 2,
                px: 1,
                py: 0.4,
                bgcolor: isActive ? color : "background.paper",
                color: isActive ? "#fff" : "text.primary",
                boxShadow: isActive ? 4 : 0,
                transform: isActive ? "scale(1.04)" : "none",
                transition: "all 0.3s",
              }}
            >
              <Typography variant="body2" fontWeight={700} sx={{ fontSize: { xs: "0.7rem", sm: "0.82rem" } }}>
                {layer.name}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.85, fontSize: { xs: "0.62rem", sm: "0.7rem" } }}>
                {isUdp ? "UDP" : layer.protocol}・{layer.osi}
              </Typography>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}

const travelRight = keyframes`
  from { left: 0%; opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  to { left: calc(100% - 36px); opacity: 0; }
`;
const travelLeft = keyframes`
  from { left: calc(100% - 36px); opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  to { left: 0%; opacity: 0; }
`;

function Wire({ step, stepIndex }: { step: Step; stepIndex: number }) {
  const wire = step.wire;
  const toRight = wire ? wire.dir === "right" : step.phase === "request";
  const active = Boolean(wire);
  const color = LAYER_BY_ID.link.color;
  return (
    <Box sx={{ width: { xs: 52, sm: 96 }, flexShrink: 0, display: "flex", flexDirection: "column", justifyContent: "flex-end", pb: 1 }}>
      <Typography variant="caption" textAlign="center" color="text.secondary" mb={0.5}>
        ネットワーク
      </Typography>
      <Box sx={{ position: "relative", height: 36 }}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: 0,
            right: 0,
            height: 4,
            mt: "-2px",
            borderRadius: 2,
            bgcolor: active ? color : "grey.400",
          }}
        />
        {wire?.items.map((label, i) => (
          <Box
            key={`${stepIndex}-${i}`}
            sx={{
              position: "absolute",
              top: 4,
              minWidth: 28,
              height: 28,
              px: 0.5,
              borderRadius: 1,
              bgcolor: color,
              color: "#fff",
              fontSize: "0.75rem",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: 0,
              animation: `${toRight ? travelRight : travelLeft} 1.6s ease-in-out ${i * 0.7}s infinite`,
            }}
          >
            {label}
          </Box>
        ))}
      </Box>
      <Typography variant="caption" textAlign="center" fontSize="1.2rem" color={active ? color : "grey.400"}>
        {toRight ? "➡" : "⬅"}
      </Typography>
    </Box>
  );
}

function UnitBar({ unit, phase, proto, selected, onSelect }: { unit: Unit; phase: Phase; proto: Proto; selected: boolean; onSelect: () => void }) {
  const isImage = phase === "request";
  const dataWidth = Math.max(18, (unit.bytes / IMAGE_BYTES) * 100);
  const { a, b } = sliceOf(unit);
  return (
    <Box
      onClick={onSelect}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        p: 0.5,
        borderRadius: 2,
        cursor: "pointer",
        outline: selected ? 2 : 0,
        outlineColor: "primary.main",
        bgcolor: selected ? "action.selected" : "transparent",
        "&:hover": { bgcolor: "action.hover" },
      }}
    >
      <Typography sx={{ width: 28, textAlign: "center", fontWeight: 700 }}>
        {unit.no ? CIRCLED[unit.no - 1] : isImage ? "🖼️" : "✉️"}
      </Typography>
      <Box sx={{ display: "flex", flex: 1, minWidth: 0, height: 30 }}>
        {unit.parts.map((p) => {
          const st = partStyle(p, proto);
          const isData = p === "data";
          return (
            <Box
              key={p}
              sx={{
                bgcolor: st.color,
                color: "#fff",
                flex: isData ? `0 1 ${dataWidth}%` : "0 0 auto",
                minWidth: isData ? 84 : 40,
                px: 0.75,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.75rem",
                fontWeight: 700,
                borderRight: "2px solid #fff",
                whiteSpace: "nowrap",
                overflow: "hidden",
                ...(isData && isImage ? photoSlice(a, b) : {}),
              }}
            >
              <Box
                component="span"
                sx={isData && isImage ? { bgcolor: "rgba(0,0,0,0.55)", px: 0.75, borderRadius: 0.5 } : undefined}
              >
                {isData ? `${isImage ? "画像" : "返事"} ${unit.bytes.toLocaleString()}B` : st.label}
              </Box>
            </Box>
          );
        })}
      </Box>
      {unit.checked && <CheckCircleIcon color="success" fontSize="small" />}
    </Box>
  );
}

function CompareBox({ compare }: { compare: NonNullable<Step["compare"]> }) {
  const box = (icon: string, title: string, value: string, bg: string, border: string) => (
    <Box sx={{ flex: 1, minWidth: 0, px: 1, py: 0.5, borderRadius: 1.5, bgcolor: bg, border }}>
      <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: "text.secondary" }}>
        {icon} {title}
      </Typography>
      <Typography sx={{ fontFamily: "monospace", fontWeight: 700, fontSize: { xs: "0.8rem", sm: "0.9rem" }, overflowWrap: "anywhere" }}>
        {value}
      </Typography>
    </Box>
  );
  return (
    <Paper variant="outlined" sx={{ mt: 1, p: 1, borderColor: "success.main" }}>
      <Stack direction="row" spacing={1} alignItems="center">
        {box("✉️", `ヘッダに書かれた宛先${compare.label}`, compare.header, "#fff", "2px solid #bdbdbd")}
        <Typography fontWeight={700} fontSize="1.4rem" color="success.main">
          ＝
        </Typography>
        {box("🪪", `自分の${compare.label}`, compare.mine, "#eceff1", "2px solid #90a4ae")}
      </Stack>
      <Stack direction="row" spacing={1} alignItems="center" mt={0.75}>
        <CheckCircleIcon color="success" fontSize="small" />
        <Typography variant="body2" fontWeight={700}>
          一致 → {compare.result}
        </Typography>
      </Stack>
    </Paper>
  );
}

/** 各ステップで高さが変わりにくいよう、層の図のステップに合わせた最小の高さ（px） */
const TOP_MIN_MD = 545;
const TOP_MIN_LG = 455;
const DATA_MIN_XS = 632;
const DATA_MIN_MD = 320;
const DATA_MIN_LG = 280;

const MAX_UNITS = Math.max(...STEPS.map((s) => s.units.length));
const DETAIL_KINDS: PartKind[] = ["eth", "ip", "tcp", "data"];

const chapterOf = (step: Step) => CHAPTERS.find((c) => c.id === step.chapter)!;

// ---------- スライド送り（操作バー） ----------

const slideFromRight = keyframes`
  from { opacity: 0; transform: translateX(40px); }
  to   { opacity: 1; transform: translateX(0); }
`;
const slideFromLeft = keyframes`
  from { opacity: 0; transform: translateX(-40px); }
  to   { opacity: 1; transform: translateX(0); }
`;

interface SlideNavProps {
  index: number;
  canNext: boolean;
  /** スライドのクリックで次へ進めるか（問題のスライドでは進まない） */
  clickable: boolean;
  onSeek: (index: number) => void;
}

function SlideNav({ index, canNext, clickable, onSeek }: SlideNavProps) {
  const isFirst = index === 0;
  const isLast = index === STEPS.length - 1;
  const navButtonSx = { minWidth: 0, px: { xs: 1.5, sm: 2.5 }, py: 1, fontWeight: 700, borderRadius: 2, whiteSpace: "nowrap" };

  return (
    <Paper
      elevation={6}
      sx={{
        position: "sticky",
        bottom: { xs: 8, sm: 12 },
        zIndex: 10,
        borderRadius: 3,
        px: { xs: 1, sm: 2 },
        py: 1,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1}>
        <Button
          variant="outlined"
          onClick={() => onSeek(index - 1)}
          disabled={isFirst}
          startIcon={<NavigateBeforeIcon />}
          title="前のスライド（←キー）"
          sx={navButtonSx}
        >
          前へ
        </Button>

        <Stack flex={1} minWidth={0} alignItems="center" spacing={0.5}>
          {/* スライド一覧（クリックでそのスライドへ）。四角は問題のスライド */}
          <Stack direction="row" alignItems="center" justifyContent="center" sx={{ display: { xs: "none", sm: "flex" }, gap: 0.6 }}>
            {STEPS.map((s, i) => {
              const color = chapterOf(s).color;
              const current = i === index;
              const quiz = quizLabel(s.quiz);
              const newChapter = i > 0 && STEPS[i - 1].chapter !== s.chapter;
              return (
                <Box
                  key={i}
                  component="button"
                  type="button"
                  aria-label={`スライド ${i + 1}：${quiz ? `${quiz}・` : ""}${s.title}`}
                  aria-current={current ? "step" : undefined}
                  title={`${i + 1}. ${quiz ? `【${quiz}】` : ""}${s.title}`}
                  onClick={() => onSeek(i)}
                  sx={{
                    p: 0,
                    border: 0,
                    cursor: "pointer",
                    width: current ? 22 : 10,
                    height: 10,
                    borderRadius: quiz ? "2px" : 5,
                    bgcolor: color,
                    opacity: current ? 1 : i < index ? 0.55 : 0.22,
                    transition: "width 0.2s, opacity 0.2s",
                    ml: newChapter ? 1.25 : 0,
                    "&:hover": { opacity: current ? 1 : 0.8 },
                  }}
                />
              );
            })}
          </Stack>
          <Typography variant="caption" color={canNext ? "text.secondary" : "error"} sx={{ fontVariantNumeric: "tabular-nums", lineHeight: 1.2, textAlign: "center", fontWeight: canNext ? 400 : 700 }}>
            スライド {index + 1} / {STEPS.length}
            {!canNext ? (
              <>
                　·　
                <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
                  問題に
                </Box>
                答えると次へ進めます
              </>
            ) : (
              clickable && (
                <Box component="span" sx={{ display: { xs: "none", md: "inline" } }}>
                  　·　画面をクリックしても次へ進みます
                </Box>
              )
            )}
          </Typography>
        </Stack>

        {isLast ? (
          <Button variant="contained" onClick={() => onSeek(0)} startIcon={<ReplayIcon />} sx={navButtonSx}>
            最初から
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={() => onSeek(index + 1)}
            disabled={!canNext}
            endIcon={<NavigateNextIcon />}
            title="次のスライド（→キー）"
            sx={navButtonSx}
          >
            次へ
          </Button>
        )}
      </Stack>
    </Paper>
  );
}

// ---------- 本体 ----------

export default function NetworkSimulator() {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  /** 選択問題の答え（スライド番号 → 選んだ選択肢） */
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [test, setTest] = useState<TestState>({ answers: [], graded: false, name: "" });

  const step = STEPS[index];
  const unit = step.units[Math.min(selected, step.units.length - 1)];
  const proto: Proto = step.proto ?? "tcp";
  const chapter = chapterOf(step);
  const label = quizLabel(step.quiz);
  const stage = step.stage ?? "layers";
  const canNext = !(step.quiz?.kind === "choice" && step.quiz.gate && answers[index] === undefined);

  const go = (next: number) => {
    const clamped = Math.max(0, Math.min(STEPS.length - 1, next));
    if (clamped === index) return;
    // 予想問題は答えるまで先へ進めない
    if (clamped > index && !canNext) return;
    setDirection(clamped > index ? 1 : -1);
    setIndex(clamped);
    setSelected(0);
  };

  // パワーポイントと同じキー操作でスライドを送る
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea")) return;
      const onButton = e.target instanceof HTMLElement && e.target.closest("button, [role=button]");
      let next: number;
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === "PageDown") next = index + 1;
      else if ((e.key === " " || e.key === "Enter") && !onButton) next = index + 1;
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "PageUp" || e.key === "Backspace") next = index - 1;
      else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = STEPS.length - 1;
      else return;
      e.preventDefault();
      go(next);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // スライド部分をクリック・タップすると次へ（問題のスライドと、ボタンなど操作できる部品は除く）
  const advanceOnClick = (e: MouseEvent) => {
    if (step.quiz) return;
    if (e.target instanceof HTMLElement && e.target.closest("button, a, input, [role=button]")) return;
    if (window.getSelection()?.toString()) return;
    go(index + 1);
  };

  const location =
    step.where === "wire"
      ? "ネットワーク（ルータ）"
      : `${HOST[step.where.side].short}・${step.where.layer === "transport" && proto === "udp" ? "トランスポート層（UDP）" : LAYER_BY_ID[step.where.layer].name}`;
  const receiving = step.where !== "wire" && step.where.side !== senderOf(step.phase);

  return (
    <Stack spacing={2}>
      {/* 全体図と説明（横並び）＝ 1枚のスライド */}
      <Box
        key={index}
        onClick={advanceOnClick}
        sx={{
          cursor: step.quiz || index === STEPS.length - 1 ? "default" : "pointer",
          animation: `${direction === 1 ? slideFromRight : slideFromLeft} 0.35s ease-out`,
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1.15fr) minmax(0, 1fr)" },
          gap: 2,
          alignItems: "stretch",
          // ステップごとに高さが変わって下のカードが動かないよう、最も長いステップに合わせる
          minHeight: { md: TOP_MIN_MD, lg: TOP_MIN_LG },
        }}
      >
        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            {/* 章の目次 */}
            <Stack direction="row" spacing={0.75} mb={2} justifyContent="center" flexWrap="wrap" useFlexGap>
              {CHAPTERS.map((c) => {
                const on = c.id === step.chapter;
                return (
                  <Chip
                    key={c.id}
                    size="small"
                    label={`${c.id}. ${c.name}`}
                    sx={{
                      fontWeight: 700,
                      bgcolor: on ? c.color : "transparent",
                      color: on ? "#fff" : "text.secondary",
                      border: `1px solid ${on ? c.color : "#cfd8dc"}`,
                    }}
                  />
                );
              })}
            </Stack>

            {stage === "layers" && (
              <Box sx={{ display: "flex", alignItems: "stretch", gap: { xs: 0.5, sm: 1 } }}>
                <LayerStack side="client" step={step} />
                <Wire step={step} stepIndex={index} />
                <LayerStack side="server" step={step} />
              </Box>
            )}
            {stage === "map" && step.map && (
              <Stack spacing={1.5}>
                <NetworkMap {...step.map} lit={step.map.parked?.some((p) => p.at === "a") ? [["s", "a"]] : []} />
                {step.map.table && <RouteTable router={step.map.table.router} hit={step.map.table.hit} />}
              </Stack>
            )}
            {stage === "router" && <RouterQuiz />}
            {stage === "sort" && <SortQuiz />}
            {stage === "test" && <FinalTest state={test} onChange={setTest} onSeek={go} />}
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 3, display: "flex", flexDirection: "column" }}>
          <CardContent sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <Stack direction="row" spacing={1} alignItems="center" mb={0.5} flexWrap="wrap" useFlexGap>
              {label && (
                <Chip
                  size="small"
                  label={label}
                  sx={{ fontWeight: 700, color: QUIZ_COLOR[label], border: `2px solid ${QUIZ_COLOR[label]}`, bgcolor: "transparent" }}
                />
              )}
              <Typography variant="caption" color="text.secondary">
                第{chapter.id}章　|　{location}
              </Typography>
            </Stack>
            <Typography variant="h6" fontWeight={700} mb={0.5} sx={{ fontSize: "1.1rem" }}>
              {step.title}
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems="flex-start">
              <Typography variant="body2" sx={{ lineHeight: 1.7, fontSize: "0.92rem", flex: 1, minWidth: 0 }}>
                {step.description}
              </Typography>
              {step.photo !== false && (
                <Box sx={{ width: { xs: 150, sm: 150 }, flexShrink: 0 }}>
                  <PhotoView step={step} />
                </Box>
              )}
            </Stack>
            {step.compare && <CompareBox compare={step.compare} />}
            {step.checks && (
              <Paper variant="outlined" sx={{ mt: 1, p: 1, borderColor: "success.main", bgcolor: "#f1f8e9" }}>
                {step.checks.map((c) => (
                  <Stack key={c} direction="row" spacing={1} alignItems="center" py={0.25}>
                    <CheckCircleIcon color="success" fontSize="small" />
                    <Typography variant="body2" fontWeight={600}>
                      {c}
                    </Typography>
                  </Stack>
                ))}
              </Paper>
            )}
            {step.protocolTable && <ProtocolTable />}
            {step.quiz && ["choice", "missing", "reorder"].includes(step.quiz.kind) && (
              <Paper variant="outlined" sx={{ mt: 1.5, p: 1.5, borderWidth: 2, borderColor: QUIZ_COLOR[label!] }}>
                {step.quiz.kind === "choice" && (
                  <ChoiceQuizView quiz={step.quiz} value={answers[index]} onAnswer={(v) => setAnswers({ ...answers, [index]: v })} />
                )}
                {step.quiz.kind === "missing" && <MissingQuiz />}
                {step.quiz.kind === "reorder" && <ReorderQuiz />}
              </Paper>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* データの中身（高さ固定） */}
      {!step.hideData && (
        <Card sx={{ borderRadius: 3, minHeight: { xs: DATA_MIN_XS, md: DATA_MIN_MD, lg: DATA_MIN_LG } }}>
          <CardContent>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1.15fr) minmax(0, 1fr)" },
                gap: 2,
              }}
            >
              <Box>
                <Typography fontWeight={700}>
                  📦 いまのデータ（{step.units.length > 1 ? `${step.units.length}個` : "1個"}）
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                  クリックすると、そのデータのヘッダの中身を表示します
                </Typography>
                <Stack spacing={0.5}>
                  {step.units.map((u, i) => (
                    <UnitBar key={`${index}-${i}`} unit={u} phase={step.phase} proto={proto} selected={u === unit} onSelect={() => setSelected(i)} />
                  ))}
                  {/* 行数が変わっても高さが変わらないよう、空き行を確保する */}
                  {Array.from({ length: MAX_UNITS - step.units.length }, (_, i) => (
                    <Box key={`blank-${i}`} sx={{ height: 38 }} />
                  ))}
                </Stack>

                <Stack direction="row" spacing={1} mt={1.5} flexWrap="wrap" useFlexGap>
                  {(["eth", "ip", "tcp", "data"] as PartKind[]).map((p) => (
                    <Stack key={p} direction="row" spacing={0.5} alignItems="center">
                      <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: partStyle(p, proto).color }} />
                      <Typography variant="caption">{p === "eth" ? "イーサネットヘッダ / FCS" : partTitle(p, proto)}</Typography>
                    </Stack>
                  ))}
                </Stack>
              </Box>

              <Box>
                <Typography fontWeight={700}>✉️ ヘッダに書かれている内容</Typography>
                <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                  選んだデータに付いているヘッダです（上の「🪪 自分のアドレス」とは別のものです）
                </Typography>
                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
                  {DETAIL_KINDS.map((kind) => {
                    const present = unit.parts.includes(kind);
                    const focused = present && step.focus === kind;
                    const color = partStyle(kind, proto).color;
                    return (
                      <Paper
                        key={kind}
                        variant="outlined"
                        sx={{
                          px: 1,
                          py: 0.75,
                          borderWidth: focused ? 3 : 1,
                          borderColor: focused ? color : "divider",
                          borderStyle: present ? "solid" : "dashed",
                          boxShadow: focused ? 3 : 0,
                          opacity: present ? 1 : 0.45,
                        }}
                      >
                        <Typography variant="body2" fontWeight={700} sx={{ color, fontSize: "0.82rem" }} mb={0.25}>
                          {partTitle(kind, proto)}
                          {focused && " ← 注目"}
                          {!present && (
                            <Box component="span" sx={{ color: "text.secondary", fontWeight: 600 }}>
                              {receiving ? "（外した）" : "（まだ付いていない）"}
                            </Box>
                          )}
                        </Typography>
                        {headerRows(kind, step, unit).map(([k, v]) => (
                          <Stack
                            key={k}
                            direction={{ xs: "column", sm: "row" }}
                            justifyContent="space-between"
                            alignItems={{ xs: "flex-start", sm: "baseline" }}
                            columnGap={1}
                          >
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: "0.7rem", sm: "0.8rem" }, whiteSpace: "nowrap" }}>
                              {k}
                            </Typography>
                            <Typography variant="body2" fontWeight={600} sx={{ fontFamily: "monospace", fontSize: { xs: "0.72rem", sm: "0.8rem" }, textAlign: { sm: "right" }, overflowWrap: "anywhere" }}>
                              {present ? v : "—"}
                            </Typography>
                          </Stack>
                        ))}
                      </Paper>
                    );
                  })}
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      <SlideNav index={index} canNext={canNext} clickable={!step.quiz} onSeek={go} />
    </Stack>
  );
}
