import get from 'lodash/get';

export const getEffect = (mainStore, data) =>
    mainStore.find((e) => e.effectId === data.parentEffectId || e.effectId === data.effectId);
export const getArgs = (args) => {
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

export const getArgFromArray = (arg) => arg.map((e) => getArgs(e));
export const getArgFromObject = (arg) => {
    let tmp = {};

    for (const [key, value] of Object.entries(arg)) {
        tmp[key] = getArgs(value);
    }
    return tmp;
};

export const getData = (e, type = 'child') => {
    const getType = () =>
        type === 'parent' && get(e, 'effect.type') === 'FORK'
            ? 'saga'
            : 'function';
    const getMore = (e) =>
        type === 'parent' &&
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
