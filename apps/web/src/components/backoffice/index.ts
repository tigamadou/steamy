// Primitives du back-office Next.js (SPEC-TECHNIQUE §2.4-2.5) : import réservé à `app/(backoffice)` (règle ESLint).
export { AdminContent, AdminHeader, type AdminHeaderProps } from "./AdminHeader";
export { AdminShell, type AdminShellProps } from "./AdminShell";
export { BarChart, type BarChartProps } from "./BarChart";
export { ChartData, type ChartDataProps } from "./ChartData";
export { DataTable, type DataColumn, type DataTableProps } from "./DataTable";
export { DeadlineTracker, type DeadlineStep } from "./DeadlineTracker";
export { DonutChart, ratio, type DonutChartProps } from "./DonutChart";
export { KpiStatusBadge, type KpiStatus } from "./KpiStatusBadge";
export { SegmentedControl, type SegmentedControlProps, type SegmentOption } from "./SegmentedControl";
export { SourceTag, SOURCE_KINDS, type KpiSource } from "./SourceTag";
export { Sparkline, type SparklineProps } from "./Sparkline";
export { StatCard, type DeltaTone, type StatCardProps } from "./StatCard";
export { StatusBadge, type StatusBadgeProps, type StatusTone } from "./StatusBadge";
export { CARD, FOCUS, formatNumber } from "./styles";
export { PendingPanel, type PendingPanelProps } from "./PendingPanel";
