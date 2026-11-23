import { useCallback, useMemo, useRef, useState } from 'react';
import { SlideCanvas } from './components/SlideCanvas';
import { SidebarTabs } from './components/SidebarTabs';
import { StudioFooter } from './components/StudioFooter';
import { TopToolbar } from './components/TopToolbar';
import { computeSlideLayout } from './gridPackingMath';
import { useCustomIconCache } from './hooks/useCustomIconCache';
import { INITIAL_STUDIO_CONFIG } from './palettes';
import { exportSlideToPptx } from './pptxExporter';
import { exportSlideToPng, exportSlideToSvg } from './svgPngExporter';
import {
  CustomUnitIcon,
  FunnelStage,
  PalettePreset,
  SidebarTabId,
  StudioConfig,
} from './types';

export default function App() {
  const [config, setConfig] = useState<StudioConfig>(INITIAL_STUDIO_CONFIG);
  const [activeTab, setActiveTab] = useState<SidebarTabId>('stages');
  const [mobileControlsOpen, setMobileControlsOpen] = useState(false);
  const [isExportingPptx, setIsExportingPptx] = useState(false);
  const [isExportingPng, setIsExportingPng] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);

  const layout = useMemo(() => computeSlideLayout(config), [config]);

  const {
    variants: customIconVariants,
    isProcessing: isProcessingCustomIcon,
    error: customIconError,
  } = useCustomIconCache(
    config.customIcon,
    config.renderStyle,
    config.stages,
    config.stageCount,
    config.inactiveTint,
  );

  const updateConfig = useCallback((patch: Partial<StudioConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleUpdateStage = useCallback((index: number, patch: Partial<FunnelStage>) => {
    setConfig((prev) => {
      const nextStages = prev.stages.map((st, idx) =>
        idx === index ? { ...st, ...patch } : st,
      );
      return { ...prev, stages: nextStages };
    });
  }, []);

  const handleUpdateStageByDropoff = useCallback((index: number, dropoffPct: number) => {
    setConfig((prev) => {
      if (index <= 0 || index >= prev.stages.length) return prev;
      const prevStageVal = prev.stages[index - 1].value;
      const clampedDrop = Math.max(0, Math.min(100, dropoffPct));
      const newVal = Math.round(prevStageVal * (1 - clampedDrop / 100));
      const nextStages = prev.stages.map((st, idx) =>
        idx === index ? { ...st, value: newVal } : st,
      );
      return { ...prev, stages: nextStages };
    });
  }, []);

  const handleSyncAllDensities = useCallback((density: number) => {
    setConfig((prev) => ({
      ...prev,
      stages: prev.stages.map((st) => ({ ...st, iconDensity: density })),
    }));
  }, []);

  const handleSyncAllArcs = useCallback((arcSweepDeg: number, arcRotationDeg: number) => {
    setConfig((prev) => ({
      ...prev,
      stages: prev.stages.map((st) => ({ ...st, arcSweepDeg, arcRotationDeg })),
    }));
  }, []);

  const handleSelectPalette = useCallback((palette: PalettePreset) => {
    setConfig((prev) => ({
      ...prev,
      activePaletteId: palette.id,
      stages: prev.stages.map((st, idx) => ({
        ...st,
        color: palette.colors[idx % palette.colors.length],
        colorSlices: st.colorSlices.map((sl, sIdx) => ({
          ...sl,
          color: palette.colors[sIdx % palette.colors.length],
        })),
      })),
    }));
  }, []);

  const handleStageColorChange = useCallback((index: number, color: string) => {
    setConfig((prev) => ({
      ...prev,
      activePaletteId: 'custom',
      stages: prev.stages.map((st, idx) => (idx === index ? { ...st, color } : st)),
    }));
  }, []);

  const handleCustomIconUpload = useCallback((customIcon: CustomUnitIcon | null) => {
    setConfig((prev) => ({ ...prev, customIcon }));
  }, []);

  const handleExportPptx = useCallback(async () => {
    setExportError(null);
    setIsExportingPptx(true);
    try {
      await exportSlideToPptx(config, layout);
    } catch (err) {
      setExportError(
        err instanceof Error ? err.message : 'Unable to generate PowerPoint PPTX file.',
      );
    } finally {
      setIsExportingPptx(false);
    }
  }, [config, layout]);

  const handleExportSvg = useCallback(() => {
    setExportError(null);
    if (!svgRef.current) {
      setExportError('Slide canvas is not ready for SVG export.');
      return;
    }
    try {
      exportSlideToSvg(svgRef.current, config.slideTitle);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Unable to export SVG.');
    }
  }, [config.slideTitle]);

  const handleExportPng = useCallback(async () => {
    setExportError(null);
    if (!svgRef.current) {
      setExportError('Slide canvas is not ready for PNG export.');
      return;
    }
    setIsExportingPng(true);
    try {
      await exportSlideToPng(
        svgRef.current,
        config.slideTitle,
        layout.slideWidth,
        layout.slideHeight,
      );
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Unable to export PNG.');
    } finally {
      setIsExportingPng(false);
    }
  }, [config.slideTitle, layout.slideWidth, layout.slideHeight]);

  return (
    <div className="min-h-screen lg:h-screen w-full flex flex-col lg:overflow-hidden bg-slate-100 text-slate-900">
      <TopToolbar
        aspectRatio={config.aspectRatio}
        orientation={config.orientation}
        isExportingPptx={isExportingPptx}
        isExportingPng={isExportingPng}
        onAspectRatioChange={(aspectRatio) => updateConfig({ aspectRatio })}
        onOrientationChange={(orientation) => updateConfig({ orientation })}
        onExportPptx={handleExportPptx}
        onExportSvg={handleExportSvg}
        onExportPng={handleExportPng}
        onToggleMobileControls={() => setMobileControlsOpen((o) => !o)}
        mobileControlsOpen={mobileControlsOpen}
      />

      {exportError && (
        <div
          role="alert"
          className="bg-red-50 border-b border-red-200 px-6 py-2 flex items-center justify-between text-xs text-red-700"
        >
          <span>Export error: {exportError}</span>
          <button
            type="button"
            onClick={() => setExportError(null)}
            className="font-semibold underline hover:text-red-900"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex-1 flex flex-col lg:flex-row min-h-0 relative">
        {/* Desktop Sidebar / Mobile Drawer */}
        <div
          className={`${
            mobileControlsOpen ? 'fixed inset-0 top-[57px] z-30 flex bg-black/30 lg:static lg:bg-transparent' : 'hidden lg:flex'
          } lg:h-full`}
        >
          <div className="w-full max-w-[420px] lg:w-[420px] h-full bg-white shadow-xl lg:shadow-none">
            <SidebarTabs
              activeTab={activeTab}
              onTabChange={setActiveTab}
              config={config}
              customIconVariants={customIconVariants}
              isProcessingCustomIcon={isProcessingCustomIcon}
              customIconError={customIconError}
              onUpdateConfig={updateConfig}
              onCustomIconUpload={handleCustomIconUpload}
              onUpdateStage={handleUpdateStage}
              onUpdateStageByDropoff={handleUpdateStageByDropoff}
              onSyncAllDensities={handleSyncAllDensities}
              onSyncAllArcs={handleSyncAllArcs}
              onSelectPalette={handleSelectPalette}
              onStageColorChange={handleStageColorChange}
            />
          </div>
          {mobileControlsOpen && (
            <button
              type="button"
              aria-label="Close controls overlay"
              className="flex-1 lg:hidden"
              onClick={() => setMobileControlsOpen(false)}
            />
          )}
        </div>

        {/* Live Slide Canvas */}
        <SlideCanvas
          config={config}
          layout={layout}
          customIconVariants={customIconVariants}
          svgRef={svgRef}
          onTitleChange={(slideTitle) => updateConfig({ slideTitle })}
          onSubtitleChange={(slideSubtitle) => updateConfig({ slideSubtitle })}
        />
      </div>

      <StudioFooter />
    </div>
  );
}
