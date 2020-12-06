import { cleanStore, getMessage } from './helper';

export const PENDING = 'PENDING';
export const RESOLVED = 'RESOLVED';
export const REJECTED = 'REJECTED';
export const CANCELLED = 'CANCELLED';

export const IS_BROWSER = typeof window !== 'undefined' && window.document;
export const IS_REACT_NATIVE =
  typeof navigator !== 'undefined' && navigator.product === 'ReactNative';

export const defaultConfig = {
  level: 'debug',
  rootSagaStart: false,
  effectTrigger: false,
  effectResolve: false,
  effectReject: false,
  effectCancel: false,
  actionDispatch: false,
  styles: [
    `color: red;`,
    'font-weight: bold;',
    'background: #F0F0F0;',
    'padding: 5px; border-radius: 5px;',
  ].join(''),
  showDataWithMessage: true,
  getMessage: (current, parent) => getMessage(current, parent),
  cleanStore: (current, parent, mainStore) =>
    cleanStore(current, parent, mainStore),
};
