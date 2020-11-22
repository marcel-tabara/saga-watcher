/* eslint-disable no-console */
import * as is from '@redux-saga/is';
import get from 'lodash/get';
import remove from 'lodash/remove';
import { version } from '../package.json';
import { isRaceEffect } from './modules/checkers';
import {
    CANCELLED,
    defaultConfig,
    IGNORELIST,
    IS_BROWSER,
    IS_REACT_NATIVE,
    PENDING,
    REJECTED,
    RESOLVED,
} from './modules/constants';
import { getArgs, getData, getEffect  } from './modules/helper';
import logSaga from './modules/logSaga';
import Manager from './modules/Manager';

const mainStore = [];
const LOG_SAGAS_STYLE = 'font-weight: bold';

const globalScope = IS_BROWSER ? window : IS_REACT_NATIVE ? global : null;

const time = () =>
    typeof performance !== 'undefined' && performance.now
        ? performance.now()
        : Date.now();

const manager = new Manager();

const computeEffectDur = (effect) => {
    const now = time();
    Object.assign(effect, {
        end: now,
        duration: now - effect.start,
    });
};

const resolveEffect = (effectId, result) => {
    const effect = manager.get(effectId);

    if (is.task(result)) {
        result.toPromise().then(
            (taskResult) => {
                if (result.isCancelled()) {
                    cancelEffect(effectId);
                } else {
                    resolveEffect(effectId, taskResult);
                }
            },
            (taskError) => rejectEffect(effectId, taskError),
        );
    } else {
        computeEffectDur(effect);
        effect.status = RESOLVED;
        effect.result = result;
        if (isRaceEffect(effect.effect)) {
            setRaceWinner(effectId, result);
        }
    }
};

const rejectEffect = (effectId, error) => {
    const effect = manager.get(effectId);
    computeEffectDur(effect);
    effect.status = REJECTED;
    effect.error = error;
    if (isRaceEffect(effect.effect)) {
        setRaceWinner(effectId, error);
    }
};

const cancelEffect = (effectId) => {
    const effect = manager.get(effectId);
    computeEffectDur(effect);
    effect.status = CANCELLED;
};

const setRaceWinner = (raceEffectId, result) => {
    const winnerLabel = Object.keys(result)[0];
    for (const childId of manager.getChildIds(raceEffectId)) {
        const childEffect = manager.get(childId);
        if (childEffect.label === winnerLabel) {
            childEffect.winner = true;
        }
    }
};

const createSagaMonitor = (options = {}) => {
    const config = { ...defaultConfig, ...options };

    const {
        level,
        verbose,
        styles,
        color,
        rootSagaStart,
        effectTrigger,
        effectResolve,
        effectReject,
        effectCancel,
        actionDispatch,
    } = config;

    const rootSagaStarted = (desc) => {
        if (rootSagaStart) {
            console[level](
                '%c Root saga started:',
                styles,
                desc.saga.name || 'anonymous',
                desc.args,
            );
        }

        manager.setRootEffect(
            desc.effectId,
            Object.assign({}, desc, {
                status: PENDING,
                start: time(),
            }),
        );
    };

    const effectTriggered = (desc) => {
        if (effectTrigger) {
            const parent = getEffect(mainStore, {effectId: desc.parentEffectId});

            const getType = () =>
                get(desc, 'effect.payload.fn', false) ? 'function' : 'action';

            const msg =
                !IGNORELIST.includes(get(desc, 'effect.type', '')) &&
                get(desc, 'effect.type', false) &&
                parent
                    ? `${getData(parent, 'parent')} ${get(
                          desc,
                          'effect.type',
                          '',
                      ).toLowerCase()}s ${getData(desc, 'child')} ${getType()}`
                    : '';

            const shouldSave =
            //     !['takeLatest', 'takeEvery'].includes(
            //     get(desc, 'effect.payload.fn', ''),
            // ) &&
                ['FORK', 'CALL', 'PUT', 'ALL'].includes(
                    get(desc, 'effect.type', ''),
                )
            shouldSave &&
                mainStore.push(getArgs(desc));
            msg.length && console.log(`%c${msg}`, styles);

            console.log('########## desc', shouldSave, desc)
        }

        manager.set(
            desc.effectId,
            Object.assign({}, desc, {
                status: PENDING,
                start: time(),
            }),
        );
    };

    const cleanStore = effectId => {
        const current = getEffect(mainStore, {effectId});
        const parent = current && getEffect(mainStore, {effectId: current.parentEffectId});
        !Boolean(parent) && remove(mainStore, (e) => e.effectId === effectId);
    }

    const effectResolved = (effectId, result) => {
        if (effectResolve) {
            console[level]('%c effectResolved:', styles, effectId, result);
        }
        resolveEffect(effectId, result);
        cleanStore(effectId)
    };

    const effectRejected = (effectId, error) => {
        if (effectReject) {
            console[level]('%c effectRejected:', styles, effectId, error);
        }
        rejectEffect(effectId, error);
        cleanStore(effectId)
    };

    const effectCancelled = (effectId) => {
        if (effectCancel) {
            console[level]('%c effectCancelled:', styles, effectId);
        }
        cancelEffect(effectId);
        cleanStore(effectId)
    };

    const actionDispatched = (action) => {
        if (actionDispatch) {
            console[level]('%c actionDispatched:', styles, action);
        }
    };

    if (globalScope) {
        if (verbose) {
            console[level](
                'View Sagas by executing %c$$LogSagas()',
                LOG_SAGAS_STYLE,
                'in the console',
            );
        }
        // Export the snapshot-logging function to run from the browser console or extensions.
        globalScope.$$LogSagas = () => logSaga(manager, color);
        globalScope.$$LogStore = () => logStore(manager, color);
    }

    return {
        rootSagaStarted,
        effectTriggered,
        effectResolved,
        effectRejected,
        effectCancelled,
        actionDispatched,
    };
};

const logStore = () => {
    console.log('## Store ##', mainStore);
};

// Version
createSagaMonitor.VERSION = version;
logSaga.VERSION = version;

// Export the snapshot-logging function for arbitrary use by external code.
export { logSaga };
export { logStore };

// Export the `sagaMonitor` to pass to the middleware.
export default createSagaMonitor;
