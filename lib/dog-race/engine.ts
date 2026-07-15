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
  { dogKey: "minju", name: "민주", breed: "블랙 그레이하운드", emoji: "🐕" },
  { dogKey: "dusik", name: "두식", breed: "브라운 그레이하운드", emoji: "🐕" },
  { dogKey: "wangaji", name: "왕아지", breed: "화이트 그레이하운드", emoji: "🐕" },
  { dogKey: "saerobi", name: "새롭이", breed: "실버 그레이하운드", emoji: "🐕" },
  { dogKey: "wangchu", name: "왕츄", breed: "골드 그레이하운드", emoji: "🐕" },
  { dogKey: "bini", name: "비니", breed: "크림 그레이하운드", emoji: "🐕" },
] as const;

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function round(value: number, digits = 2) {
  const unit = 10 ** digits;
  return Math.round(value * unit) / unit;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
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

function smoothStep(value: number) {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
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
  const frameStep = 100;
  const winner = weightedPick(
    entries,
    entries.map((dog) => Math.max(1, dog.winProbability))
  );

  const events: RaceEvent[] = entries.map((dog) => ({
    at: 350,
    lane: dog.lane,
    type: "start",
    message: `${dog.lane}번 ${dog.name}, 힘차게 출발합니다!`,
    intensity: 1,
  }));

  const eventWindows = [2300, 3900, 5550, 7200, 8850];
  for (const at of eventWindows) {
    const candidate = entries[randomInt(0, entries.length - 1)];
    const mistakeChance = candidate.mistakeRate / 100;

    if (Math.random() < mistakeChance * 1.55) {
      events.push({
        at,
        lane: candidate.lane,
        type: "mistake",
        message: `😱 ${candidate.lane}번 ${candidate.name}가 휘청거립니다!`,
        intensity: 0.8 + Math.random() * 0.45,
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
        intensity: 0.9 + Math.random() * 0.45,
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

  // 최종 순위는 능력치와 경기 랜덤성을 함께 반영하되, 미리 뽑힌 우승자는 1위로 고정한다.
  const rankingScore = new Map<number, number>();
  for (const dog of entries) {
    const form =
      dog.speed * 0.32 +
      dog.stamina * 0.22 +
      dog.sprint * 0.28 +
      dog.composure * 0.12 -
      dog.mistakeRate * 0.45 +
      Math.random() * 22;
    rankingScore.set(dog.lane, form);
  }

  const ranking = [
    winner.lane,
    ...entries
      .filter((dog) => dog.lane !== winner.lane)
      .sort((a, b) => Number(rankingScore.get(b.lane)) - Number(rankingScore.get(a.lane)))
      .map((dog) => dog.lane),
  ];

  const finalProgress = new Map<number, number>();
  ranking.forEach((lane, index) => {
    finalProgress.set(lane, index === 0 ? 1 : 0.982 - index * 0.012);
  });

  const profiles = new Map(
    entries.map((dog) => [
      dog.lane,
      {
        phase: Math.random() * Math.PI * 2,
        waveA: 0.022 + Math.random() * 0.018,
        waveB: 0.010 + Math.random() * 0.012,
        early: (dog.speed - 78) / 1400,
        middle: (dog.stamina - 77) / 1700,
        late: (dog.sprint - 76) / 1250,
      },
    ])
  );

  const progressFrames: Array<{ at: number; progress: Record<number, number> }> = [];
  const previous: Record<number, number> = Object.fromEntries(entries.map((dog) => [dog.lane, 0]));

  for (let at = 0; at <= durationMs; at += frameStep) {
    const phase = clamp(at / durationMs, 0, 1);
    const eased = smoothStep(phase);
    const frame: Record<number, number> = {};

    for (const dog of entries) {
      const profile = profiles.get(dog.lane)!;
      const targetFinish = Number(finalProgress.get(dog.lane));

      // 각 강아지가 서로 다른 리듬으로 달려 중간 순위가 계속 바뀌도록 한다.
      const waveFade = Math.sin(Math.PI * phase);
      const wave =
        Math.sin(phase * Math.PI * 4.2 + profile.phase) * profile.waveA * waveFade +
        Math.sin(phase * Math.PI * 8.6 + profile.phase * 0.63) * profile.waveB * waveFade;

      const abilityShape =
        profile.early * Math.sin(Math.PI * clamp(phase / 0.45, 0, 1)) +
        profile.middle * Math.sin(Math.PI * clamp((phase - 0.25) / 0.55, 0, 1)) +
        profile.late * smoothStep(clamp((phase - 0.68) / 0.32, 0, 1));

      let eventOffset = 0;
      for (const event of events) {
        if (event.lane !== dog.lane || event.at > at) continue;
        const age = at - event.at;
        if (event.type === "mistake" && age <= 1200) {
          eventOffset -= (1 - age / 1200) * 0.035 * event.intensity;
        }
        if ((event.type === "surge" || event.type === "sprint") && age <= 1600) {
          eventOffset += (1 - age / 1600) * 0.025 * event.intensity;
        }
      }

      // 우승자는 후반에 자연스럽게 앞으로 나오고, 다른 강아지는 결승선 직전까지 경쟁한다.
      const winnerPush = dog.lane === winner.lane
        ? smoothStep(clamp((phase - 0.62) / 0.38, 0, 1)) * 0.032
        : 0;

      let target = eased * targetFinish + wave + abilityShape + eventOffset + winnerPush;
      target = clamp(target, 0, targetFinish);

      // 모든 프레임에서 최소 이동량을 보장해 출발선에 멈춰 있는 현상을 막는다.
      const minAdvance = phase > 0 && phase < 0.96 ? 0.0014 : 0;
      const next = Math.max(previous[dog.lane] + minAdvance, target);
      frame[dog.lane] = round(clamp(next, 0, targetFinish), 5);
      previous[dog.lane] = frame[dog.lane];
    }

    progressFrames.push({ at, progress: frame });
  }

  const lastFrame = progressFrames[progressFrames.length - 1];
  ranking.forEach((lane, index) => {
    lastFrame.progress[lane] = index === 0 ? 1 : round(0.982 - index * 0.012, 5);
  });

  const finishTimes: Record<number, number> = {};
  ranking.forEach((lane, index) => {
    finishTimes[lane] = index === 0 ? durationMs - 220 : durationMs - 110 + index * 55;
  });

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
