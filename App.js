import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  PanResponder,
  Dimensions,
  StatusBar,
} from 'react-native';
import Svg, {
  Rect,
  Circle,
  Line,
  G,
  Text as SvgText,
  Defs,
  RadialGradient,
  Stop,
  Polygon,
} from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Dimensões proporcionais da mesa vertical (estilo Arcade Side Pocket)
const TABLE_W = Math.min(SCREEN_WIDTH - 76, 310);
const TABLE_H = TABLE_W * 1.88;
const RAIL = 22;
const PLAY_X = RAIL;
const PLAY_Y = RAIL;
const PLAY_W = TABLE_W - RAIL * 2;
const PLAY_H = TABLE_H - RAIL * 2;
const BALL_R = Math.max(9.5, TABLE_W * 0.036);
const POCKET_R = BALL_R * 1.75;

const POCKETS = [
  { x: PLAY_X + 3, y: PLAY_Y + 3 },
  { x: PLAY_X + PLAY_W - 3, y: PLAY_Y + 3 },
  { x: PLAY_X - 2, y: PLAY_Y + PLAY_H / 2 },
  { x: PLAY_X + PLAY_W + 2, y: PLAY_Y + PLAY_H / 2 },
  { x: PLAY_X + 3, y: PLAY_Y + PLAY_H - 3 },
  { x: PLAY_X + PLAY_W - 3, y: PLAY_Y + PLAY_H - 3 },
];

const BALL_COLORS = {
  0: '#F8FAFC',
  1: '#FACC15',
  2: '#2563EB',
  3: '#DC2626',
  4: '#7C3AED',
  5: '#F97316',
  6: '#16A34A',
  7: '#991B1B',
  8: '#1E293B',
  9: '#EAB308',
};

const POCKET_STAGES = [
  {
    name: 'STAGE 1 - CITY',
    targetScore: 1500,
    shots: 10,
    cue: { x: 0.5, y: 0.78 },
    balls: [
      { id: 1, x: 0.5, y: 0.32 },
      { id: 2, x: 0.44, y: 0.27 },
      { id: 3, x: 0.56, y: 0.27 },
      { id: 4, x: 0.38, y: 0.22 },
      { id: 8, x: 0.5, y: 0.22 },
      { id: 5, x: 0.62, y: 0.22 },
    ],
    star: { x: 0.5, y: 0.52 },
  },
  {
    name: 'STAGE 2 - METRO',
    targetScore: 2800,
    shots: 11,
    cue: { x: 0.5, y: 0.8 },
    balls: [
      { id: 1, x: 0.5, y: 0.35 },
      { id: 2, x: 0.43, y: 0.3 },
      { id: 3, x: 0.57, y: 0.3 },
      { id: 4, x: 0.36, y: 0.25 },
      { id: 9, x: 0.5, y: 0.25 },
      { id: 5, x: 0.64, y: 0.25 },
      { id: 6, x: 0.43, y: 0.2 },
      { id: 7, x: 0.57, y: 0.2 },
      { id: 8, x: 0.5, y: 0.15 },
    ],
    star: { x: 0.25, y: 0.5 },
  },
  {
    name: 'STAGE 3 - LAS VEGAS',
    targetScore: 4200,
    shots: 12,
    cue: { x: 0.35, y: 0.82 },
    balls: [
      { id: 1, x: 0.25, y: 0.22 },
      { id: 2, x: 0.75, y: 0.22 },
      { id: 3, x: 0.5, y: 0.32 },
      { id: 4, x: 0.35, y: 0.42 },
      { id: 5, x: 0.65, y: 0.42 },
      { id: 6, x: 0.25, y: 0.58 },
      { id: 7, x: 0.75, y: 0.58 },
      { id: 8, x: 0.5, y: 0.2 },
      { id: 9, x: 0.5, y: 0.48 },
    ],
    star: { x: 0.75, y: 0.35 },
  },
];

const TRICK_STAGES = [
  {
    name: 'TRICK 1 - DOUBLE CORNER',
    hint: 'Acerte no meio das duas bolas em 1 tacada!',
    shots: 1,
    cue: { x: 0.5, y: 0.76 },
    balls: [
      { id: 1, x: 0.43, y: 0.34 },
      { id: 2, x: 0.57, y: 0.34 },
    ],
    star: { x: 0.5, y: 0.52 },
  },
  {
    name: 'TRICK 2 - CROSS POCKET',
    hint: 'Use a força máxima para espalhar para as caçapas!',
    shots: 1,
    cue: { x: 0.5, y: 0.72 },
    balls: [
      { id: 3, x: 0.22, y: 0.48 },
      { id: 4, x: 0.78, y: 0.48 },
      { id: 9, x: 0.5, y: 0.38 },
    ],
    star: null,
  },
];

export default function App() {
  const [gameMode, setGameMode] = useState('menu'); // 'menu' | 'pocket' | 'trick'
  const [stageIndex, setStageIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [shotsLeft, setShotsLeft] = useState(10);
  const [combo, setCombo] = useState(1);
  const [aimAngle, setAimAngle] = useState(-Math.PI / 2);
  const [pullPower, setPullPower] = useState(0);
  const [spin, setSpin] = useState({ x: 0, y: 0 });
  const [isMoving, setIsMoving] = useState(false);
  const [bannerMsg, setBannerMsg] = useState('');
  const [stageResult, setStageResult] = useState(null); // null | 'win' | 'lose'
  const [, setTick] = useState(0);

  const ballsRef = useRef([]);
  const starRef = useRef(null);
  const isMovingRef = useRef(false);
  const pottedThisTurnRef = useRef([]);
  const cuePottedRef = useRef(false);
  const starHitRef = useRef(false);
  const spinRef = useRef({ x: 0, y: 0 });
  const scoreRef = useRef(0);
  const shotsRef = useRef(10);
  const comboRef = useRef(1);
  const stageIdxRef = useRef(0);
  const modeRef = useRef('pocket');

  const showBanner = (text) => {
    setBannerMsg(text);
    setTimeout(() => {
      setBannerMsg((prev) => (prev === text ? '' : prev));
    }, 2000);
  };

  const loadStage = (mode, idx) => {
    const list = mode === 'trick' ? TRICK_STAGES : POCKET_STAGES;
    const safeIdx = idx % list.length;
    const st = list[safeIdx];

    modeRef.current = mode;
    stageIdxRef.current = safeIdx;
    setGameMode(mode);
    setStageIndex(safeIdx);
    setStageResult(null);

    if (idx === 0) {
      scoreRef.current = 0;
      setScore(0);
    }

    shotsRef.current = st.shots;
    setShotsLeft(st.shots);
    comboRef.current = 1;
    setCombo(1);
    setAimAngle(-Math.PI / 2);
    setPullPower(0);
    spinRef.current = { x: 0, y: 0 };
    setSpin({ x: 0, y: 0 });

    const createdBalls = [
      {
        id: 0,
        x: PLAY_X + st.cue.x * PLAY_W,
        y: PLAY_Y + st.cue.y * PLAY_H,
        vx: 0,
        vy: 0,
        active: true,
      },
      ...st.balls.map((b) => ({
        id: b.id,
        x: PLAY_X + b.x * PLAY_W,
        y: PLAY_Y + b.y * PLAY_H,
        vx: 0,
        vy: 0,
        active: true,
      })),
    ];

    ballsRef.current = createdBalls;
    starRef.current = st.star
      ? { x: PLAY_X + st.star.x * PLAY_W, y: PLAY_Y + st.star.y * PLAY_H, active: true }
      : null;

    isMovingRef.current = false;
    setIsMoving(false);
    setTick((t) => t + 1);
    showBanner(st.name);
  };
             // Loop principal da física das bolas (60 FPS com 6 sub-passos por frame)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isMovingRef.current) return;

      const balls = ballsRef.current;
      const subSteps = 6;
      const friction = Math.pow(0.986, 1 / subSteps);
      let anyMoving = false;

      for (let step = 0; step < subSteps; step++) {
        // 1. Movimentação, atrito e colisão com as tabelas
        for (let i = 0; i < balls.length; i++) {
          const b = balls[i];
          if (!b.active) continue;

          b.x += b.vx / subSteps;
          b.y += b.vy / subSteps;
          b.vx *= friction;
          b.vy *= friction;

          // Verifica se caiu em alguma caçapa
          let pocketed = false;
          for (let p = 0; p < POCKETS.length; p++) {
            const dx = b.x - POCKETS[p].x;
            const dy = b.y - POCKETS[p].y;
            if (dx * dx + dy * dy < POCKET_R * POCKET_R) {
              b.active = false;
              b.vx = 0;
              b.vy = 0;
              pocketed = true;
              if (b.id === 0) {
                cuePottedRef.current = true;
              } else {
                pottedThisTurnRef.current.push(b.id);
              }
              break;
            }
          }
          if (pocketed) continue;

          // Verifica estrela bônus
          if (b.id === 0 && starRef.current && starRef.current.active) {
            const sdx = b.x - starRef.current.x;
            const sdy = b.y - starRef.current.y;
            if (sdx * sdx + sdy * sdy < (BALL_R + 12) * (BALL_R + 12)) {
              starRef.current.active = false;
              starHitRef.current = true;
            }
          }

          // Rebatida nas tabelas com efeito (spin)
          const minX = PLAY_X + BALL_R;
          const maxX = PLAY_X + PLAY_W - BALL_R;
          const minY = PLAY_Y + BALL_R;
          const maxY = PLAY_Y + PLAY_H - BALL_R;

          if (b.x < minX) {
            b.x = minX;
            b.vx = -b.vx * 0.84;
            if (b.id === 0) b.vy += spinRef.current.x * 1.4;
          } else if (b.x > maxX) {
            b.x = maxX;
            b.vx = -b.vx * 0.84;
            if (b.id === 0) b.vy -= spinRef.current.x * 1.4;
          }

          if (b.y < minY) {
            b.y = minY;
            b.vy = -b.vy * 0.84;
            if (b.id === 0) b.vx -= spinRef.current.x * 1.4;
          } else if (b.y > maxY) {
            b.y = maxY;
            b.vy = -b.vy * 0.84;
            if (b.id === 0) b.vx += spinRef.current.x * 1.4;
          }
        }

        // 2. Colisão elástica entre bolas
        for (let i = 0; i < balls.length; i++) {
          for (let j = i + 1; j < balls.length; j++) {
            const b1 = balls[i];
            const b2 = balls[j];
            if (!b1.active || !b2.active) continue;

            const dx = b2.x - b1.x;
            const dy = b2.y - b1.y;
            const distSq = dx * dx + dy * dy;
            const minDist = BALL_R * 2;

            if (distSq > 0 && distSq < minDist * minDist) {
              const dist = Math.sqrt(distSq);
              const nx = dx / dist;
              const ny = dy / dist;

              // Separa as bolas sobrepostas
              const overlap = (minDist - dist) * 0.5;
              b1.x -= nx * overlap;
              b1.y -= ny * overlap;
              b2.x += nx * overlap;
              b2.y += ny * overlap;

              // Troca de velocidade ao longo do eixo normal
              const dvx = b1.vx - b2.vx;
              const dvy = b1.vy - b2.vy;
              const p = dvx * nx + dvy * ny;

              if (p > 0) {
                const restitution = 0.94;
                b1.vx -= p * nx * restitution;
                b1.vy -= p * ny * restitution;
                b2.vx += p * nx * restitution;
                b2.vy += p * ny * restitution;

                // Efeito follow/draw na bola branca após primeiro impacto
                if (b1.id === 0 && spinRef.current.y !== 0) {
                  b1.vx += nx * spinRef.current.y * 2.2;
                  b1.vy += ny * spinRef.current.y * 2.2;
                }
              }
            }
          }
        }
      }

      // Verifica se ainda existe movimento
      for (let i = 0; i < balls.length; i++) {
        const b = balls[i];
        if (!b.active) continue;
        const speed = Math.hypot(b.vx, b.vy);
        if (speed < 0.08) {
          b.vx = 0;
          b.vy = 0;
        } else {
          anyMoving = true;
        }
      }

      if (!anyMoving) {
        isMovingRef.current = false;
        setIsMoving(false);
        handleTurnEnd();
      }

      setTick((t) => t + 1);
    }, 16);

    return () => clearInterval(interval);
  }, []);

  const handleTurnEnd = () => {
    const mode = modeRef.current;
    const list = mode === 'trick' ? TRICK_STAGES : POCKET_STAGES;
    const st = list[stageIdxRef.current];
    const potted = pottedThisTurnRef.current;
    const scratched = cuePottedRef.current;
    const hitStar = starHitRef.current;

    // Reposiciona a bola branca caso tenha caído (Scratch)
    if (scratched) {
      const cue = ballsRef.current.find((b) => b.id === 0);
      if (cue) {
        cue.active = true;
        cue.x = PLAY_X + st.cue.x * PLAY_W;
        cue.y = PLAY_Y + st.cue.y * PLAY_H;
        cue.vx = 0;
        cue.vy = 0;
      }
      comboRef.current = 1;
      setCombo(1);
      showBanner('SCRATCH! FALTA (-1 TACADA)');
    } else if (potted.length > 0) {
      let gained = 0;
      potted.forEach((id) => {
        gained += id * 100 * comboRef.current;
      });
      if (hitStar) {
        gained += 1000;
        showBanner(`STAR BONUS! +${gained} PTS`);
      } else if (potted.length > 1) {
        showBanner(`DOUBLE POCKET! +${gained} PTS`);
      } else {
        showBanner(`NICE SHOT! +${gained} PTS`);
      }
      scoreRef.current += gained;
      setScore(scoreRef.current);
      comboRef.current += 1;
      setCombo(comboRef.current);
    } else {
      comboRef.current = 1;
      setCombo(1);
      if (hitStar) {
        scoreRef.current += 500;
        setScore(scoreRef.current);
        showBanner('BONUS STAR! +500 PTS');
      }
    }

    // Consome tacada (no Pocket Game, encaçapar sem falta devolve 1 tacada bônus)
    if (mode === 'pocket' && potted.length > 0 && !scratched) {
      // Mantém as tacadas restantes como prêmio
    } else {
      shotsRef.current = Math.max(0, shotsRef.current - 1);
      setShotsLeft(shotsRef.current);
    }

    // Reseta o efeito após a tacada
    spinRef.current = { x: 0, y: 0 };
    setSpin({ x: 0, y: 0 });

    const remainingObjectBalls = ballsRef.current.filter((b) => b.id !== 0 && b.active).length;

    if (mode === 'trick') {
      if (remainingObjectBalls === 0 && !scratched) {
        setStageResult('win');
      } else {
        setStageResult('lose');
      }
    } else {
      if (remainingObjectBalls === 0 || scoreRef.current >= st.targetScore) {
        if (remainingObjectBalls === 0) {
          scoreRef.current += shotsRef.current * 250;
          setScore(scoreRef.current);
        }
        setStageResult('win');
      } else if (shotsRef.current <= 0) {
        setStageResult('lose');
      }
    }
  };

  const shootCueBall = (powerRatio) => {
    if (isMovingRef.current || powerRatio < 0.06) return;
    const cue = ballsRef.current.find((b) => b.id === 0);
    if (!cue || !cue.active) return;

    const maxSpeed = 19.5;
    const speed = powerRatio * maxSpeed;

    cue.vx = Math.cos(aimAngle) * speed;
    cue.vy = Math.sin(aimAngle) * speed;

    pottedThisTurnRef.current = [];
    cuePottedRef.current = false;
    starHitRef.current = false;

    isMovingRef.current = true;
    setIsMoving(true);
    setPullPower(0);
  };

  // Controle de mira ao tocar e arrastar na mesa
  const tablePanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => !isMoving && !stageResult,
    onMoveShouldSetPanResponder: () => !isMoving && !stageResult,
    onPanResponderGrant: (evt) => {
      const cue = ballsRef.current.find((b) => b.id === 0);
      if (!cue) return;
      const { locationX, locationY } = evt.nativeEvent;
      setAimAngle(Math.atan2(locationY - cue.y, locationX - cue.x));
    },
    onPanResponderMove: (evt) => {
      const cue = ballsRef.current.find((b) => b.id === 0);
      if (!cue) return;
      const { locationX, locationY } = evt.nativeEvent;
      setAimAngle(Math.atan2(locationY - cue.y, locationX - cue.x));
    },
  });

  // Controle da barra de força lateral
  const powerPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => !isMoving && !stageResult,
    onMoveShouldSetPanResponder: () => !isMoving && !stageResult,
    onPanResponderMove: (_, gesture) => {
      const clamped = Math.max(0, Math.min(1, gesture.dy / 140));
      setPullPower(clamped);
    },
    onPanResponderRelease: (_, gesture) => {
      const clamped = Math.max(0, Math.min(1, gesture.dy / 140));
      if (clamped >= 0.08) {
        shootCueBall(clamped);
      } else {
        setPullPower(0);
      }
    },
  });

  // Cálculo da linha de mira + bola fantasma de reflexão (estilo Side Pocket)
  const getAimPreview = () => {
    const cue = ballsRef.current.find((b) => b.id === 0);
    if (!cue || !cue.active || isMoving) return null;

    const dx = Math.cos(aimAngle);
    const dy = Math.sin(aimAngle);
    const step = 2.5;
    let x = cue.x;
    let y = cue.y;
    let hitBall = null;

    for (let d = 0; d < TABLE_H * 1.2; d += step) {
      x += dx * step;
      y += dy * step;

      if (
        x <= PLAY_X + BALL_R ||
        x >= PLAY_X + PLAY_W - BALL_R ||
        y <= PLAY_Y + BALL_R ||
        y >= PLAY_Y + PLAY_H - BALL_R
      ) {
        break;
      }

      for (let i = 0; i < ballsRef.current.length; i++) {
        const b = ballsRef.current[i];
        if (b.id === 0 || !b.active) continue;
        const dist = Math.hypot(b.x - x, b.y - y);
        if (dist <= BALL_R * 2) {
          hitBall = b;
          break;
        }
      }
      if (hitBall) break;
    }
  const toggleSpin = () => {
    const presets = [
      { x: 0, y: 0 },
      { x: 0, y: 0.8 },   // Top spin (segue adiante)
      { x: 0, y: -0.8 },  // Back spin (puxadinha)
      { x: -0.8, y: 0 },  // Efeito esquerda
      { x: 0.8, y: 0 },   // Efeito direita
    ];
    const currentIdx = presets.findIndex(
      (p) => p.x === spin.x && p.y === spin.y
    );
    const next = presets[(currentIdx + 1) % presets.length];
    spinRef.current = next;
    setSpin(next);
  };

  if (gameMode === 'menu') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#090A0F" />
        <View style={styles.menuContainer}>
          <Text style={styles.arcadeSub}>DATA EAST STYLE BILLIARDS</Text>
          <Text style={styles.menuTitle}>
            SIDE <Text style={styles.menuTitleAccent}>POCKET</Text>
          </Text>

          <View style={styles.previewBallsRow}>
            {[1, 2, 3, 8, 9].map((num) => (
              <View
                key={num}
                style={[styles.menuBallBadge, { backgroundColor: BALL_COLORS[num] }]}
              >
                <Text style={styles.menuBallNum}>{num}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.menuButtonPrimary}
            onPress={() => loadStage('pocket', 0)}
          >
            <Text style={styles.menuButtonText}>🎱 POCKET GAME (FASES)</Text>
            <Text style={styles.menuButtonSub}>Atinja a meta de pontos e acerte as estrelas</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuButtonSecondary}
            onPress={() => loadStage('trick', 0)}
          >
            <Text style={styles.menuButtonText}>⚡ TRICK SHOT CHALLENGE</Text>
            <Text style={styles.menuButtonSub}>Limpe a mesa em apenas 1 tacada</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const stageList = gameMode === 'trick' ? TRICK_STAGES : POCKET_STAGES;
  const currentStage = stageList[stageIndex];
  const aimPreview = getAimPreview();
  const cueBall = ballsRef.current.find((b) => b.id === 0);

  // Posição do taco atrás da bola branca
  const cueOffset = BALL_R + 8 + pullPower * 42;
  const cueLen = 115;
  const cueX1 = cueBall ? cueBall.x - Math.cos(aimAngle) * cueOffset : 0;
  const cueY1 = cueBall ? cueBall.y - Math.sin(aimAngle) * cueOffset : 0;
  const cueX2 = cueBall ? cueBall.x - Math.cos(aimAngle) * (cueOffset + cueLen) : 0;
  const cueY2 = cueBall ? cueBall.y - Math.sin(aimAngle) * (cueOffset + cueLen) : 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#090A0F" />

      {/* Placar Superior Estilo Arcade */}
      <View style={styles.hudHeader}>
        <TouchableOpacity onPress={() => setGameMode('menu')} style={styles.backBtn}>
          <Text style={styles.backBtnText}>◀ MENU</Text>
        </TouchableOpacity>
        <View style={styles.hudCenter}>
          <Text style={styles.hudStageName}>{currentStage.name}</Text>
          {gameMode === 'pocket' ? (
            <Text style={styles.hudTarget}>
              SCORE: <Text style={styles.hudGold}>{score}</Text> / {currentStage.targetScore}
            </Text>
          ) : (
            <Text style={styles.hudTarget}>{currentStage.hint}</Text>
          )}
        </View>
        <View style={styles.hudShotsBox}>
          <Text style={styles.hudShotsLabel}>SHOTS</Text>
          <Text style={styles.hudShotsValue}>{shotsLeft}</Text>
        </View>
      </View>

      {/* Banner de Feedback (Nice Shot / Star Bonus / Scratch) */}
      <View style={styles.bannerSlot}>
        {bannerMsg !== '' && (
          <View style={styles.bannerPill}>
            <Text style={styles.bannerText}>{bannerMsg}</Text>
          </View>
        )}
      </View>

      {/* Área Principal: Mesa + Barra de Força Lateral */}
      <View style={styles.arenaRow}>
        <View style={styles.tableWrapper} {...tablePanResponder.panHandlers}>
          <Svg width={TABLE_W} height={TABLE_H}>
            <Defs>
              <RadialGradient id="feltGrad" cx="50%" cy="50%" r="70%">
                <Stop offset="0%" stopColor="#0E7A45" stopOpacity="1" />
                <Stop offset="100%" stopColor="#084C2B" stopOpacity="1" />
              </RadialGradient>
            </Defs>

            {/* Moldura de Madeira Mogno */}
            <Rect
              x={0}
              y={0}
              width={TABLE_W}
              height={TABLE_H}
              rx={16}
              fill="#5C2D16"
              stroke="#8C4A27"
              strokeWidth={3}
            />

            {/* Feltro Verde */}
            <Rect
              x={PLAY_X}
              y={PLAY_Y}
              width={PLAY_W}
              height={PLAY_H}
              rx={6}
              fill="url(#feltGrad)"
            />

            {/* Linha de cabeceira */}
            <Line
              x1={PLAY_X}
              y1={PLAY_Y + PLAY_H * 0.75}
              x2={PLAY_X + PLAY_W}
              y2={PLAY_Y + PLAY_H * 0.75}
              stroke="rgba(255,255,255,0.18)"
              strokeWidth={1.5}
              strokeDasharray="4,4"
            />

            {/* 6 Caçapas */}
            {POCKETS.map((p, idx) => (
              <G key={idx}>
                <Circle cx={p.x} cy={p.y} r={POCKET_R + 2} fill="#2A1409" />
                <Circle cx={p.x} cy={p.y} r={POCKET_R} fill="#05070A" />
              </G>
            ))}

            {/* Estrela Bônus */}
            {starRef.current && starRef.current.active && (
              <G>
                <Circle
                  cx={starRef.current.x}
                  cy={starRef.current.y}
                  r={13}
                  fill="rgba(250, 204, 21, 0.22)"
                />
                <SvgText
                  x={starRef.current.x}
                  y={starRef.current.y + 6}
                  fontSize="18"
                  fill="#FACC15"
                  textAnchor="middle"
                >
                  ★
                </SvgText>
              </G>
            )}

            {/* Linha de Mira e Bola Fantasma */}
            {aimPreview && (
              <G>
                <Line
                  x1={aimPreview.startX}
                  y1={aimPreview.startY}
                  x2={aimPreview.endX}
                  y2={aimPreview.endY}
                  stroke="#FFFFFF"
                  strokeWidth={2}
                  strokeDasharray="5,5"
                  opacity={0.85}
                />
                <Circle
                  cx={aimPreview.endX}
                  cy={aimPreview.endY}
                  r={BALL_R}
                  stroke="#FFFFFF"
                  strokeWidth={1.5}
                  fill="rgba(255,255,255,0.15)"
                />
                {aimPreview.targetLine && (
                  <Line
                    x1={aimPreview.targetLine.x1}
                    y1={aimPreview.targetLine.y1}
                    x2={aimPreview.targetLine.x2}
                    y2={aimPreview.targetLine.y2}
                    stroke="#FACC15"
                    strokeWidth={2.5}
                    strokeDasharray="4,4"
                  />
                )}
              </G>
            )}

            {/* Bolas na Mesa */}
            {ballsRef.current.map((b) => {
              if (!b.active) return null;
              const isCue = b.id === 0;
              return (
                <G key={b.id}>
                  {/* Sombra */}
                  <Circle
                    cx={b.x + 2}
                    cy={b.y + 2.5}
                    r={BALL_R}
                    fill="rgba(0,0,0,0.4)"
                  />
                  {/* Corpo da Bola */}
                  <Circle
                    cx={b.x}
                    cy={b.y}
                    r={BALL_R}
                    fill={BALL_COLORS[b.id] || '#EF4444'}
                  />
                  {/* Faixa branca para a bola 9 */}
                  {b.id === 9 && (
                    <Rect
                      x={b.x - BALL_R * 0.85}
                      y={b.y - BALL_R * 0.45}
                      width={BALL_R * 1.7}
                      height={BALL_R * 0.9}
                      rx={3}
                      fill="#FFFFFF"
                    />
                  )}
                  {/* Número da Bola */}
                  {!isCue && (
                    <G>
                      <Circle cx={b.x} cy={b.y} r={BALL_R * 0.52} fill="#FFFFFF" />
                      <SvgText
                        x={b.x}
                        y={b.y + 3.2}
                        fontSize="8.5"
                        fontWeight="bold"
                        fill="#090A0F"
                        textAnchor="middle"
                      >
                        {b.id}
                      </SvgText>
                    </G>
                  )}
                  {/* Brilho especular */}
                  <Circle
                    cx={b.x - BALL_R * 0.32}
                    cy={b.y - BALL_R * 0.32}
                    r={BALL_R * 0.24}
                    fill="rgba(255,255,255,0.55)"
                  />
                </G>
              );
            })}

            {/* Taco de Bilhar */}
            {cueBall && cueBall.active && !isMoving && (
              <G>
                <Line
                  x1={cueX1}
                  y1={cueY1}
                  x2={cueX2}
                  y2={cueY2}
                  stroke="#D97706"
                  strokeWidth={5.5}
                  strokeLinecap="round"
                />
                <Line
                  x1={cueX1}
                  y1={cueY1}
                  x2={cueBall.x - Math.cos(aimAngle) * (cueOffset + 8)}
                  y2={cueBall.y - Math.sin(aimAngle) * (cueOffset + 8)}
                  stroke="#38BDF8"
                  strokeWidth={5.5}
                  strokeLinecap="round"
                />
              </G>
            )}
          </Svg>
        </View>

        {/* Coluna Direita: Efeito (Spin) + Puxador de Força */}
        <View style={styles.controlsColumn}>
          <TouchableOpacity style={styles.spinBox} onPress={toggleSpin}>
            <Text style={styles.spinLabel}>SPIN</Text>
            <View style={styles.spinBall}>
              <View
                style={[
                  styles.spinDot,
                  {
                    transform: [
                      { translateX: spin.x * 10 },
                      { translateY: -spin.y * 10 },
                    ],
                  },
                ]}
              />
            </View>
          </TouchableOpacity>

          <View style={styles.powerTrack} {...powerPanResponder.panHandlers}>
            <Text style={styles.powerHint}>PUXE</Text>
            <View
              style={[
                styles.powerFill,
                { height: `${Math.round(pullPower * 100)}%` },
              ]}
            />
            <View
              style={[
                styles.powerKnob,
                { top: 10 + pullPower * 125 },
              ]}
            >
              <Text style={styles.powerKnobText}>🎱</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Rodapé com Ajuste Fino de Mira */}
      <View style={styles.fineTuneRow}>
        <TouchableOpacity
          style={styles.fineBtn}
          onPress={() => setAimAngle((a) => a - 0.025)}
          disabled={isMoving}
        >
          <Text style={styles.fineBtnText}>↺ ESQ</Text>
        </TouchableOpacity>
        <Text style={styles.comboBadge}>COMBO {combo}x</Text>
        <TouchableOpacity
          style={styles.fineBtn}
          onPress={() => setAimAngle((a) => a + 0.025)}
          disabled={isMoving}
        >
          <Text style={styles.fineBtnText}>DIR ↻</Text>
        </TouchableOpacity>
      </View>

      {/* Tela de Resultado da Fase */}
      {stageResult && (
        <View style={styles.resultOverlay}>
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>
              {stageResult === 'win' ? '🏆 STAGE CLEAR!' : '💥 GAME OVER'}
            </Text>
            <Text style={styles.resultScore}>PONTUAÇÃO: {score}</Text>

            {stageResult === 'win' ? (
              <TouchableOpacity
                style={styles.resultBtnWin}
                onPress={() => loadStage(gameMode, stageIndex + 1)}
              >
                <Text style={styles.resultBtnText}>PRÓXIMA FASE ➔</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.resultBtnRetry}
                onPress={() => loadStage(gameMode, stageIndex)}
              >
                <Text style={styles.resultBtnText}>TENTAR NOVAMENTE</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090A0F', alignItems: 'center' },
  menuContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    width: '100%',
  },
  arcadeSub: { color: '#FACC15', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  menuTitle: { color: '#FFFFFF', fontSize: 44, fontWeight: '900', letterSpacing: 2, marginTop: 4 },
  menuTitleAccent: { color: '#00D26A' },
  previewBallsRow: { flexDirection: 'row', gap: 10, marginVertical: 24 },
  menuBallBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuBallNum: { color: '#FFFFFF', fontWeight: '900', fontSize: 14 },
  menuButtonPrimary: {
    width: '100%',
    backgroundColor: '#00D26A',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 18,
    alignItems: 'center',
    marginBottom: 14,
  },
  menuButtonSecondary: {
    width: '100%',
    backgroundColor: '#1E293B',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 18,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#38BDF8',
  },
  menuButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  menuButtonSub: { color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 4, fontWeight: '600' },

  hudHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#13151C',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E222D',
  },
  backBtn: { backgroundColor: '#1E222D', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  backBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  hudCenter: { alignItems: 'center', flex: 1 },
  hudStageName: { color: '#00D26A', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  hudTarget: { color: '#CBD5E1', fontSize: 11, fontWeight: '700', marginTop: 2 },
  hudGold: { color: '#FACC15', fontWeight: '900' },
  hudShotsBox: {
    backgroundColor: '#090A0F',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FACC15',
  },
  hudShotsLabel: { color: '#FACC15', fontSize: 8, fontWeight: '900' },
  hudShotsValue: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },

  bannerSlot: { height: 28, justifyContent: 'center', alignItems: 'center', marginVertical: 2 },
  bannerPill: { backgroundColor: '#FACC15', paddingHorizontal: 14, paddingVertical: 3, borderRadius: 12 },
  bannerText: { color: '#090A0F', fontSize: 11, fontWeight: '900', letterSpacing: 0.8 },

  arenaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tableWrapper: { borderRadius: 16, overflow: 'hidden' },

  controlsColumn: { alignItems: 'center', gap: 14 },
  spinBox: {
    alignItems: 'center',
    backgroundColor: '#13151C',
    padding: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1E222D',
  },
  spinLabel: { color: '#94A3B8', fontSize: 9, fontWeight: '900', marginBottom: 4 },
  spinBall: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },

  powerTrack: {
    width: 44,
    height: 175,
    backgroundColor: '#13151C',
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#334155',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  powerHint: { color: '#64748B', fontSize: 9, fontWeight: '900', marginTop: 6 },
  powerFill: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: 'rgba(239, 68, 68, 0.35)',
  },
  powerKnob: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FACC15',
  },
  powerKnobText: { fontSize: 16 },

  fineTuneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: TABLE_W,
    marginTop: 10,
  },
  fineBtn: {
    backgroundColor: '#13151C',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E222D',
  },
  fineBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  comboBadge: { color: '#00D26A', fontSize: 12, fontWeight: '900', letterSpacing: 1 },

  resultOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(9, 10, 15, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  resultCard: {
    width: '100%',
    backgroundColor: '#13151C',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FACC15',
  },
  resultTitle: { color: '#FACC15', fontSize: 26, fontWeight: '900', letterSpacing: 1 },
  resultScore: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', marginVertical: 14 },
  resultBtnWin: {
    backgroundColor: '#00D26A',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 25,
  },
  resultBtnRetry: {
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 25,
  },
  resultBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
});
      
    let targetLine = null;
    if (hitBall) {
      const tAngle = Math.atan2(hitBall.y - y, hitBall.x - x);
      targetLine = {
        x1: hitBall.x,
        y1: hitBall.y,
        x2: hitBall.x + Math.cos(tAngle) * 55,
        y2: hitBall.y + Math.sin(tAngle) * 55,
      };
    }

    return { startX: cue.x, startY: cue.y, endX: x, endY: y, hitBall, targetLine };
  };
          
