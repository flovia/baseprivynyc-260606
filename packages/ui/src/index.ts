export type MetricCardProps = {
  label: string;
  value: string;
  delta?: string;
};

export function formatMetricCard(props: MetricCardProps): string {
  return props.delta ? `${props.label}: ${props.value} (${props.delta})` : `${props.label}: ${props.value}`;
}
