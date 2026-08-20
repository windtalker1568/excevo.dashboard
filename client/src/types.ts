export interface KpiData {
  totalAdvisors: number;
  avgEph: number | null;
  avgSph: number | null;
  totalQuality: number;
  avgTrueScore: number | null;
  avgPotentialScore: number | null;
}

export interface TrendPoint {
  date?: string;
  week?: string;
  eph?: number | null;
  sph?: number | null;
  trueScore?: number;
  potentialScore?: number;
}

export interface DashboardData {
  kpis: KpiData;
  ephSphTrend: TrendPoint[];
  qualityTrend: TrendPoint[];
  scoreDistribution: Record<string, number>;
  pipDistribution: { pip: number; noPip: number };
  topPeople: any[];
  recentQuality: any[];
}

export interface Person {
  advisor: string;
  teamLeader: string;
  eph: number | null;
  sph: number | null;
  currentWeekTrueScore: number | null;
  currentWeekPotentialScore: number | null;
  priorWeekTrueScore: number | null;
  priorWeekPotentialScore: number | null;
  trueScoreVariance: number | null;
  potentialScoreVariance: number | null;
  pipStatus: string;
}

export interface QualityRecord {
  teamLeader: string;
  advisor: string;
  weekCommencing: string;
  trueScore: number;
  potentialScore: number;
  lastWeekTrueScore?: number | null;
  lastWeekPotentialScore?: number | null;
  trueScoreVariance?: number | null;
  potentialScoreVariance?: number | null;
}

export interface PipRecord {
  advisor: string;
  teamLeader: string;
  dateAdded: string | null;
  reason: string;
  pipWeeks: number | null;
}
