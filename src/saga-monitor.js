/* eslint-disable no-console */
import * as is from "@redux-saga/is"
import get from 'lodash/get'
import {
  CANCELLED,
  IS_BROWSER,
  IS_REACT_NATIVE,
  PENDING,
  REJECTED,
  RESOLVED
} from "./modules/constants"
import { isRaceEffect } from "./modules/checkers"
import logSaga from "./modules/logSaga"
import Manager from "./modules/Manager"
import { version } from "../package.json"
import remove from 'lodash/remove'

const mainStore = { effects: [] }
const LOG_SAGAS_STYLE = "font-weight: bold"

const globalScope = IS_BROWSER ? window : IS_REACT_NATIVE ? global : null

const time = () => typeof performance !== "undefined" && performance.now
  ? performance.now()
  : Date.now()

const manager = new Manager()

const computeEffectDur = (effect) => {
  const now = time()
  Object.assign(effect, {
    end: now,
    duration: now - effect.start
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

const cancelEffect = (effectId) => {
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

const defaultConfig = {
  level: "debug",
  color: "#03A9F4",
  verbose: true,
  rootSagaStart: false,
  effectTrigger: false,
  effectResolve: false,
  effectReject: false,
  effectCancel: false,
  actionDispatch: false
}

const createSagaMonitor = (options = {}) => {
  const config = { ...defaultConfig, ...options }

  const {
    level,
    verbose,
    color,
    rootSagaStart,
    effectTrigger,
    effectResolve,
    effectReject,
    effectCancel,
    actionDispatch
  } = config

  let styles = [`color: ${color}`, "font-weight: bold"].join("")

  const rootSagaStarted = (desc) => {
    if (rootSagaStart) {
      console[level]("%c Root saga started:", styles, desc.saga.name || "anonymous", desc.args)
    }

    manager.setRootEffect(
      desc.effectId,
      Object.assign({}, desc, {
        status: PENDING,
        start: time()
      })
    )
  }

  const getDetails = data => {
    const parent = mainStore.effects.find(e => e.effectId === data.parentEffectId)
    return parent && parent.payload
  }

  const effectTriggered = (desc) => {
    if (effectTrigger) {
      const getArgs = args => {
        if (!Boolean(args)) {
          return ''
        } else if (Array.isArray(args)) {
          return getArgFromArray(args)
        }

        switch ( typeof args) {
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

      const getArgFromArray = arg => arg.map(e => getArgs(e))
      const getArgFromObject = arg => {
        let tmp = {}

        for (const [key, value] of Object.entries(arg)) {
          tmp[key] = getArgs(value)
        }
        return tmp
      }
      const record = {
        effectId: desc.effectId,
        type: desc.effect.type,
        parentEffectId: desc.parentEffectId,
        payload: getArgs(desc.effect.payload),
      }

      mainStore.effects.push(record)
      // console[level]("%c effectTriggered:", styles, desc.effectId, desc)
      const details = getDetails(desc)

      console.log('########## mainStore', mainStore)

      get(details, 'fn', false) &&
        get(details, 'args[0].type', false) &&
        get(desc, 'effect.payload.action.type', false) &&
        console.log(`%c ${get(details, 'fn', 'some saga')} listens ${get(details, 'args[0].type', 'some action')} and ${get(desc, 'effect.type', 'calls').toLowerCase()}s ${get(desc, 'effect.payload.action.type', 'some other stuff')}`, 'color: red')
    }

    manager.set(
      desc.effectId,
      Object.assign({}, desc, {
        status: PENDING,
        start: time()
      })
    )
  }

  const effectResolved = (effectId, result) => {
    if (effectResolve) {
      console[level]("%c effectResolved:", styles, effectId, result)
    }

    const current = mainStore.effects.find(e => e.effectId === effectId)
    const parent = current && mainStore.effects.find(e => e.effectId === current.parentEffectId)

    resolveEffect(effectId, result)

    // current && console.log('########## current.type', current.type)
    const shouldRemove = ['PUT'].includes(get(current, 'type', 'ASA')) || !parent || parent.type === undefined

    if (shouldRemove) {
      console.log('########## REMOVING ', effectId,  get(parent, 'effectId', '---'))
    }

    shouldRemove && remove(mainStore.effects, e => e.effectId === effectId || e.effectId === get(parent, 'effectId'))
  }

  const effectRejected = (effectId, error) => {
    if (effectReject) {
      console[level]("%c effectRejected:", styles, effectId, error)
    }
    rejectEffect(effectId, error)
  }

  const effectCancelled = (effectId) => {
    if (effectCancel) {
      console[level]("%c effectCancelled:", styles, effectId)
    }
    cancelEffect(effectId)
  }

  const actionDispatched = (action) => {
    if (actionDispatch) {
      console[level]("%c actionDispatched:", styles, action)
    }
  }

  if (globalScope) {
    if (verbose) {
      console[level]("View Sagas by executing %c$$LogSagas()", LOG_SAGAS_STYLE, "in the console")
    }
    // Export the snapshot-logging function to run from the browser console or extensions.
    globalScope.$$LogSagas = () => logSaga(manager, color)
  }

  return {
    rootSagaStarted,
    effectTriggered,
    effectResolved,
    effectRejected,
    effectCancelled,
    actionDispatched
  }
}

// Version
createSagaMonitor.VERSION = version
logSaga.VERSION = version

// Export the snapshot-logging function for arbitrary use by external code.
export { logSaga }

// Export the `sagaMonitor` to pass to the middleware.
export default createSagaMonitor
