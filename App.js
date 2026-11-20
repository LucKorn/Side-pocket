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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Mesa ampliada ocupando melhor a altura e largura da tela
const MAX_AVAIL_H = SCREEN_HEIGHT - 165;
const MAX_AVAIL_W = SCREEN_WIDTH - 86;
const TABLE_W = Math.min(MAX_AVAIL_W, MAX_AVAIL_H / 1.88);
const TABLE_H = TABLE_W * 1.88;

const RAIL = 20;
const PLAY_X = RAIL;
const PLAY_Y = RAIL;
const PLAY_W = TABLE_W - RAIL * 2;
const PLAY_H = TABLE_H - RAIL * 2;
const BALL_R = Math.max(10, TABLE_W * 0.037);
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

const SPIN_PRESETS = [
  { x: 0, y: 0, label: 'CENTER' },
  { x: 0, y: 0.85, label: 'TOP' },
  { x: 0, y: -0.85, label: 'BACK' },
  { x: -0.85, y: 0, label: 'LEFT' },
  { x: 0.85, y: 0, label: 'RIGHT' },
];

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

function NativeLine({ x1, y1, x2, y2, thickness = 2, color = '#FFFFFF', dashed = false, opacity = 1 }) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  if (length < 1) return null;
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: midX - length / 2,
        top: midY - thickness / 2,
        width: length,
        height: thickness,
        backgroundColor: dashed ? 'transparent' : color,
        borderStyle: dashed ? 'dashed' : 'solid',
        borderWidth: dashed ? thickness / 2 : 0,
        borderColor: color,
        opacity,
        transform: [{ rotate: `${angle}deg` }],
      }}
    />
  );
}

export default function App() {
  const [gameMode, setGameMode] = useState('menu');
  const [stageIndex, setStageIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [shotsLeft, setShotsLeft] = useState(10);
  const [combo, setCombo] = useState(1);
  const [aimAngle, setAimAngle] = useState(-Math.PI / 2);
  const [pullPower, setPullPower] = useState(0);
  const [spinIdx, setSpinIdx] = useState(0);
  const [isMoving, setIsMoving] = useState(false);
  const [bannerMsg, setBannerMsg] = useState('');
  const [stageResult, setStageResult] = useState(null);
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
    setSpinIdx(0);

    ballsRef.current = [
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

    starRef.current = st.star
      ? { x: PLAY_X + st.star.x * PLAY_W, y: PLAY_Y + st.star.y * PLAY_H, active: true }
      : null;

    isMovingRef.current = false;
    setIsMoving(false);
    setTick((t) => t + 1);
    showBanner(st.name);
  };
          useEffect(() => {
    const interval = setInterval(() => {
      if (!isMovingRef.current) return;

      const balls = ballsRef.current;
      const subSteps = 6;
      const friction = Math.pow(0.986, 1 / subSteps);
      let anyMoving = false;

      for (let step = 0; step < subSteps; step++) {
        for (let i = 0; i < balls.length; i++) {
          const b = balls[i];
          if (!b.active) continue;

          b.x += b.vx / subSteps;
          b.y += b.vy / subSteps;
          b.vx *= friction;
          b.vy *= friction;

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

          if (b.id === 0 && starRef.current && starRef.current.active) {
            const sdx = b.x - starRef.current.x;
            const sdy = b.y - starRef.current.y;
            if (sdx * sdx + sdy * sdy < (BALL_R + 12) * (BALL_R + 12)) {
              starRef.current.active = false;
              starHitRef.current = true;
            }
          }

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

              const overlap = (minDist - dist) * 0.5;
              b1.x -= nx * overlap;
              b1.y -= ny * overlap;
              b2.x += nx * overlap;
              b2.y += ny * overlap;

              const dvx = b1.vx - b2.vx;
              const dvy = b1.vy - b2.vy;
              const p = dvx * nx + dvy * ny;

              if (p > 0) {
                const restitution = 0.94;
                b1.vx -= p * nx * restitution;
                b1.vy -= p * ny * restitution;
                b2.vx += p * nx * restitution;
                b2.vy += p * ny * restitution;

                if (b1.id === 0 && spinRef.current.y !== 0) {
                  b1.vx += nx * spinRef.current.y * 2.2;
                  b1.vy += ny * spinRef.current.y * 2.2;
                }
              }
            }
          }
        }
      }

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

    if (mode === 'pocket' && potted.length > 0 && !scratched) {
      // Mantém tacadas
    } else {
      shotsRef.current = Math.max(0, shotsRef.current - 1);
      setShotsLeft(shotsRef.current);
    }

    spinRef.current = { x: 0, y: 0 };
    setSpinIdx(0);

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

  const powerPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => !isMoving && !stageResult,
    onMoveShouldSetPanResponder: () => !isMoving && !stageResult,
    onPanResponderMove: (_, gesture) => {
      const clamped = Math.max(0, Math.min(1, gesture.dy / 145));
      setPullPower(clamped);
    },
    onPanResponderRelease: (_, gesture) => {
      const clamped = Math.max(0, Math.min(1, gesture.dy / 145));
      if (clamped >= 0.08) {
        shootCueBall(clamped);
      } else {
        setPullPower(0);
      }
    },
  });

  // Mira estendida (170px na bola alvo + reflexão nas tabelas)
  const getAimPreview = () => {
    const cue = ballsRef.current.find((b) => b.id === 0);
    if (!cue || !cue.active || isMoving) return null;

    const dx = Math.cos(aimAngle);
    const dy = Math.sin(aimAngle);
    const step = 2.0;
    let x = cue.x;
    let y = cue.y;
    let hitBall = null;
    let hitRail = false;

    const minX = PLAY_X + BALL_R;
    const maxX = PLAY_X + PLAY_W - BALL_R;
    const minY = PLAY_Y + BALL_R;
    const maxY = PLAY_Y + PLAY_H - BALL_R;

    for (let d = 0; d < TABLE_H * 1.4; d += step) {
      x += dx * step;
      y += dy * step;

      if (x <= minX || x >= maxX || y <= minY || y >= maxY) {
        x = Math.max(minX, Math.min(maxX, x));
        y = Math.max(minY, Math.min(maxY, y));
        hitRail = true;
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

    let targetLines = [];
    if (hitBall) {
      const tAngle = Math.atan2(hitBall.y - y, hitBall.x - x);
      const tdx = Math.cos(tAngle);
      const tdy = Math.sin(tAngle);
      let tx = hitBall.x;
      let ty = hitBall.y;
      const maxTrace = 175;

      for (let td = 0; td < maxTrace; td += 2) {
        const nx = tx + tdx * 2;
        const ny = ty + tdy * 2;
        if (nx <= minX || nx >= maxX || ny <= minY || ny >= maxY) {
          // Segue o rebote na tabela por mais 60px
          const rdx = nx <= minX || nx >= maxX ? -tdx : tdx;
          const rdy = ny <= minY || ny >= maxY ? -tdy : tdy;
          targetLines.push({ x1: hitBall.x, y1: hitBall.y, x2: tx, y2: ty });
          targetLines.push({
            x1: tx,
            y1: ty,
            x2: Math.max(minX, Math.min(maxX, tx + rdx * 65)),
            y2: Math.max(minY, Math.min(maxY, ty + rdy * 65)),
          });
          break;
        }
        tx = nx;
        ty = ny;
        if (td + 2 >= maxTrace) {
          targetLines.push({ x1: hitBall.x, y1: hitBall.y, x2: tx, y2: ty });
        }
      }
    } else if (hitRail) {
      // Linha extra mostrando para onde a bola branca vai rebater na tabela
      const rdx = x <= minX || x >= maxX ? -dx : dx;
      const rdy = y <= minY || y >= maxY ? -dy : dy;
      targetLines.push({
        x1: x,
        y1: y,
        x2: Math.max(minX, Math.min(maxX, x + rdx * 110)),
        y2: Math.max(minY, Math.min(maxY, y + rdy * 110)),
      });
    }

    return { startX: cue.x, startY: cue.y, endX: x, endY: y, hitBall, targetLines };
  };
    const toggleSpin = () => {
    const nextIdx = (spinIdx + 1) % SPIN_PRESETS.length;
    setSpinIdx(nextIdx);
    spinRef.current = { x: SPIN_PRESETS[nextIdx].x, y: SPIN_PRESETS[nextIdx].y };
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
  const currentSpin = SPIN_PRESETS[spinIdx];
  const aimPreview = getAimPreview();
  const cueBall = ballsRef.current.find((b) => b.id === 0);

  const cueOffset = BALL_R + 8 + pullPower * 42;
  const cueLen = 115;
  const cueX1 = cueBall ? cueBall.x - Math.cos(aimAngle) * cueOffset : 0;
  const cueY1 = cueBall ? cueBall.y - Math.sin(aimAngle) * cueOffset : 0;
  const cueX2 = cueBall ? cueBall.x - Math.cos(aimAngle) * (cueOffset + cueLen) : 0;
  const cueY2 = cueBall ? cueBall.y - Math.sin(aimAngle) * (cueOffset + cueLen) : 0;
  const tipX2 = cueBall ? cueBall.x - Math.cos(aimAngle) * (cueOffset + 8) : 0;
  const tipY2 = cueBall ? cueBall.y - Math.sin(aimAngle) * (cueOffset + 8) : 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#090A0F" />

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

      <View style={styles.bannerSlot}>
        {bannerMsg !== '' && (
          <View style={styles.bannerPill}>
            <Text style={styles.bannerText}>{bannerMsg}</Text>
          </View>
        )}
      </View>

      <View style={styles.arenaRow}>
        {/* Mesa de Bilhar Ampliada */}
        <View
          style={[styles.tableWood, { width: TABLE_W, height: TABLE_H }]}
          {...tablePanResponder.panHandlers}
        >
          <View
            pointerEvents="none"
            style={[
              styles.tableFelt,
              {
                left: PLAY_X,
                top: PLAY_Y,
                width: PLAY_W,
                height: PLAY_H,
              },
            ]}
          />

          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: PLAY_X,
              top: PLAY_Y + PLAY_H * 0.75,
              width: PLAY_W,
              height: 1,
              backgroundColor: 'rgba(255,255,255,0.18)',
            }}
          />

          {POCKETS.map((p, idx) => (
            <View
              key={idx}
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: p.x - POCKET_R,
                top: p.y - POCKET_R,
                width: POCKET_R * 2,
                height: POCKET_R * 2,
                borderRadius: POCKET_R,
                backgroundColor: '#05070A',
                borderWidth: 2,
                borderColor: '#2A1409',
              }}
            />
          ))}

          {starRef.current && starRef.current.active && (
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: starRef.current.x - 13,
                top: starRef.current.y - 13,
                width: 26,
                height: 26,
                borderRadius: 13,
                backgroundColor: 'rgba(250, 204, 21, 0.22)',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#FACC15', fontSize: 16, fontWeight: '900' }}>★</Text>
            </View>
          )}

          {/* Linha de Mira e Trajetória Estendida */}
          {aimPreview && (
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              <NativeLine
                x1={aimPreview.startX}
                y1={aimPreview.startY}
                x2={aimPreview.endX}
                y2={aimPreview.endY}
                thickness={2}
                color="#FFFFFF"
                dashed={true}
                opacity={0.9}
              />
              <View
                style={{
                  position: 'absolute',
                  left: aimPreview.endX - BALL_R,
                  top: aimPreview.endY - BALL_R,
                  width: BALL_R * 2,
                  height: BALL_R * 2,
                  borderRadius: BALL_R,
                  borderWidth: 1.5,
                  borderColor: '#FFFFFF',
                  backgroundColor: 'rgba(255,255,255,0.18)',
                }}
              />
              {aimPreview.targetLines.map((ln, i) => (
                <NativeLine
                  key={i}
                  x1={ln.x1}
                  y1={ln.y1}
                  x2={ln.x2}
                  y2={ln.y2}
                  thickness={2.5}
                  color={aimPreview.hitBall ? '#FACC15' : '#38BDF8'}
                  dashed={true}
                  opacity={0.95}
                />
              ))}
            </View>
          )}

          {/* Bolas na Mesa */}
          {ballsRef.current.map((b) => {
            if (!b.active) return null;
            const isCue = b.id === 0;
            return (
              <View
                key={b.id}
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: b.x - BALL_R,
                  top: b.y - BALL_R,
                  width: BALL_R * 2,
                  height: BALL_R * 2,
                  borderRadius: BALL_R,
                  backgroundColor: BALL_COLORS[b.id] || '#EF4444',
                  justifyContent: 'center',
                  alignItems: 'center',
                  elevation: 4,
                }}
              >
                {b.id === 9 && (
                  <View
                    style={{
                      position: 'absolute',
                      width: BALL_R * 1.85,
                      height: BALL_R * 0.95,
                      backgroundColor: '#FFFFFF',
                      borderRadius: 3,
                    }}
                  />
                )}
                {!isCue && (
                  <View
                    style={{
                      width: BALL_R * 1.15,
                      height: BALL_R * 1.15,
                      borderRadius: BALL_R * 0.6,
                      backgroundColor: '#FFFFFF',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 9, fontWeight: '900', color: '#090A0F' }}>
                      {b.id}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}

          {/* Taco de Bilhar */}
          {cueBall && cueBall.active && !isMoving && (
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              <NativeLine
                x1={cueX1}
                y1={cueY1}
                x2={cueX2}
                y2={cueY2}
                thickness={5.5}
                color="#D97706"
              />
              <NativeLine
                x1={cueX1}
                y1={cueY1}
                x2={tipX2}
                y2={tipY2}
                thickness={5.5}
                color="#38BDF8"
              />
            </View>
          )}
        </View>

        {/* Coluna Direita: Seletor de Batida (Maior) + Barra de Força */}
        <View style={styles.controlsColumn}>
          <TouchableOpacity style={styles.spinBox} onPress={toggleSpin} activeOpacity={0.7}>
            <Text style={styles.spinLabel}>BATIDA</Text>
            <View style={styles.spinBall}>
              <View
                style={[
                  styles.spinDot,
                  {
                    transform: [
                      { translateX: currentSpin.x * 16 },
                      { translateY: -currentSpin.y * 16 },
                    ],
                  },
                ]}
              />
            </View>
            <Text style={styles.spinModeText}>{currentSpin.label}</Text>
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
                { top: 18 + pullPower * 135 },
              ]}
            >
              <Text style={styles.powerKnobText}>🎱</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.fineTuneRow}>
        <TouchableOpacity
          style={styles.fineBtn}
          onPress={() => setAimAngle((a) => a - 0.02)}
          disabled={isMoving}
        >
          <Text style={styles.fineBtnText}>↺ ESQ</Text>
        </TouchableOpacity>
        <Text style={styles.comboBadge}>COMBO {combo}x</Text>
        <TouchableOpacity
          style={styles.fineBtn}
          onPress={() => setAimAngle((a) => a + 0.02)}
          disabled={isMoving}
        >
          <Text style={styles.fineBtnText}>DIR ↻</Text>
        </TouchableOpacity>
      </View>

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
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1E222D',
  },
  backBtn: { backgroundColor: '#1E222D', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  backBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  hudCenter: { alignItems: 'center', flex: 1 },
  hudStageName: { color: '#00D26A', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  hudTarget: { color: '#CBD5E1', fontSize: 11, fontWeight: '700', marginTop: 1 },
  hudGold: { color: '#FACC15', fontWeight: '900' },
  hudShotsBox: {
    backgroundColor: '#090A0F',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FACC15',
  },
  hudShotsLabel: { color: '#FACC15', fontSize: 8, fontWeight: '900' },
  hudShotsValue: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },

  bannerSlot: { height: 24, justifyContent: 'center', alignItems: 'center' },
  bannerPill: { backgroundColor: '#FACC15', paddingHorizontal: 14, paddingVertical: 2, borderRadius: 12 },
  bannerText: { color: '#090A0F', fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },

  arenaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tableWood: {
    backgroundColor: '#5C2D16',
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#8C4A27',
    overflow: 'hidden',
    position: 'relative',
  },
  tableFelt: {
    position: 'absolute',
    backgroundColor: '#0B6337',
    borderRadius: 6,
  },

  controlsColumn: { alignItems: 'center', gap: 14 },
  spinBox: {
    alignItems: 'center',
    backgroundColor: '#13151C',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#334155',
    width: 68,
  },
  spinLabel: { color: '#94A3B8', fontSize: 9, fontWeight: '900', marginBottom: 6 },
  spinBall: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#CBD5E1',
  },
  spinDot: { width: 11, height: 11, borderRadius: 5.5, backgroundColor: '#EF4444' },
  spinModeText: { color: '#38BDF8', fontSize: 9, fontWeight: '900', marginTop: 6 },

  powerTrack: {
    width: 54,
    height: 195,
    backgroundColor: '#13151C',
    borderRadius: 27,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FACC15',
  },
  powerKnobText: { fontSize: 18 },

  fineTuneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: TABLE_W,
    marginTop: 8,
  },
  fineBtn: {
    backgroundColor: '#13151C',
    paddingHorizontal: 18,
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
      
