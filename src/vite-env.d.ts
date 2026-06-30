/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEGRADE_MOBILE_2_5D?: string | boolean;
  readonly VITE_DEGRADE_SHARE_CARD_3D?: string | boolean;
  readonly VITE_DEGRADE_FOG_SHADER?: string | boolean;
  readonly VITE_DEGRADE_DESKTOP_3D?: string | boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
