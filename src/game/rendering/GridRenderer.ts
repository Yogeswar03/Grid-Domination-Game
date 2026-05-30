// ═══════════════════════════════════════════════════════════════
// TERRITORY DOMINATION — Grid Renderer (Background Grid Lines)
// ═══════════════════════════════════════════════════════════════

import { GAME_CONFIG } from '@/types/game';
import { hexToPixel, hexCorners } from '@/utils/hexMath';
import { THEME } from '@/utils/colors';
import { ViewportManager } from './ViewportManager';

const HEX_SIZE = GAME_CONFIG.HEX_SIZE;

export class GridRenderer {
  /** Pre-built Path2D for a unit hex at origin — reused for all cells. */
  private unitHexPath: Path2D | null = null;

  /**
   * Draw the background hex grid lines for the visible area.
   * Only draws cells that are within the map bounds and visible viewport.
   */
  render(
    ctx: CanvasRenderingContext2D,
    viewport: ViewportManager,
    mapSize: number = GAME_CONFIG.MAP_SIZE,
  ): void {
    const range = viewport.getVisibleRange();

    // Clamp to map bounds
    const minQ = Math.max(0, range.minQ);
    const maxQ = Math.min(mapSize - 1, range.maxQ);
    const minR = Math.max(0, range.minR);
    const maxR = Math.min(mapSize - 1, range.maxR);

    // Skip grid lines at very low zoom — they become visual noise
    if (viewport.zoom < 0.3) return;

    // Fade grid lines at low zoom
    const gridAlpha = viewport.zoom < 0.6
      ? (viewport.zoom - 0.3) / 0.3
      : 1;

    ctx.strokeStyle = THEME.GRID_LINE;
    ctx.globalAlpha = gridAlpha * 0.6;
    ctx.lineWidth = 1 / viewport.zoom; // Constant screen-space width

    // Batch all grid lines into a single path for fewer draw calls
    const batchPath = new Path2D();

    for (let q = minQ; q <= maxQ; q++) {
      for (let r = minR; r <= maxR; r++) {
        const { x, y } = hexToPixel(q, r);
        const corners = hexCorners(x, y, HEX_SIZE);

        batchPath.moveTo(corners[0].x, corners[0].y);
        for (let i = 1; i < 6; i++) {
          batchPath.lineTo(corners[i].x, corners[i].y);
        }
        batchPath.closePath();
      }
    }

    ctx.stroke(batchPath);

    // Draw coordinate labels if zoomed in
    if (viewport.zoom > 1.2) {
      ctx.save();
      ctx.font = '7px var(--font-mono)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(0, 255, 204, 0.15)';
      for (let q = minQ; q <= maxQ; q++) {
        for (let r = minR; r <= maxR; r++) {
          const { x, y } = hexToPixel(q, r);
          ctx.fillText(`${q},${r}`, x, y);
        }
      }
      ctx.restore();
    }

    ctx.globalAlpha = 1;
  }
}
