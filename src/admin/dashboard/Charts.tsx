import React from 'react';

// ===================== LINE CHART =====================
interface LineChartProps {
  data: number[];
  labels: string[];
  color?: string;
  fillColor?: string;
  height?: number;
  showLabels?: boolean;
}

export const LineChart: React.FC<LineChartProps> = React.memo(({
  data, labels, color = '#0066FF', fillColor = 'rgba(0,102,255,0.1)', height = 200, showLabels = true,
}) => {
  if (data.length === 0) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const width = 100;
  const padding = 5;
  const chartWidth = width - padding * 2;
  const chartHeight = height - 24;
  const points = data.map((v, i) => {
    const x = padding + (i / (data.length - 1)) * chartWidth;
    const y = chartHeight - ((v - min) / range) * (chartHeight - padding * 2) - padding;
    return `${x},${y}`;
  });
  const polyline = points.join(' ');

  // Area fill
  const areaPoints = `${padding},${chartHeight - padding} ${polyline} ${padding + chartWidth},${chartHeight - padding}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: `${height}px` }}>
      {/* Grid lines */}
      {[0.25, 0.5, 0.75].map((f, i) => (
        <line key={i} x1={padding} y1={chartHeight - f * (chartHeight - padding * 2) - padding}
          x2={padding + chartWidth} y2={chartHeight - f * (chartHeight - padding * 2) - padding}
          stroke="rgba(255,255,255,0.05)" strokeWidth="0.3" />
      ))}
      {/* Area fill */}
      <polygon points={areaPoints} fill={fillColor} />
      {/* Line */}
      <polyline points={polyline} fill="none" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Dots */}
      {data.map((v, i) => (
        <circle key={i} cx={parseFloat(points[i].split(',')[0])} cy={parseFloat(points[i].split(',')[1])}
          r="1.5" fill={color} stroke="#0A0E1A" strokeWidth="0.5" />
      ))}
      {/* Labels */}
      {showLabels && labels.length > 0 && labels.filter((_, i) => i % Math.ceil(labels.length / 5) === 0 || i === labels.length - 1).map((l, i) => {
        const idx = labels.indexOf(l);
        const x = padding + (idx / (data.length - 1)) * chartWidth;
        return (
          <text key={i} x={x} y={height - 2} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="3" fontFamily="Inter, sans-serif">
            {l}
          </text>
        );
      })}
    </svg>
  );
});

LineChart.displayName = 'LineChart';

// ===================== AREA CHART =====================
interface AreaChartProps {
  data: number[];
  labels: string[];
  color?: string;
  fillColor?: string;
  height?: number;
}

export const AreaChart: React.FC<AreaChartProps> = React.memo(({
  data, labels, color = '#10B981', fillColor = 'rgba(16,185,129,0.15)', height = 160,
}) => {
  if (data.length === 0) return null;
  const max = Math.max(...data, 1);
  const width = 100;
  const padding = 3;
  const chartWidth = width - padding * 2;
  const chartHeight = height - 20;
  const points = data.map((v, i) => {
    const x = padding + (i / (data.length - 1)) * chartWidth;
    const y = chartHeight - (v / max) * (chartHeight - padding * 2);
    return `${x},${y}`;
  });
  const polyline = points.join(' ');
  const areaPoints = `${padding},${chartHeight} ${polyline} ${padding + chartWidth},${chartHeight}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: `${height}px` }}>
      <defs>
        <linearGradient id={`area-grad`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#area-grad)`} />
      <polyline points={polyline} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
});

AreaChart.displayName = 'AreaChart';

// ===================== BAR CHART =====================
interface BarChartProps {
  data: number[];
  labels: string[];
  color?: string;
  height?: number;
  barWidth?: number;
}

export const BarChart: React.FC<BarChartProps> = React.memo(({
  data, labels, color = '#0066FF', height = 180, barWidth = 0.6,
}) => {
  if (data.length === 0) return null;
  const max = Math.max(...data, 1);
  const width = 100;
  const padding = 5;
  const chartWidth = width - padding * 2;
  const chartHeight = height - 24;
  const barGap = chartWidth / data.length;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: `${height}px` }}>
      {/* Grid */}
      {[0.25, 0.5, 0.75].map((f, i) => (
        <line key={i} x1={padding} y1={chartHeight * (1 - f)} x2={padding + chartWidth} y2={chartHeight * (1 - f)}
          stroke="rgba(255,255,255,0.04)" strokeWidth="0.3" />
      ))}
      {/* Bars */}
      {data.map((v, i) => {
        const barH = (v / max) * chartHeight;
        const x = padding + i * barGap + barGap * (1 - barWidth) / 2;
        const y = chartHeight - barH;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barGap * barWidth} height={barH} rx="0.8" fill={color} opacity="0.8">
              <animate attributeName="height" from="0" to={barH} dur="0.5s" fill="freeze" />
              <animate attributeName="y" from={chartHeight} to={y} dur="0.5s" fill="freeze" />
            </rect>
            {labels.length > 0 && (
              <text x={x + (barGap * barWidth) / 2} y={height - 2} textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize="2.5" fontFamily="Inter, sans-serif">
                {labels[i]}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
});

BarChart.displayName = 'BarChart';

// ===================== DONUT CHART =====================
interface DonutChartProps {
  data: { label: string; value: number; color: string }[];
  size?: number;
  innerRadius?: number;
}

export const DonutChart: React.FC<DonutChartProps> = React.memo(({
  data, size = 160, innerRadius = 0.6,
}) => {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const cx = 50;
  const cy = 50;
  const r = 40;
  const ir = r * innerRadius;
  let angle = -90;

  const getArc = (startAngle: number, endAngle: number) => {
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
  };

  const getInnerArc = (startAngle: number, endAngle: number) => {
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    const x1 = cx + ir * Math.cos(startRad);
    const y1 = cy + ir * Math.sin(startRad);
    const x2 = cx + ir * Math.cos(endRad);
    const y2 = cy + ir * Math.sin(endRad);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${x2} ${y2} A ${ir} ${ir} 0 ${largeArc} 0 ${x1} ${y1}`;
  };

  const segments = data.map(d => {
    const sliceAngle = (d.value / total) * 360;
    const start = angle;
    const end = angle + sliceAngle;
    angle = end;
    return { ...d, start, end, sliceAngle };
  });

  return (
    <svg viewBox="0 0 100 100" style={{ width: `${size}px`, height: `${size}px` }}>
      {segments.map((s, i) => {
        const outer = getArc(s.start, s.end);
        const inner = getInnerArc(s.start, s.end);
        const startRad = (s.start * Math.PI) / 180;
        const endRad = (s.end * Math.PI) / 180;
        const x1 = cx + ir * Math.cos(startRad);
        const y1 = cy + ir * Math.sin(startRad);
        const x2 = cx + r * Math.cos(endRad);
        const y2 = cy + r * Math.sin(endRad);
        const largeArc = s.sliceAngle > 180 ? 1 : 0;

        return (
          <path key={i}
            d={`${outer} L ${x2} ${y2} ${inner} Z`}
            fill={s.color}
            opacity="0.9"
          >
            <animate attributeName="opacity" from="0" to="0.9" dur="0.3s" begin={`${i * 0.1}s`} fill="freeze" />
          </path>
        );
      })}
      {/* Center text */}
      <text x="50" y="46" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="700" fontFamily="Inter, sans-serif">
        {total}
      </text>
      <text x="50" y="56" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="4" fontFamily="Inter, sans-serif">
        Total
      </text>
    </svg>
  );
});

DonutChart.displayName = 'DonutChart';

// ===================== PIE CHART =====================
interface PieChartProps {
  data: { label: string; value: number; color: string }[];
  size?: number;
}

export const PieChart: React.FC<PieChartProps> = React.memo(({
  data, size = 140,
}) => {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const cx = 50;
  const cy = 50;
  const r = 42;
  let angle = -90;

  const segments = data.map(d => {
    const sliceAngle = (d.value / total) * 360;
    const start = angle;
    const end = angle + sliceAngle;
    const startRad = (start * Math.PI) / 180;
    const endRad = (end * Math.PI) / 180;
    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);
    const largeArc = sliceAngle > 180 ? 1 : 0;
    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    angle = end;
    return { ...d, path, sliceAngle };
  });

  return (
    <svg viewBox="0 0 100 100" style={{ width: `${size}px`, height: `${size}px` }}>
      {segments.map((s, i) => (
        <path key={i} d={s.path} fill={s.color} opacity="0.85">
          <animate attributeName="opacity" from="0" to="0.85" dur="0.3s" begin={`${i * 0.15}s`} fill="freeze" />
        </path>
      ))}
    </svg>
  );
});

PieChart.displayName = 'PieChart';