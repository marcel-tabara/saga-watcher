/* eslint-disable no-console */
import * as is from '@redux-saga/is'
import { version } from '../package.json'
import { isRaceEffect } from './modules/checkers'
import {
  CANCELLED,
  defaultConfig,
  IS_BROWSER,
  IS_REACT_NATIVE,
  PENDING,
  REJECTED,
  RESOLVED,
} from './modules/constants'
import { getArgs, getEffect } from './modules/helper'
import logSaga from './modules/logSaga'
import Manager from './modules/Manager'

const mainStore = []
const LOG_SAGAS_STYLE = 'font-weight: bold'

const globalScope = IS_BROWSER ? window : IS_REACT_NATIVE ? global : null

const time = () =>
  typeof performance !== 'undefined' && performance.now
    ? performance.now()
    : Date.now()

const manager = new Manager()

const computeEffectDur = effect => {
  const now = time()
  Object.assign(effect, {
    end: now,
    duration: now - effect.start,
  })
}

const resolveEffect = (effectId, result) => {
  const effect = manager.get(effectId)

  if (is.task(result)) {
    result.toPromise().then(
      taskResult => {
        if (result.isCancelled()) {
          cancelEffect(effectId)
        } else {
          resolveEffect(effectId, taskResult)
        }
      },
      taskError => rejectEffect(effectId, taskError)
    )
  } else {
    computeEffectDur(effect)
    effect.status = RESOLVED
    effect.result = result
    if (isRaceEffect(effect.effect)) {
      setRaceWinner(effectId, result)
    }
  }
}

const rejectEffect = (effectId, error) => {
  const effect = manager.get(effectId)
  computeEffectDur(effect)
  effect.status = REJECTED
  effect.error = error
  if (isRaceEffect(effect.effect)) {
    setRaceWinner(effectId, error)
  }
}

const cancelEffect = effectId => {
  const effect = manager.get(effectId)
  computeEffectDur(effect)
  effect.status = CANCELLED
}

const setRaceWinner = (raceEffectId, result) => {
  const winnerLabel = Object.keys(result)[0]
  for (const childId of manager.getChildIds(raceEffectId)) {
    const childEffect = manager.get(childId)
    if (childEffect.label === winnerLabel) {
      childEffect.winner = true
    }
  }
}

const createSagaMonitor = (options = {}) => {
  const config = { ...defaultConfig, ...options }

  const {
    level,
    styles,
    rootSagaStart,
    effectTrigger,
    effectResolve,
    effectReject,
    effectCancel,
    actionDispatch,
    showDataWithMessage,
    getMessage,
    cleanStore,
  } = config

  const rootSagaStarted = desc => {
    if (rootSagaStart) {
      console[level](
        '%c Root saga started:',
        styles,
        desc.saga.name || 'anonymous',
        desc.args
      )
    }

    manager.setRootEffect(
      desc.effectId,
      Object.assign({}, desc, {
        status: PENDING,
        start: time(),
      })
    )
  }

  let totalMessages = 0

  const effectTriggered = desc => {
    if (effectTrigger) {
      const parent = getEffect(mainStore, {
        effectId: desc.parentEffectId,
      })

      const msg = getMessage(desc, parent)

      msg && totalMessages++

      mainStore.push(getArgs(desc))
      msg
        ? showDataWithMessage
          ? console.log(`%c${msg}`, styles, { current: desc, parent })
          : console.log(`%c${msg}`, styles)
        : undefined
    }

    manager.set(
      desc.effectId,
      Object.assign({}, desc, {
        status: PENDING,
        start: time(),
      })
    )
  }

  const getCleanStoreData = effectId => {
    const current = getEffect(mainStore, { effectId })
    const parent =
      current && getEffect(mainStore, { effectId: current.parentEffectId })
    return { current, parent, mainStore }
  }

  const effectResolved = (effectId, result) => {
    if (effectResolve) {
      console[level]('%c effectResolved:', styles, effectId, result)
    }
    resolveEffect(effectId, result)
    cleanStore(getCleanStoreData(effectId))
  }

  const effectRejected = (effectId, error) => {
    if (effectReject) {
      console[level]('%c effectRejected:', styles, effectId, error)
    }
    rejectEffect(effectId, error)
    cleanStore(getCleanStoreData(effectId))
  }

  const effectCancelled = effectId => {
    if (effectCancel) {
      console[level]('%c effectCancelled:', styles, effectId)
    }
    cancelEffect(effectId)
    cleanStore(getCleanStoreData(effectId))
  }

  const actionDispatched = action => {
    if (actionDispatch) {
      console[level]('%c actionDispatched:', styles, action)
    }
  }

  if (globalScope) {
    console[level](
      'View Sagas by executing %c$$LogSagas()',
      LOG_SAGAS_STYLE,
      'in the console'
    )

    globalScope.$$LogSagas = () => logSaga(manager, styles.color)
    globalScope.$$LogStore = () => logStore(manager, styles.color)
    globalScope.$$LogTotalMessages = () =>
      logTotalMessages(manager, styles.color)
  }

  return {
    rootSagaStarted,
    effectTriggered,
    effectResolved,
    effectRejected,
    effectCancelled,
    actionDispatched,
  }
}

const logStore = () => {
  console.log('## Store ##', mainStore)
}
const logTotalMessages = () => {
  console.log('## Messages ##', totalMessages)
}

createSagaMonitor.VERSION = version
logSaga.VERSION = version

export { logSaga }
export { logStore }
export { logTotalMessages }

export default createSagaMonitor
