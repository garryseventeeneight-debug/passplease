export interface RadarChartDatum {
  label: string;
  value: number; // 0-maxValue
}

const TRUNCATE_AT = 22;

function truncate(label: string) {
  return label.length > TRUNCATE_AT ? label.slice(0, TRUNCATE_AT - 1) + "…" : label;
}

export function RadarChart({
  data,
  size = 320,
  maxValue = 100,
}: {
  data: RadarChartDatum[];
  size?: number;
  maxValue?: number;
}) {
  const center = size / 2;
  const radius = size / 2 - 56;
  const n = data.length;
  if (n < 3) {
    return (
      <p className="text-sm text-neutral-500">Need at least 3 topics for a radar chart.</p>
    );
  }
  const angleStep = (2 * Math.PI) / n;

  function pointFor(i: number, value: number): [number, number] {
    const angle = angleStep * i - Math.PI / 2;
    const r = (Math.max(0, Math.min(value, maxValue)) / maxValue) * radius;
    return [center + r * Math.cos(angle), center + r * Math.sin(angle)];
  }

  const dataPoints = data.map((d, i) => pointFor(i, d.value));
  const polygonPoints = dataPoints.map((p) => p.join(",")).join(" ");
  const gridLevels = [0.25, 0.5, 0.75, 1];

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="max-w-full">
      {gridLevels.map((level) => (
        <polygon
          key={level}
          points={data.map((_, i) => pointFor(i, maxValue * level).join(",")).join(" ")}
          fill="none"
          className="stroke-neutral-200 dark:stroke-neutral-800"
          strokeWidth={1}
        />
      ))}
      {data.map((_, i) => {
        const [x, y] = pointFor(i, maxValue);
        return (
          <line
            key={i}
            x1={center}
            y1={center}
            x2={x}
            y2={y}
            className="stroke-neutral-200 dark:stroke-neutral-800"
            strokeWidth={1}
          />
        );
      })}
      <polygon
        points={polygonPoints}
        className="fill-blue-500/25 stroke-blue-500"
        strokeWidth={2}
      />
      {dataPoints.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={3} className="fill-blue-500" />
      ))}
      {data.map((d, i) => {
        const [x, y] = pointFor(i, maxValue * 1.18);
        const angle = angleStep * i - Math.PI / 2;
        const cos = Math.cos(angle);
        const anchor = cos > 0.3 ? "start" : cos < -0.3 ? "end" : "middle";
        return (
          <text
            key={i}
            x={x}
            y={y}
            textAnchor={anchor}
            dominantBaseline="middle"
            fontSize={10}
            className="fill-neutral-600 dark:fill-neutral-400"
          >
            <title>{d.label}</title>
            {truncate(d.label)}
          </text>
        );
      })}
    </svg>
  );
}
