import { memo, useMemo, useState } from 'react';
import { classifyAQI } from '../shared/aqi.ts';
import type { AQIStandard, HourlyAirPoint } from '../shared/types.ts';

interface AQIChartProps {
  points: HourlyAirPoint[];
  standard: AQIStandard;
}

export const AQIChart = memo(function AQIChart({ points, standard }: AQIChartProps) {
  const [selectedIndex, setSelectedIndex] = useState<number>(() => {
    const firstForecast = points.findIndex((p) => p.isForecast);
    return firstForecast > 0 ? firstForecast - 1 : 0;
  });

  const safePoints = useMemo(() => points.slice(0, 24), [points]);

  if (safePoints.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-[#5E7068]">
        Hourly pollution trend data is currently unavailable for this location.
      </div>
    );
  }

  const maxVal = Math.max(100, ...safePoints.map((p) => p.aqi));
  const chartCeiling = Math.ceil(maxVal / 50) * 50;
  const activeIdx = Math.min(selectedIndex, safePoints.length - 1);
  const activePoint = safePoints[activeIdx];
  const activeCategory = classifyAQI(activePoint.aqi, standard);

  const width = 680;
  const height = 210;
  const padLeft = 38;
  const padRight = 16;
  const padTop = 18;
  const padBottom = 32;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const getX = (idx: number) =>
    padLeft + (safePoints.length === 1 ? plotW / 2 : (idx / (safePoints.length - 1)) * plotW);
  const getY = (aqi: number) => padTop + plotH - (Math.min(aqi, chartCeiling) / chartCeiling) * plotH;

  const linePath = safePoints
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(idx).toFixed(1)} ${getY(p.aqi).toFixed(1)}`)
    .join(' ');

  const areaPath = `${linePath} L ${getX(safePoints.length - 1).toFixed(1)} ${(
    padTop + plotH
  ).toFixed(1)} L ${getX(0).toFixed(1)} ${(padTop + plotH).toFixed(1)} Z`;

  const forecastStartIdx = safePoints.findIndex((p) => p.isForecast);
  const minPoint = safePoints.reduce((min, p) => (p.aqi < min.aqi ? p : min), safePoints[0]);
  const maxPoint = safePoints.reduce((max, p) => (p.aqi > max.aqi ? p : max), safePoints[0]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div
          className="text-sm text-[#4A5B54] flex flex-wrap items-center gap-2"
          aria-live="polite"
        >
          <span className="font-medium text-[#111C18] font-mono tabular-nums">
            {activePoint.hourLabel}
          </span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums font-semibold text-[#111C18]">
            AQI {activePoint.aqi}
          </span>
          <span aria-hidden="true">·</span>
          <span className={`font-medium ${activeCategory.textColorClass}`}>
            {activeCategory.label}
          </span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums">
            PM2.5 {activePoint.pm25} µg/m³
          </span>
          <span aria-hidden="true">·</span>
          <span>{activePoint.isForecast ? 'Forecast' : 'Observed'}</span>
        </div>

        <div className="text-xs text-[#5E7068] font-mono tabular-nums">
          Low {minPoint.aqi} ({minPoint.hourLabel}) / Peak {maxPoint.aqi} ({maxPoint.hourLabel})
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`24-hour AQI trend from ${safePoints[0].hourLabel} to ${
            safePoints[safePoints.length - 1].hourLabel
          }. Lowest AQI ${minPoint.aqi} at ${minPoint.hourLabel}; peak AQI ${maxPoint.aqi} at ${
            maxPoint.hourLabel
          }.`}
          className="w-full h-auto min-w-[460px]"
        >
          <defs>
            <linearGradient id="airwiseAqiArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1F7A5C" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#1F7A5C" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Horizontal reference gridlines */}
          {[0, 0.5, 1].map((fraction) => {
            const val = Math.round(chartCeiling * fraction);
            const y = getY(val);
            return (
              <g key={fraction}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="#E2E8E5"
                  strokeWidth="1"
                />
                <text
                  x={padLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  fill="#5E7068"
                  fontSize="11"
                  fontFamily="IBM Plex Mono, monospace"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Forecast divider line */}
          {forecastStartIdx > 0 && (
            <g>
              <line
                x1={getX(forecastStartIdx)}
                y1={padTop}
                x2={getX(forecastStartIdx)}
                y2={padTop + plotH}
                stroke="#94A39D"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <text
                x={getX(forecastStartIdx) + 6}
                y={padTop + 11}
                fill="#5E7068"
                fontSize="10"
                fontFamily="DM Sans, sans-serif"
              >
                Forecast
              </text>
            </g>
          )}

          {/* Area and line */}
          <path d={areaPath} fill="url(#airwiseAqiArea)" />
          <path
            d={linePath}
            fill="none"
            stroke="#11382B"
            strokeWidth="2.2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Pointer-interactive chart markers (non-focusable inside role=img; keyboard control provided via slider below) */}
          {safePoints.map((pt, idx) => {
            const cx = getX(idx);
            const cy = getY(pt.aqi);
            const ptCat = classifyAQI(pt.aqi, standard);
            const isSelected = idx === activeIdx;
            const showLabel = idx % 4 === 0 || idx === safePoints.length - 1;

            return (
              <g key={`${pt.timeIso}-${idx}`}>
                {showLabel && (
                  <text
                    x={cx}
                    y={height - 8}
                    textAnchor="middle"
                    fill="#5E7068"
                    fontSize="10.5"
                    fontFamily="IBM Plex Mono, monospace"
                  >
                    {pt.hourLabel}
                  </text>
                )}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isSelected ? 5.5 : 3.2}
                  fill={isSelected ? ptCat.barColorHex : '#FFFFFF'}
                  stroke={ptCat.barColorHex}
                  strokeWidth={isSelected ? 2.5 : 2}
                  onClick={() => setSelectedIndex(idx)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className="cursor-pointer"
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Dedicated WCAG 2.2 AA Keyboard Hour Scrubber */}
      {safePoints.length > 1 && (
        <div className="flex items-center gap-3 pt-1">
          <label
            htmlFor="aqi-hour-scrubber"
            className="text-xs font-medium text-[#4A5B54] whitespace-nowrap"
          >
            Inspect hour
          </label>
          <input
            id="aqi-hour-scrubber"
            type="range"
            min={0}
            max={safePoints.length - 1}
            step={1}
            value={activeIdx}
            aria-valuetext={`${activePoint.hourLabel}, AQI ${activePoint.aqi} (${activeCategory.label}), PM2.5 ${activePoint.pm25} micrograms per cubic meter`}
            onChange={(e) => setSelectedIndex(Number(e.target.value))}
            className="flex-1 accent-[#11382B]"
          />
          <span className="text-xs font-mono tabular-nums text-[#5E7068] whitespace-nowrap">
            {activePoint.hourLabel}
          </span>
        </div>
      )}

      {/* Screen-reader accessible tabular companion for WCAG 2.2 AA */}
      <table className="sr-only">
        <caption>24-hour hourly AQI and PM2.5 trend</caption>
        <thead>
          <tr>
            <th scope="col">Hour</th>
            <th scope="col">Type</th>
            <th scope="col">AQI</th>
            <th scope="col">PM2.5 (µg/m³)</th>
          </tr>
        </thead>
        <tbody>
          {safePoints.map((pt, idx) => (
            <tr key={`sr-${pt.timeIso}-${idx}`}>
              <td>{pt.hourLabel}</td>
              <td>{pt.isForecast ? 'Forecast' : 'Observed'}</td>
              <td>{pt.aqi}</td>
              <td>{pt.pm25}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});
