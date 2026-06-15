/**
 * Calendar integration public surface: the provider registry and concrete providers.
 * The sync orchestration (store) imports from here; scheduling UI imports the store.
 */
export { appleCalendarProvider } from './AppleCalendarProvider';
export { icsProvider } from './IcsProvider';
export {
  AVAILABLE_PROVIDERS,
  DEFAULT_PROVIDER_ID,
  getCalendarProvider,
} from './registry';
