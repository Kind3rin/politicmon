import { npcImage, type Facing } from "../../art/characters";
import type { NpcDef } from "../../data/maps";
import { Screen, VIEW_H, VIEW_W } from "../../engine/screen";
import { INK } from "../../ui/widgets";

export interface RuntimeNpc extends NpcDef {
  currentFacing: Facing;
  turnTimer: number;
  homeX: number;
  homeY: number;
  dispX: number;
  dispY: number;
  walkTimer: number;
  stepFrom: { x: number; y: number } | null;
  stepT: number;
  canWander: boolean;
  path?: Array<{ x: number; y: number }>;
}

export interface NpcDrawCommand {
  baseY: number;
  draw: () => void;
}

export function npcMarkerVisible(screenX: number, screenY: number): boolean {
  const centerX = screenX + 8;
  const centerY = screenY + 8;
  return centerX >= 0 && centerX < VIEW_W && centerY >= 0 && centerY < VIEW_H;
}

export function npcNameplateLayout(nameplate: string, screenX: number, screenY: number): { x: number; y: number; width: number } | null {
  if (!npcMarkerVisible(screenX, screenY)) return null;
  const width = nameplate.length * 6 + 4;
  return {
    x: Math.max(2, Math.min(VIEW_W - width - 2, screenX + 8 - width / 2)),
    y: Math.max(2, screenY - 17),
    width
  };
}

export function buildNpcDrawCommand(options: {
  screen: Screen;
  npc: RuntimeNpc;
  camX: number;
  camY: number;
  time: number;
  exclaim: boolean;
  rematchReady: boolean;
  legendaryReady: boolean;
  drawShadow: (x: number, y: number) => void;
}): NpcDrawCommand {
  const { screen, npc, camX, camY, time, exclaim, rematchReady, legendaryReady, drawShadow } = options;
  const nx = Math.round(npc.dispX) - camX;
  const ny = Math.round(npc.dispY) - camY - 1;
  const moving = Boolean(npc.stepFrom);
  const walkCycle = moving ? Math.floor(time * 8) % 4 : 0;
  const image = npcImage(npc.pal, npc.currentFacing, walkCycle, moving);

  return {
    baseY: npc.dispY + 16,
    draw: () => {
      drawShadow(nx + 8, ny + 15);
      if (legendaryReady) {
        const pulse = 0.5 + 0.5 * Math.sin(time * 4);
        const grow = Math.round(pulse * 3);
        screen.rect(nx - 4 - grow, ny - grow, 24 + grow * 2, 24 + grow * 2, `rgba(240,200,64,${(0.10 + pulse * 0.12).toFixed(2)})`);
        screen.rect(nx - grow, ny + 4 - grow, 16 + grow * 2, 16 + grow * 2, `rgba(240,200,64,${(0.16 + pulse * 0.16).toFixed(2)})`);
        for (let index = 0; index < 4; index += 1) {
          const angle = time * 3 + (index * Math.PI) / 2;
          screen.text("*", nx + 8 + Math.round(Math.cos(angle) * 12), ny + 6 + Math.round(Math.sin(angle) * 8), "#fff0a0");
        }
      }
      if (image) {
        const bounds = screen.imageBounds(image);
        const scale = 22 / bounds.h;
        const width = bounds.w * scale;
        screen.imageSpriteCropped(image, nx + 8 - width / 2, ny + 16 - bounds.h * scale, { scaleX: scale, scaleY: scale });
      }
      if (legendaryReady) {
        const label = "LEGGENDARIO";
        const width = label.length * 6 + 4;
        const x = Math.max(2, Math.min(VIEW_W - width - 2, nx + 8 - width / 2));
        screen.rect(x, ny - 11, width, 9, "rgba(40,20,60,0.92)");
        screen.text(label, x + 2, ny - 10, Math.floor(time * 2) % 2 === 0 ? "#ffe870" : "#f0c040");
      }
      const nameplate = npc.nameplate ? npcNameplateLayout(npc.nameplate, nx, ny) : null;
      if (npc.nameplate && nameplate) {
        screen.rect(nameplate.x, nameplate.y, nameplate.width, 8, "rgba(16,20,31,0.85)");
        screen.text(npc.nameplate, nameplate.x + 2, nameplate.y + 1, "#f0c040");
      }
      if (exclaim || rematchReady) {
        screen.panel(nx + 2, ny - 13, 12, 13);
        screen.text("!", nx + 5, ny - 10, exclaim ? INK : "#c89a1a");
      }
    }
  };
}
