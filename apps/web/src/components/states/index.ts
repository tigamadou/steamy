// Enveloppes transverses WX01-WX03 et 404 (SPEC-ECRANS-3 §6), réutilisées par tous les espaces.
export { AppStateBoundary, AppStateFallback, type AppStateBoundaryProps } from "./AppStateBoundary";
export { registerOf, STATE_ACTIONS, STATE_MESSAGES, type Register, type StateKind } from "./messages";
export { OfflineGate } from "./OfflineGate";
export {
  ErrorState,
  LoadingState,
  NotFoundState,
  OfflineState,
  type ErrorStateProps,
  type OfflineStateProps,
  type StateTone,
} from "./presets";
export { WXLoading, WXState, type WXLoadingProps, type WXStateProps } from "./WXState";
