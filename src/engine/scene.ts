import type { Screen } from "./screen";

export interface Scene {
  update(dt: number): void;
  draw(screen: Screen): void;
  // Se true, la scena sottostante resta visibile (menu sovrapposti).
  readonly transparent?: boolean;
  onEnter?(): void;
  onExit?(): void;
}

export class SceneStack {
  private scenes: Scene[] = [];

  get top(): Scene | undefined {
    return this.scenes[this.scenes.length - 1];
  }

  push(scene: Scene): void {
    this.scenes.push(scene);
    scene.onEnter?.();
  }

  pop(): void {
    const scene = this.scenes.pop();
    scene?.onExit?.();
  }

  replace(scene: Scene): void {
    while (this.scenes.length > 0) {
      this.pop();
    }
    this.push(scene);
  }

  // Sostituisce solo la scena in cima (es. battaglia -> mondo).
  swapTop(scene: Scene): void {
    this.pop();
    this.push(scene);
  }

  update(dt: number): void {
    this.top?.update(dt);
  }

  draw(screen: Screen): void {
    // Trova la prima scena dal fondo che va disegnata (gestione trasparenza).
    let start = this.scenes.length - 1;
    while (start > 0 && this.scenes[start].transparent) {
      start -= 1;
    }
    for (let i = start; i < this.scenes.length; i += 1) {
      this.scenes[i].draw(screen);
    }
  }
}
