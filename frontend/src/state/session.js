// Re-export from the canonical platform session module
// to ensure all imports share the same reactive sessionState object.
export {
  applySessionContextForTest,
  hasSessionCapability,
  hydrateSessionState,
  sessionState,
  setPreferredLocale,
} from '../platform/state/session';
