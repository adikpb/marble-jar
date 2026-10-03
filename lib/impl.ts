// Fallback for typecheckers/bundlers without platform resolution.
// Metro picks impl.native.ts on iOS/Android and impl.web.ts on web.
export * from "./impl.web";
