import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import App from '../App';
import * as pptxExporter from '../pptxExporter';

vi.mock('../pptxExporter', () => ({
  exportSlideToPptx: vi.fn().mockResolvedValue(undefined),
}));

describe('WaffleFlow Studio — Integration Tests', () => {
  it('pre-loads 4-stage B2B SaaS Funnel with live SVG slide and legend', () => {
    render(<App />);

    expect(screen.getByText('WaffleFlow Studio')).toBeInTheDocument();
    expect(screen.getByText('Website Visitors')).toBeInTheDocument();
    expect(screen.getByText('Product Signups')).toBeInTheDocument();
    expect(screen.getByText('Active Teams')).toBeInTheDocument();
    expect(screen.getByText('Paid Customers')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Slide preview/i })).toBeInTheDocument();
  });

  it('allows switching tabs, aspect ratio, orientation, and editing stage drop-off %', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Toggle 4:3 Standard & Vertical Flow
    await user.click(screen.getByRole('button', { name: '4:3 Standard' }));
    await user.click(screen.getByRole('button', { name: /Vertical Flow/i }));
    expect(screen.getByText(/Slide 10\.00″ × 7\.50″/i)).toBeInTheDocument();

    // Edit Stage 2 drop-off % directly (from 66% to 50%) -> Stage 2 value becomes 5,000
    const dropoffInput = screen.getByLabelText('Step Drop-off %', {
      selector: '#stage-dropoff-1',
    });
    fireEvent.change(dropoffInput, { target: { value: '50' } });

    const stage2ValueInput = screen.getByLabelText('Stage Value', {
      selector: '#stage-val-1',
    }) as HTMLInputElement;
    expect(stage2ValueInput.value).toBe('5000');

    // Switch to Unit Icon tab and select Diamond + Outline
    await user.click(screen.getByRole('tab', { name: /Unit Icon/i }));
    await user.click(screen.getByRole('button', { name: 'Diamond' }));
    await user.click(screen.getByRole('button', { name: 'Outline Stroke' }));

    // Switch to Container tab and select Parliament / Arc-Dot Chart
    await user.click(screen.getByRole('tab', { name: /Container/i }));
    await user.click(screen.getByRole('button', { name: /Parliament \/ Arc-Dot Chart/i }));

    // Switch to Palettes tab and apply Corporate Emerald
    await user.click(screen.getByRole('tab', { name: /Palettes/i }));
    await user.click(screen.getByRole('button', { name: /Corporate Emerald/i }));
    expect(screen.getAllByDisplayValue('#1b4332').length).toBeGreaterThanOrEqual(1);
  });

  it('updates slide title inline and triggers native PPTX export', async () => {
    const user = userEvent.setup();
    render(<App />);

    const titleInput = screen.getByLabelText('Editable Slide Title');
    await user.clear(titleInput);
    await user.type(titleInput, 'Q1 Enterprise Pipeline');

    expect(
      screen.getByRole('img', { name: /Slide preview: Q1 Enterprise Pipeline/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Download Native PPTX/i }));
    await waitFor(() => {
      expect(pptxExporter.exportSlideToPptx).toHaveBeenCalledTimes(1);
    });
  });

  it('displays an accessible error banner when PPTX export throws (Red Pill)', async () => {
    const user = userEvent.setup();
    vi.mocked(pptxExporter.exportSlideToPptx).mockRejectedValueOnce(
      new Error('Mock PPTX serialization error'),
    );

    render(<App />);
    await user.click(screen.getByRole('button', { name: /Download Native PPTX/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Mock PPTX serialization error');

    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('supports Constant Slope mode and Transparent Connector Outlines on the connector polygons', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);

    await user.click(screen.getByRole('button', { name: 'Constant Slope' }));

    const connectorPolygon = container.querySelector(
      'svg > g:nth-of-type(2) > polygon:nth-of-type(1)',
    );
    expect(connectorPolygon).not.toBeNull();
    expect(connectorPolygon?.getAttribute('stroke')).toBe('#cbd5e1');

    await user.click(screen.getByLabelText(/Transparent Connector Outlines/i));

    expect(connectorPolygon?.getAttribute('stroke')).toBe('transparent');
    expect(connectorPolygon?.getAttribute('stroke-width')).toBe('0');
  });

  it('reveals per-stage Arc Length and Rotation controls in Stages tab for Parliament / Arc-Dot Chart', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);

    await user.click(screen.getByRole('tab', { name: /Container/i }));
    await user.click(screen.getByRole('button', { name: /Parliament \/ Arc-Dot Chart/i }));

    // Annular sector border paths should render on the slide
    expect(container.querySelectorAll('svg path').length).toBeGreaterThanOrEqual(4);

    // Switch back to Stages tab and adjust Stage 1 arc length & rotation
    await user.click(screen.getByRole('tab', { name: /Stages/i }));
    const arcInput = screen.getByLabelText('Stage 1 arc length degrees') as HTMLInputElement;
    const rotInput = screen.getByLabelText('Stage 1 arc rotation degrees') as HTMLInputElement;
    expect(arcInput.value).toBe('180');
    expect(rotInput.value).toBe('0');

    fireEvent.change(arcInput, { target: { value: '270' } });
    fireEvent.change(rotInput, { target: { value: '45' } });
    expect(arcInput.value).toBe('270');
    expect(rotInput.value).toBe('45');
  });

  it('allows enabling Multi-Color Container Segments on a stage and renders multiple icon colors and legend', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);

    const toggle = screen.getByLabelText('Stage 1 multi-color segments');
    await user.click(toggle);

    // Segment legend renders on the SVG canvas
    const legendGroup = container.querySelector('svg g[aria-label="Color segment legend"]');
    expect(legendGroup).not.toBeNull();
    expect(legendGroup?.textContent).toContain('Segment A (45%)');
    expect(legendGroup?.textContent).toContain('Segment B (35%)');
    expect(legendGroup?.textContent).toContain('Segment C (20%)');

    // Stage 1 icons inside the SVG should now have multiple distinct fill colors
    const stage1Group = container.querySelector('svg > g:nth-of-type(5)');
    const fills = new Set(
      Array.from(stage1Group?.querySelectorAll('rect, path, circle, polygon') ?? [])
        .map((el) => el.getAttribute('fill'))
        .filter((f) => f && f !== 'none'),
    );
    expect(fills.size).toBeGreaterThanOrEqual(3);

    // Add a 4th color segment and click Equal split
    await user.click(screen.getByRole('button', { name: /Add Color Segment/i }));
    await user.click(screen.getByRole('button', { name: /Equal split/i }));
    expect(legendGroup?.textContent).toContain('Segment D (25%)');
  });

  it('renders StudioFooter with exact tool links and marks current pathname as aria-current="page"', () => {
    const originalPath = window.location.pathname;
    window.history.replaceState({}, '', '/Waffle-Chart-Studio/');

    try {
      render(<App />);

      expect(screen.getByText('More chart makers from the studio')).toBeInTheDocument();

      const waffleLink = screen.getByRole('link', { name: /Waffle Chart Studio/i });
      const barsLink = screen.getByRole('link', { name: /Exec Bar Charts/i });
      const sankeyLink = screen.getByRole('link', { name: /Sankey Chart Studio/i });
      const allLink = screen.getByRole('link', { name: /All chart makers →/i });

      expect(waffleLink).toHaveAttribute(
        'href',
        'https://nirmalya-panigrahi.github.io/Waffle-Chart-Studio/',
      );
      expect(barsLink).toHaveAttribute(
        'href',
        'https://nirmalya-panigrahi.github.io/Exec-Bar-Charts/',
      );
      expect(sankeyLink).toHaveAttribute(
        'href',
        'https://nirmalya-panigrahi.github.io/Sankey-Chart-Studio/',
      );
      expect(allLink).toHaveAttribute(
        'href',
        'https://nirmalya-panigrahi.github.io/Executive-Charts/',
      );

      expect(waffleLink).toHaveAttribute('aria-current', 'page');
      expect(barsLink).not.toHaveAttribute('aria-current');
      expect(sankeyLink).not.toHaveAttribute('aria-current');
      expect(allLink).not.toHaveAttribute('aria-current');

      const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
      waffleLink.dispatchEvent(clickEvent);
      expect(clickEvent.defaultPrevented).toBe(true);
    } finally {
      window.history.replaceState({}, '', originalPath);
    }
  });
});
