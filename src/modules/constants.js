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
