export type DogRaceEntry = {
  lane: number;
  dogKey: string;
  name: string;
  breed: string;
  emoji: string;
  speed: number;
  stamina: number;
  sprint: number;
  composure: number;
  mistakeRate: number;
  powerScore: number;
  winProbability: number;
  odds: number;
};

export type StoredDogRaceEntry = DogRaceEntry & {
  id?: number;
};

export type RaceEvent = {
  at: number;
  lane: number;
  type: "start" | "surge" | "mistake" | "recover" | "sprint" | "finish";
  message: string;
  intensity: number;
};

export type RaceResult = {
  winnerLane: number;
  ranking: number[];
  finishTimes: Record<number, number>;
  progressFrames: Array<{ at: number; progress: Record<number, number> }>;
  events: RaceEvent[];
  durationMs: number;
};

const DOGS = [
  { dogKey: "corgi", name: "몽실이", breed: "웰시코기", emoji: "🐕" },
  { dogKey: "shiba", name: "호두", breed: "시바견", emoji: "🐕" },
  { dogKey: "retriever", name: "누룽지", breed: "골든리트리버", emoji: "🦮" },
  { dogKey: "husky", name: "설이", breed: "허스키", emoji: "🐺" },
  { dogKey: "maltese", name: "솜이", breed: "말티즈", emoji: "🐩" },
  { dogKey: "bulldog", name: "만두", breed: "불독", emoji: "🐕" },
] as const;

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function round(value: number, digits = 2) {
  const unit = 10 ** digits;
  return Math.round(value * unit) / unit;
}

function weightedPick<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((sum, value) => sum + Math.max(0, value), 0);
  let cursor = Math.random() * total;

  for (let index = 0; index < items.length; index += 1) {
    cursor -= Math.max(0, weights[index]);
    if (cursor <= 0) return items[index];
  }

  return items[items.length - 1];
}

export function createRaceEntries(payoutRate = 0.92): DogRaceEntry[] {
  const base = DOGS.map((dog, index) => {
    const speed = randomInt(58, 98);
    const stamina = randomInt(55, 99);
    const sprint = randomInt(52, 100);
    const composure = randomInt(55, 98);
    const mistakeRate = randomInt(2, 18);

    const powerScore =
      speed * 0.38 +
      stamina * 0.24 +
      sprint * 0.26 +
      composure * 0.12 -
      mistakeRate * 0.72 +
      Math.random() * 5;

    return {
      lane: index + 1,
      ...dog,
      speed,
      stamina,
      sprint,
      composure,
      mistakeRate,
      powerScore: round(powerScore, 4),
    };
  });

  const temperature = 9.5;
  const weights = base.map((dog) => Math.exp(dog.powerScore / temperature));
  const total = weights.reduce((sum, value) => sum + value, 0);

  return base.map((dog, index) => {
    const winProbability = weights[index] / total;
    const fairOdds = 1 / winProbability;
    const safePayoutRate = Math.max(0.5, Math.min(1, payoutRate));
    const odds = Math.max(1.35, Math.min(18, fairOdds * safePayoutRate));

    return {
      ...dog,
      winProbability: round(winProbability * 100, 2),
      odds: round(odds, 2),
    };
  });
}

export function simulateRace(entries: StoredDogRaceEntry[]): RaceResult {
  const durationMs = randomInt(11800, 13200);
  const frameStep = 200;
  const winner = weightedPick(
    entries,
    entries.map((dog) => Math.max(1, dog.winProbability))
  );

  const states = entries.map((dog) => ({
    dog,
    progress: 0,
    velocity: 0,
    mistakeUntil: 0,
    surgeUntil: 0,
    finishedAt: 0,
  }));

  const events: RaceEvent[] = entries.map((dog) => ({
    at: 350,
    lane: dog.lane,
    type: "start",
    message: `${dog.lane}번 ${dog.name}, 힘차게 출발합니다!`,
    intensity: 1,
  }));

  const eventWindows = [2600, 4300, 6100, 7900, 9650];
  for (const at of eventWindows) {
    const candidate = entries[randomInt(0, entries.length - 1)];
    const mistakeChance = candidate.mistakeRate / 100;
    if (Math.random() < mistakeChance * 1.55) {
      events.push({
        at,
        lane: candidate.lane,
        type: "mistake",
        message: `😱 ${candidate.lane}번 ${candidate.name}가 휘청거립니다!`,
        intensity: 0.7 + Math.random() * 0.5,
      });
      events.push({
        at: at + 900,
        lane: candidate.lane,
        type: "recover",
        message: `💪 ${candidate.lane}번 ${candidate.name}, 다시 균형을 잡았습니다!`,
        intensity: 0.8,
      });
    } else {
      events.push({
        at,
        lane: candidate.lane,
        type: "surge",
        message: `🔥 ${candidate.lane}번 ${candidate.name}가 치고 나옵니다!`,
        intensity: 0.8 + Math.random() * 0.6,
      });
    }
  }

  const sprintAt = durationMs - 2550;
  const sprintDogs = [...entries]
    .sort((a, b) => b.sprint - a.sprint)
    .slice(0, 2);

  sprintDogs.forEach((dog, index) => {
    events.push({
      at: sprintAt + index * 260,
      lane: dog.lane,
      type: "sprint",
      message: `🚀 ${dog.lane}번 ${dog.name}, 막판 스퍼트!`,
      intensity: 1.2,
    });
  });

  const progressFrames: Array<{ at: number; progress: Record<number, number> }> = [];

  for (let at = 0; at <= durationMs; at += frameStep) {
    const phase = at / durationMs;

    for (const state of states) {
      if (state.finishedAt) continue;

      const dog = state.dog;
      const activeEvents = events.filter(
        (event) => event.lane === dog.lane && event.at <= at && event.at > at - frameStep
      );

      for (const event of activeEvents) {
        if (event.type === "mistake") state.mistakeUntil = at + 1100;
        if (event.type === "surge") state.surgeUntil = at + 1300;
        if (event.type === "sprint") state.surgeUntil = at + 1800;
      }

      const speedBase = dog.speed * 0.00000105;
      const staminaFactor = phase < 0.55 ? 1 : 0.82 + dog.stamina / 520;
      const sprintFactor = phase > 0.78 ? 0.86 + dog.sprint / 360 : 1;
      const composureNoise = (Math.random() - 0.5) * (105 - dog.composure) * 0.000004;
      const mistakeFactor = at < state.mistakeUntil ? 0.48 : 1;
      const surgeFactor = at < state.surgeUntil ? 1.26 : 1;
      const winnerBias = dog.lane === winner.lane ? 1 + Math.max(0, phase - 0.62) * 0.24 : 1;

      const targetVelocity =
        (speedBase * staminaFactor * sprintFactor * mistakeFactor * surgeFactor * winnerBias + composureNoise) *
        frameStep;

      state.velocity += (targetVelocity - state.velocity) * 0.34;
      state.progress += Math.max(0.0016, state.velocity);

      if (state.progress >= 1) {
        state.progress = 1;
        state.finishedAt = at;
      }
    }

    if (at >= durationMs - 1550) {
      const winnerState = states.find((state) => state.dog.lane === winner.lane)!;
      const maxOther = Math.max(
        ...states.filter((state) => state.dog.lane !== winner.lane).map((state) => state.progress)
      );
      winnerState.progress = Math.max(winnerState.progress, Math.min(0.995, maxOther + 0.008));
    }

    progressFrames.push({
      at,
      progress: Object.fromEntries(states.map((state) => [state.dog.lane, round(state.progress, 5)])),
    });
  }

  const winnerState = states.find((state) => state.dog.lane === winner.lane)!;
  winnerState.progress = 1;
  winnerState.finishedAt = Math.min(winnerState.finishedAt || durationMs - 160, durationMs - 160);

  const sorted = [...states].sort((a, b) => {
    if (a.dog.lane === winner.lane) return -1;
    if (b.dog.lane === winner.lane) return 1;
    if (a.finishedAt && b.finishedAt) return a.finishedAt - b.finishedAt;
    return b.progress - a.progress;
  });

  const ranking = sorted.map((state) => state.dog.lane);
  const finishTimes: Record<number, number> = {};
  ranking.forEach((lane, index) => {
    finishTimes[lane] = index === 0 ? winnerState.finishedAt : durationMs - 90 + index * 70;
  });

  const lastFrame = progressFrames[progressFrames.length - 1];
  ranking.forEach((lane, index) => {
    lastFrame.progress[lane] = Math.max(0.94, 1 - index * 0.011);
  });
  lastFrame.progress[winner.lane] = 1;

  events.push({
    at: durationMs - 220,
    lane: winner.lane,
    type: "finish",
    message: `🏆 ${winner.lane}번 ${winner.name}가 가장 먼저 결승선을 통과합니다!`,
    intensity: 1.5,
  });

  return {
    winnerLane: winner.lane,
    ranking,
    finishTimes,
    progressFrames,
    events: events.sort((a, b) => a.at - b.at),
    durationMs,
  };
}
