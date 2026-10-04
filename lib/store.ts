// Barrel: shared types/constants/helpers live in store-shared.ts (import
// nothing, so the platform impls can depend on it without a cycle).
// Platform implementations live in impl.native.ts (expo-sqlite) and
// impl.web.ts (localStorage). Metro resolves the right one per platform,
// so the web bundle never touches wa-sqlite (no COOP/COEP on Pages).
export * from "./impl";
export * from "./store-shared";
