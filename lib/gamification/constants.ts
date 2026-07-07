export const MIN_WEEKLY_PARTICIPATION = 5;

export const SCORE_WEIGHTS = {
  completion: 0.35,
  office: 0.2,
  onTime: 0.25,
  quality: 0.2,
} as const;

export const XP_REWARDS = {
  taskApproved: { LOW: 75, MEDIUM: 100, HIGH: 150 },
  onTimeBonus: 25,
  noRevisionBonus: 50,
  officeSameDay: 25,
  dailyReport: 15,
  streakDay: 10,
} as const;

export type BadgeDefinition = {
  key: string;
  label: string;
  description: string;
  icon: "flame" | "star" | "zap" | "shield" | "trophy" | "target" | "award";
  category: "streak" | "quality" | "speed" | "milestone" | "office";
};

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    key: "first_approved",
    label: "İlk Onay",
    description: "İlk görevin onaylandı.",
    icon: "star",
    category: "milestone",
  },
  {
    key: "tasks_10",
    label: "10 Görev",
    description: "10 görev onaylandı.",
    icon: "target",
    category: "milestone",
  },
  {
    key: "tasks_50",
    label: "50 Görev",
    description: "50 görev onaylandı.",
    icon: "trophy",
    category: "milestone",
  },
  {
    key: "streak_7",
    label: "7 Gün Seri",
    description: "7 gün üst üste aktif performans.",
    icon: "flame",
    category: "streak",
  },
  {
    key: "streak_30",
    label: "30 Gün Seri",
    description: "30 gün üst üste aktif performans.",
    icon: "flame",
    category: "streak",
  },
  {
    key: "quality_master",
    label: "Kalite Ustası",
    description: "En az 10 teslimde %90+ kalite skoru.",
    icon: "award",
    category: "quality",
  },
  {
    key: "on_time_pro",
    label: "Zamanında Pro",
    description: "Son teslim tarihli 5+ görevde %90+ zamanında teslim.",
    icon: "zap",
    category: "speed",
  },
  {
    key: "office_hero",
    label: "Ofis Kahramanı",
    description: "Ofis görevlerinde %95+ tamamlama (min. 10 görev).",
    icon: "shield",
    category: "office",
  },
  {
    key: "reliable",
    label: "Güvenilir",
    description: "Birleşik tamamlama oranı %85+ (min. 15 katılım).",
    icon: "shield",
    category: "quality",
  },
];

export const BADGE_MAP = Object.fromEntries(
  BADGE_DEFINITIONS.map((b) => [b.key, b])
) as Record<string, BadgeDefinition>;

export const LEVEL_TITLES: Record<number, string> = {
  1: "Çaylak",
  2: "Stajyer",
  3: "Deneyimli",
  4: "Uzman",
  5: "Usta",
  6: "Şampiyon",
  7: "Efsane",
};

export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return 100 * level * level;
}

export function levelFromXp(xp: number): {
  level: number;
  title: string;
  progress: number;
  xpInLevel: number;
  xpToNext: number;
} {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level++;

  const currentThreshold = xpForLevel(level);
  const nextThreshold = xpForLevel(level + 1);
  const span = nextThreshold - currentThreshold;
  const xpInLevel = xp - currentThreshold;
  const progress = span > 0 ? Math.min(100, (xpInLevel / span) * 100) : 100;

  return {
    level,
    title: LEVEL_TITLES[level] ?? LEVEL_TITLES[7]!,
    progress,
    xpInLevel,
    xpToNext: Math.max(0, nextThreshold - xp),
  };
}
