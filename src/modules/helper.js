import get from 'lodash/get'

export const getEffect = (mainStore, data) =>
  mainStore.find(
    e => e.effectId === data.parentEffectId || e.effectId === data.effectId
  )

export const getArgs = args => {
  const getArgFromArray = arg => arg.map(e => getArgs(e))
  const getArgFromObject = arg => {
    let tmp = {}

    for (const [key, value] of Object.entries(arg)) {
      tmp[key] = getArgs(value)
    }
    return tmp
  }

  if (!Boolean(args)) {
    return ''
  } else if (Array.isArray(args)) {
    return getArgFromArray(args)
  }

  switch (typeof args) {
    case 'function':
      return args.name
    case 'object':
      return getArgFromObject(args)
    case 'number':
    case 'bigint':
    case 'boolean':
    case 'string':
      return args
    default:
      return undefined
  }
}

export const getMessage = ({ current, parent, mainStore }) => {
  const ignoredEffects = [
    'SELECT',
    'TAKE',
    'FORK',
    'RACE',
    'ALL',
    'CANCELLED',
    'CANCEL',
    'PENDING',
    'REJECTED',
  ]

  const getPayloadArgNotObject = () =>
    typeof get(parent, 'effect.payload.args[0]') !== 'object'
      ? get(parent, 'effect.payload.args[0]', '')
      : ''
  const sameOne = () => {
    if (typeof get(parent, 'effect.payload.args[0]') === 'object') {
      return false
    }
    return (
      get(current, 'effect.payload.fn.name', '').toLowerCase() ===
      getPayloadArgNotObject().toString().toLowerCase()
    )
  }

  const getMessageData = () => {
    try {
      return `${get(parent, 'effect.payload.fn', '')} ${get(
        parent,
        'effect.type',
        ''
      ).toLowerCase()}ed by ${get(
        parent,
        'effect.payload.args[0].type',
        ''
      )}${getPayloadArgNotObject()} ${get(
        current,
        'effect.type',
        ''
      ).toLowerCase()}s ${
        get(current, 'effect.payload.action.type') ||
        get(current, 'effect.payload.fn.name') ||
        '?'
      }`
    } catch (error) {
      return console.log('########## error', error)
    }
  }

  return !ignoredEffects.includes(get(current, 'effect.type', '')) &&
    get(current, 'effect.type', false) &&
    parent &&
    !sameOne() &&
    get(parent, 'effect.payload.fn', '').length &&
    get(parent, 'effect.payload.args', '').length
    ? getMessageData()
    : undefined
}

export const cleanStore = ({ current, parent, mainStore }) =>
  current && parent
    ? mainStore.filter(e => e.effectId !== current.effectId)
    : mainStore
