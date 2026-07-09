// ID di build iniettato da Vite (vite.config.ts, `define`): cambia da solo a
// ogni build/deploy, niente più bump manuali. Il fallback "dev" copre contesti
// senza define (test node, tsc).
declare const __APP_BUILD_ID__: string | undefined;

export const APP_BUILD_ID: string =
  typeof __APP_BUILD_ID__ === "string" ? __APP_BUILD_ID__ : "dev";
