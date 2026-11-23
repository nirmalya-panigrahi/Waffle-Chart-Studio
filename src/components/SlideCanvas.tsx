import React, { useState } from 'react';
import {
  buildArcSectorSvgPath,
  computeSlicePercentages,
  formatCompactNumber,
  formatPercent,
  SVG_UNITS_PER_INCH,
} from '../gridPackingMath';
import { normalizeHexColor } from '../palettes';
import {
  AspectRatioMode,
  FlowOrientation,
  SlideLayoutResult,
  StudioConfig,
} from '../types';
import { UnitIconSvg } from './UnitIconRenderer';

interface SlideCanvasProps {
  config: StudioConfig;
  layout: SlideLayoutResult;
  customIconVariants: Record<string, string>;
  svgRef: React.RefObject<SVGSVGElement | null>;
  onTitleChange: (title: string) => void;
  onSubtitleChange: (subtitle: string) => void;
}

export const SlideCanvas: React.FC<SlideCanvasProps> = ({
  config,
  layout,
  customIconVariants,
  svgRef,
  onTitleChange,
  onSubtitleChange,
}) => {
  const [editingField, setEditingField] = useState<'title' | 'subtitle' | null>(null);

  const viewBoxW = layout.slideWidth * SVG_UNITS_PER_INCH;
  const viewBoxH = layout.slideHeight * SVG_UNITS_PER_INCH;
  const inactiveHex = normalizeHexColor(config.inactiveTint, '#e2e8f0');

  const isWide = config.aspectRatio === AspectRatioMode.WIDE_16_9;

  const multiColorStages = layout.stages.filter(
    (s) => s.metrics.stage.multiColorEnabled && s.metrics.stage.colorSlices.length > 0,
  );
  const showMultipleStagePrefixes = multiColorStages.length > 1;
  const legendEntries = multiColorStages.flatMap((s) => {
    const pcts = computeSlicePercentages(s.metrics.stage);
    return s.metrics.stage.colorSlices.map((slice, sIdx) => {
      const pctText = `${Math.round(pcts[sIdx] ?? 0)}%`;
      const labelText = showMultipleStagePrefixes
        ? `${s.metrics.stage.label}: ${slice.label} (${pctText})`
        : `${slice.label} (${pctText})`;
      return {
        key: `${s.metrics.stage.id}-${slice.id}`,
        color: normalizeHexColor(slice.color, s.metrics.stage.color),
        labelText,
      };
    });
  });

  // Compute single/two-row centered horizontal positions for SVG segment legend
  const legendMaxW = viewBoxW - 110;
  const legendPositioned: Array<{
    key: string;
    color: string;
    labelText: string;
    x: number;
    y: number;
  }> = [];
  if (legendEntries.length > 0) {
    const gapX = 20;
    const itemWidths = legendEntries.map((e) => 18 + Math.max(40, e.labelText.length * 6.8));
    const rows: Array<Array<{ entry: (typeof legendEntries)[number]; w: number }>> = [[]];
    let currRowW = 0;
    legendEntries.forEach((entry, idx) => {
      const w = itemWidths[idx];
      if (rows[rows.length - 1].length > 0 && currRowW + gapX + w > legendMaxW) {
        rows.push([{ entry, w }]);
        currRowW = w;
      } else {
        rows[rows.length - 1].push({ entry, w });
        currRowW += (rows[rows.length - 1].length > 1 ? gapX : 0) + w;
      }
    });
    const baseLegendY = rows.length > 1 ? viewBoxH - 44 : viewBoxH - 28;
    rows.forEach((row, rIdx) => {
      const rowTotalW =
        row.reduce((sum, item) => sum + item.w, 0) + Math.max(0, row.length - 1) * gapX;
      let cursorX = Math.max(55, (viewBoxW - rowTotalW) / 2);
      const rowY = baseLegendY + rIdx * 18;
      row.forEach(({ entry, w }) => {
        legendPositioned.push({
          ...entry,
          x: cursorX,
          y: rowY,
        });
        cursorX += w + gapX;
      });
    });
  }

  return (
    <main className="flex-1 bg-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-5 overflow-auto min-w-0">
      <div className="w-full max-w-[1060px] flex flex-col items-center">
        {/* Slide Paper Container matching exact 16:9 or 4:3 ratio */}
        <div
          className={`relative w-full bg-white rounded-sm shadow-[0_10px_34px_-6px_rgba(15,23,42,0.12),0_2px_8px_-2px_rgba(15,23,42,0.06)] border border-slate-200/80 overflow-hidden ${
            isWide ? 'aspect-[16/9]' : 'aspect-[4/3] max-w-[820px]'
          }`}
        >
          {/* Live 60fps SVG Slide Rendering */}
          <svg
            ref={svgRef}
            viewBox={`0 0 ${viewBoxW} ${viewBoxH}`}
            className="w-full h-full block select-none"
            role="img"
            aria-label={`Slide preview: ${config.slideTitle}`}
          >
            {/* White Slide Background */}
            <rect x={0} y={0} width={viewBoxW} height={viewBoxH} fill="#ffffff" />

            {/* Slide Title */}
            <text
              x={55}
              y={66}
              fill="#0f172a"
              fontSize={28}
              fontWeight={700}
              fontFamily="'Plus Jakarta Sans', Arial, sans-serif"
              opacity={editingField === 'title' ? 0 : 1}
            >
              {config.slideTitle || 'Untitled Funnel Slide'}
            </text>

            {/* Slide Subtitle */}
            <text
              x={55}
              y={96}
              fill="#475569"
              fontSize={14.5}
              fontWeight={400}
              fontFamily="'DM Sans', Arial, sans-serif"
              opacity={editingField === 'subtitle' ? 0 : 1}
            >
              {config.slideSubtitle}
            </text>

            {/* Automatic "1 icon = X units" Legend Badge */}
            <g>
              <rect
                x={viewBoxW - 345}
                y={40}
                width={290}
                height={38}
                rx={7}
                fill="#f8fafc"
                stroke="#e2e8f0"
                strokeWidth={1.2}
              />
              <text
                x={viewBoxW - 200}
                y={64}
                textAnchor="middle"
                fill="#334155"
                fontSize={12.5}
                fontWeight={600}
                fontFamily="'JetBrains Mono', Arial, monospace"
              >
                {layout.legendText}
              </text>
            </g>

            {/* Header Divider */}
            <line
              x1={55}
              y1={122}
              x2={viewBoxW - 55}
              y2={122}
              stroke="#e2e8f0"
              strokeWidth={1.2}
            />

            {/* Transition Connectors & Drop-off Badges */}
            {layout.connectors.map((conn) => {
              const pts = conn.polygon
                .map((p) => `${(p.x * SVG_UNITS_PER_INCH).toFixed(1)},${(p.y * SVG_UNITS_PER_INCH).toFixed(1)}`)
                .join(' ');
              const bx = conn.badgeCenter.x * SVG_UNITS_PER_INCH;
              const by = conn.badgeCenter.y * SVG_UNITS_PER_INCH;
              return (
                <g key={`conn-${conn.fromStageIndex}-${conn.toStageIndex}`}>
                  <polygon
                    points={pts}
                    fill="#f1f5f9"
                    fillOpacity={0.75}
                    stroke={config.transparentConnectorOutline ? 'transparent' : '#cbd5e1'}
                    strokeWidth={config.transparentConnectorOutline ? 0 : 1}
                    strokeDasharray={config.transparentConnectorOutline ? undefined : '4 3'}
                  />
                  <rect
                    x={bx - 29}
                    y={by - 12}
                    width={58}
                    height={24}
                    rx={6}
                    fill="#ffffff"
                    stroke={config.transparentConnectorOutline ? 'transparent' : '#cbd5e1'}
                    strokeWidth={config.transparentConnectorOutline ? 0 : 1.1}
                  />
                  <text
                    x={bx}
                    y={by + 4}
                    textAnchor="middle"
                    fill="#dc2626"
                    fontSize={11}
                    fontWeight={700}
                    fontFamily="'JetBrains Mono', Arial, monospace"
                  >
                    -{formatPercent(conn.dropoffPct)}
                  </text>
                </g>
              );
            })}

            {/* Stages: Polygon Borders, Unit Cells, Stage Headers */}
            {layout.stages.map((stageLayout) => {
              const { metrics, polygon, headerBox, cells } = stageLayout;
              const stageHex = normalizeHexColor(metrics.stage.color);
              const polyPts = polygon
                .map((p) => `${(p.x * SVG_UNITS_PER_INCH).toFixed(1)},${(p.y * SVG_UNITS_PER_INCH).toFixed(1)}`)
                .join(' ');

              const hx = headerBox.x * SVG_UNITS_PER_INCH;
              const hy = headerBox.y * SVG_UNITS_PER_INCH;
              const hw = headerBox.w * SVG_UNITS_PER_INCH;
              const hh = headerBox.h * SVG_UNITS_PER_INCH;
              const isHoriz = config.orientation === FlowOrientation.HORIZONTAL;

              const subParts: string[] = [];
              if (config.showAbsoluteValues) {
                subParts.push(formatCompactNumber(metrics.stage.value));
              }
              if (config.showPercentageBadges) {
                subParts.push(`${formatPercent(metrics.retentionPct)} of total`);
              }

              return (
                <g key={metrics.stage.id}>
                  {/* Optional Trapezoid / Container / Parliament Arc Border */}
                  {config.showTrapezoidBorder &&
                    (stageLayout.arcGeometry ? (
                      <path
                        d={buildArcSectorSvgPath(stageLayout.arcGeometry, SVG_UNITS_PER_INCH)}
                        fill="none"
                        fillRule="evenodd"
                        stroke={normalizeHexColor(config.trapezoidBorderColor, '#cbd5e1')}
                        strokeWidth={1.4}
                      />
                    ) : (
                      <polygon
                        points={polyPts}
                        fill="none"
                        stroke={normalizeHexColor(config.trapezoidBorderColor, '#cbd5e1')}
                        strokeWidth={1.4}
                      />
                    ))}

                  {/* Individual Unit Icons */}
                  {cells.map((cell, cellIdx) => {
                    const color = cell.color ?? (cell.active ? stageHex : inactiveHex);
                    const customImgUrl = customIconVariants[color];
                    return (
                      <UnitIconSvg
                        key={`${metrics.stage.id}-${cellIdx}`}
                        preset={config.iconPreset}
                        renderStyle={config.renderStyle}
                        x={cell.x * SVG_UNITS_PER_INCH}
                        y={cell.y * SVG_UNITS_PER_INCH}
                        w={cell.w * SVG_UNITS_PER_INCH}
                        h={cell.h * SVG_UNITS_PER_INCH}
                        color={color}
                        opacity={cell.isGhostOutsideTaper ? 0.45 : 1}
                        customImageDataUrl={customImgUrl}
                      />
                    );
                  })}

                  {/* Stage Header, Absolute Value, Retention % */}
                  {config.showStageHeaders && (
                    <g>
                      <text
                        x={isHoriz ? hx + hw / 2 : hx}
                        y={isHoriz ? hy + 22 : hy + hh * 0.42}
                        textAnchor={isHoriz ? 'middle' : 'start'}
                        fill="#0f172a"
                        fontSize={15}
                        fontWeight={700}
                        fontFamily="'Plus Jakarta Sans', Arial, sans-serif"
                      >
                        {metrics.stage.label}
                      </text>
                      {subParts.length > 0 && (
                        <text
                          x={isHoriz ? hx + hw / 2 : hx}
                          y={isHoriz ? hy + 44 : hy + hh * 0.42 + 22}
                          textAnchor={isHoriz ? 'middle' : 'start'}
                          fill={stageHex}
                          fontSize={12.5}
                          fontWeight={600}
                          fontFamily="'JetBrains Mono', Arial, monospace"
                        >
                          {subParts.join(' · ')}
                        </text>
                      )}
                    </g>
                  )}
                </g>
              );
            })}

            {/* Multi-Color Segment Legend Strip */}
            {legendPositioned.length > 0 && (
              <g aria-label="Color segment legend">
                <line
                  x1={55}
                  y1={viewBoxH - 60}
                  x2={viewBoxW - 55}
                  y2={viewBoxH - 60}
                  stroke="#e2e8f0"
                  strokeWidth={1}
                />
                {legendPositioned.map((item) => (
                  <g key={item.key}>
                    <rect
                      x={item.x}
                      y={item.y - 10}
                      width={11}
                      height={11}
                      rx={2.5}
                      fill={item.color}
                    />
                    <text
                      x={item.x + 16}
                      y={item.y - 1}
                      fill="#334155"
                      fontSize={11}
                      fontWeight={600}
                      fontFamily="'DM Sans', Arial, sans-serif"
                    >
                      {item.labelText}
                    </text>
                  </g>
                ))}
              </g>
            )}
          </svg>

          {/* Seamless Inline Editable Overlay Inputs for Slide Title & Subtitle */}
          <input
            type="text"
            value={config.slideTitle}
            onChange={(e) => onTitleChange(e.target.value)}
            onFocus={() => setEditingField('title')}
            onBlur={() => setEditingField(null)}
            aria-label="Editable Slide Title"
            title="Click to edit slide title"
            style={{
              left: `${(55 / viewBoxW) * 100}%`,
              top: `${(36 / viewBoxH) * 100}%`,
              width: `${((viewBoxW - 420) / viewBoxW) * 100}%`,
              height: `${(38 / viewBoxH) * 100}%`,
            }}
            className="absolute bg-transparent text-transparent focus:text-slate-900 focus:bg-white/95 hover:outline hover:outline-1 hover:outline-dashed hover:outline-slate-300 focus:outline-2 focus:outline-[#003f5c] rounded px-1 font-display font-bold text-sm sm:text-base lg:text-xl transition-colors"
          />
          <input
            type="text"
            value={config.slideSubtitle}
            onChange={(e) => onSubtitleChange(e.target.value)}
            onFocus={() => setEditingField('subtitle')}
            onBlur={() => setEditingField(null)}
            aria-label="Editable Slide Subtitle"
            title="Click to edit slide subtitle"
            placeholder="Add slide subtitle..."
            style={{
              left: `${(55 / viewBoxW) * 100}%`,
              top: `${(77 / viewBoxH) * 100}%`,
              width: `${((viewBoxW - 420) / viewBoxW) * 100}%`,
              height: `${(26 / viewBoxH) * 100}%`,
            }}
            className="absolute bg-transparent text-transparent placeholder:text-transparent focus:placeholder:text-slate-400 focus:text-slate-700 focus:bg-white/95 hover:outline hover:outline-1 hover:outline-dashed hover:outline-slate-300 focus:outline-2 focus:outline-[#003f5c] rounded px-1 text-xs sm:text-sm transition-colors"
          />
        </div>

        {/* Clean Unboxed Slide Metadata Row */}
        <div className="w-full mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 px-1">
          <div className="flex items-center gap-2 tabular-nums">
            <span>
              Slide {layout.slideWidth.toFixed(2)}″ × {layout.slideHeight.toFixed(2)}″
            </span>
            <span aria-hidden="true">·</span>
            <span>{layout.totalIconsRendered.toLocaleString('en-US')} unit icons</span>
            <span aria-hidden="true">·</span>
            <span>Click title or subtitle on slide to edit</span>
          </div>
          <div className="tabular-nums">
            <span>
              {config.stageCount} {config.stageCount === 1 ? 'stage' : 'stages'}
            </span>
            <span className="mx-1.5" aria-hidden="true">
              ·
            </span>
            <span>{layout.legendText}</span>
          </div>
        </div>
      </div>
    </main>
  );
};
