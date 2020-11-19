/* eslint-disable no-console */
import * as is from '@redux-saga/is';
import get from 'lodash/get';
import remove from 'lodash/remove';
import { version } from '../package.json';
import { isRaceEffect } from './modules/checkers';
import {
    CANCELLED,
    IGNORELIST,
    IS_BROWSER,
    IS_REACT_NATIVE,
    PENDING,
    REJECTED,
    RESOLVED,
} from './modules/constants';
import logSaga from './modules/logSaga';
import Manager from './modules/Manager';

const mainStore = { effects: [] };
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

const defaultConfig = {
    level: 'debug',
    color: '#03A9F4',
    verbose: true,
    rootSagaStart: false,
    effectTrigger: false,
    effectResolve: false,
    effectReject: false,
    effectCancel: false,
    actionDispatch: false,
};

const createSagaMonitor = (options = {}) => {
    const config = { ...defaultConfig, ...options };

    const {
        level,
        verbose,
        color,
        rootSagaStart,
        effectTrigger,
        effectResolve,
        effectReject,
        effectCancel,
        actionDispatch,
    } = config;

    let styles = [
        `color: ${color};`,
        'font-weight: bold;',
        'background: #F0F0F0;',
        'padding: 10px; border-radius: 10px;',
    ].join('');

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

    const getParent = (data) =>
        mainStore.effects.find((e) => e.effectId === data.parentEffectId);
    const getArgs = (args) => {
        if (!Boolean(args)) {
            return '';
        } else if (Array.isArray(args)) {
            return getArgFromArray(args);
        }

        switch (typeof args) {
            case 'function':
                return args.name;
            case 'object':
                return getArgFromObject(args);
            case 'number':
            case 'bigint':
            case 'boolean':
            case 'string':
                return args;
            default:
                return undefined;
        }
    };

    const getArgFromArray = (arg) => arg.map((e) => getArgs(e));
    const getArgFromObject = (arg) => {
        let tmp = {};

        for (const [key, value] of Object.entries(arg)) {
            tmp[key] = getArgs(value);
        }
        return tmp;
    };

    const getData = (e, type = 'c') => {
        const getType = () =>
            type === 'p' && get(e, 'effect.type') === 'FORK'
                ? 'saga'
                : 'function';
        const getMore = (e) =>
            type === 'p' &&
            getType() !== 'function' &&
            getArgs(get(e, 'effect.payload.args[0].type'), false)
                ? ` ${getType()} triggered by ${getArgs(
                      get(e, 'effect.payload.args[0].type'),
                  )} action`
                : '';
        switch (get(e, 'effect.type')) {
            case 'FORK':
            case 'CALL':
                return getArgs(get(e, 'effect.payload.fn')) + getMore(e);
            case 'PUT':
                return getArgs(get(e, 'effect.payload.action.type'));
            default:
                return '';
        }
    };

    const effectTriggered = (desc) => {
        if (effectTrigger) {
            // mainStore.effects.push(getArgs(desc));
            const parent = getParent(desc);

            const getType = () =>
                get(parent, 'effect.type') === 'FORK' &&
                get(desc, 'effect.payload.fn', false)
                    ? 'function'
                    : 'action';

            const msg =
                !IGNORELIST.includes(get(desc, 'effect.type', '')) &&
                get(desc, 'effect.type', false) &&
                getData(desc, 'c').length &&
                parent
                    ? `${getData(parent, 'p')} ${get(
                          desc,
                          'effect.type',
                          '',
                      ).toLowerCase()}s ${getData(desc, 'c')} ${getType()}`
                    : '';
            const shouldRemove =
                msg.length ||
                ['CANCELLED', 'TAKE'].includes(get(desc, 'effect.type', ''))
                    ? true
                    : false;

            // shouldRemove && console.log('########## desc', desc);
            mainStore.effects.push({ ...getArgs(desc), shouldRemove });
            msg.length && console.log(`%c${msg}`, styles);
            // msg.length &&
            //     console.log(
            //         '########## ---',
            //         desc,
            //         parent,
            //         grandParent,
            //         grandGParent,
            //     );
        }

        manager.set(
            desc.effectId,
            Object.assign({}, desc, {
                status: PENDING,
                start: time(),
            }),
        );
    };

    const effectResolved = (effectId, result) => {
        if (effectResolve) {
            console[level]('%c effectResolved:', styles, effectId, result);
        }

        const current = mainStore.effects.find((e) => e.effectId === effectId);
        // const parent = current && getParent(current);

        resolveEffect(effectId, result);

        // get(current, 'shouldRemove', false) &&
        //     console.log(
        //         '########## REMOVING ',
        //         effectId,
        //         mainStore.effects.length,
        //     );

        // get(current, 'shouldRemove', false) &&
        //     console.log('########## current', current);
        get(current, 'shouldRemove', false) &&
            remove(mainStore.effects, (e) => e.effectId === effectId);

        // console.log(
        //     '########## store,',
        //     mainStore.effects.length,
        //     mainStore.effects,
        // );
    };

    const effectRejected = (effectId, error) => {
        if (effectReject) {
            console[level]('%c effectRejected:', styles, effectId, error);
        }
        rejectEffect(effectId, error);
    };

    const effectCancelled = (effectId) => {
        if (effectCancel) {
            console[level]('%c effectCancelled:', styles, effectId);
        }
        cancelEffect(effectId);
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

// Version
createSagaMonitor.VERSION = version;
logSaga.VERSION = version;

// Export the snapshot-logging function for arbitrary use by external code.
export { logSaga };

// Export the `sagaMonitor` to pass to the middleware.
export default createSagaMonitor;
