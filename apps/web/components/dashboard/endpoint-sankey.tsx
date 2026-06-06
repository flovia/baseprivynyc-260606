"use client";

import { ResponsiveSankey } from "@nivo/sankey";

export type EndpointSankeyFlow = {
  from: string;
  to: string;
  fromStep?: 0 | 1;
  toStep?: 1 | 2;
  occurrences: number;
  fromLabel?: string;
  toLabel?: string;
};

type EndpointSankeyProps = {
  flows: EndpointSankeyFlow[];
  compact?: boolean;
  ariaLabel?: string;
  emptyMessage?: string;
  height?: number;
  minWidth?: number;
  labelFontSize?: number;
  margin?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
};

type SankeyNode = { id: string; displayLabel: string; step: 0 | 1 | 2 };
type SankeyLink = { source: string; target: string; value: number };

const NODE_COLORS: Record<string, string> = {
  "/api/premium-signal": "#2F5A82",
  "/api/premium-signal-plus": "#7A5C22",
  starter_upsell: "#2C7A7B",
  loyalty_bundle: "#1F7A52",
  "agentic.market": "#2F5A82",
  privy: "#2C7A7B",
  hermes: "#7A5C22",
  "pay.sh": "#7B61A8",
};

const FALLBACK_STEP_COLORS: Record<SankeyNode["step"], string> = {
  0: "#2F5A82",
  1: "#2C7A7B",
  2: "#7A5C22",
};

export function EndpointSankey({
  flows,
  compact = false,
  ariaLabel = "Endpoint workflow Sankey diagram",
  emptyMessage = "No endpoint flow detected.",
  height,
  minWidth,
  labelFontSize,
  margin,
}: EndpointSankeyProps) {
  if (flows.length === 0) {
    return <div className="text-sm text-text-mute">{emptyMessage}</div>;
  }

  const data = buildSankeyData(flows);
  const resolvedHeight = height ?? (compact ? 220 : 320);
  const resolvedMinWidth = minWidth ?? (compact ? 420 : 560);
  const resolvedLabelFontSize = labelFontSize ?? (compact ? 10 : 12);
  const resolvedMargin = margin ?? (compact ? { top: 8, right: 104, bottom: 8, left: 12 } : { top: 12, right: 132, bottom: 12, left: 16 });

  return (
    <div className="w-full overflow-x-auto rounded-lg border bg-surface-card">
      <div style={{ height: resolvedHeight, minWidth: resolvedMinWidth, width: "100%", minHeight: resolvedHeight }}>
        <ResponsiveSankey<SankeyNode, SankeyLink>
          data={data}
          margin={resolvedMargin}
          align="justify"
          sort="input"
          colors={(node) => nodeFill(node)}
          nodeThickness={compact ? 10 : 14}
          nodeSpacing={compact ? 8 : 12}
          nodeBorderWidth={1}
          nodeBorderRadius={4}
          nodeBorderColor={{ from: "color", modifiers: [["darker", 0.25]] }}
          nodeOpacity={0.95}
          linkOpacity={0.45}
          linkHoverOpacity={0.8}
          linkContract={compact ? 1 : 2}
          enableLinkGradient
          enableLabels
          label={(node) => node.displayLabel}
          labelPosition="outside"
          labelPadding={compact ? 6 : 10}
          labelTextColor="var(--text-2)"
          valueFormat={(value) => `${value}x`}
          role="img"
          ariaLabel={ariaLabel}
          animate={false}
          theme={{
            text: { fill: "var(--text-2)", fontSize: resolvedLabelFontSize },
            tooltip: {
              container: {
                background: "var(--surface-card)",
                color: "var(--text-1)",
                border: "1px solid var(--line)",
                borderRadius: 8,
                boxShadow: "var(--shadow-2)",
                fontSize: 12,
              },
            },
          }}
        />
      </div>
    </div>
  );
}

function buildSankeyData(flows: EndpointSankeyFlow[]): { nodes: SankeyNode[]; links: SankeyLink[] } {
  const nodesById = new Map<string, SankeyNode>();
  const linksByKey = new Map<string, SankeyLink>();

  flows.forEach((flow, index) => {
    const fromStep = flow.fromStep ?? (index % 2 === 0 ? 0 : 1);
    const toStep = flow.toStep ?? ((fromStep + 1) as 1 | 2);
    const source = nodeId(fromStep, flow.from);
    const target = nodeId(toStep, flow.to);

    if (!nodesById.has(source)) {
      nodesById.set(source, {
        id: source,
        displayLabel: flow.fromLabel ?? formatNodeLabel(flow.from),
        step: fromStep,
      });
    }
    if (!nodesById.has(target)) {
      nodesById.set(target, {
        id: target,
        displayLabel: flow.toLabel ?? formatNodeLabel(flow.to),
        step: toStep,
      });
    }

    const key = `${source}->${target}`;
    const link = linksByKey.get(key) ?? { source, target, value: 0 };
    link.value += flow.occurrences;
    linksByKey.set(key, link);
  });

  return {
    nodes: [...nodesById.values()],
    links: [...linksByKey.values()].filter((link) => link.value > 0),
  };
}

function nodeId(step: number, endpoint: string): string {
  return `${step}:${endpoint}`;
}

function rawNodeId(id: string): string {
  return id.split(":").slice(1).join(":") || id;
}

function nodeFill(node: SankeyNode): string {
  return NODE_COLORS[rawNodeId(node.id)] ?? FALLBACK_STEP_COLORS[node.step];
}

function formatNodeLabel(value: string): string {
  if (value.startsWith("/api/")) return value;
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
