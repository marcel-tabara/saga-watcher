export const PENDING = "PENDING";
export const RESOLVED = "RESOLVED";
export const REJECTED = "REJECTED";
export const CANCELLED = "CANCELLED";

export const IS_BROWSER = typeof window !== "undefined" && window.document;
export const IS_REACT_NATIVE =
  typeof navigator !== "undefined" && navigator.product === "ReactNative";

export const IGNORELIST = [
  'SELECT',
  'TAKE',
  'FORK',
  'RACE',
  'ALL',
  'CANCELLED',
  'CANCEL',
  'PENDING',
  'REJECTED'
]

export const defaultConfig = {
  level: 'debug',
  color: '#03A9F4',
  verbose: true,
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
    'padding: 10px; border-radius: 10px;',
  ].join('')
};