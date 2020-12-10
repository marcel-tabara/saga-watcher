# Saga Watcher

Simple, and configurable redux-saga monitor.

You can define a custom getMessage function to filter unwanted effects and build a custom message (see the default implementation for example).

By default, all the effects are recorded in the mainStore array, which is used to identify the parent effect. You can define a custom cleanStore function to customize the logic for cleaning the store.

## Installation

### Yarn

```bash
$ yarn add saga-watcher -D
```

### NPM

```bash
$ npm install saga-watcher --save-dev
```

## Configuration

```js
const defaultConfig = {
  rootSagaStart: false, // show root saga start effect
  effectTrigger: true, // show triggered effects
  effectResolve: false, // show resolved effects
  effectReject: false, // show rejected effects
  effectCancel: false, // show cancelled effects
  actionDispatch: false, // show dispatched actions
  styles: ['font-weight: bold;'].join(''), // styles for the message box
  showDataWithMessage: true, // shows current and parrent effects along with the message
  getMessage: ({ current, parent, mainStore }) =>
    getMessage({ current, parent, mainStore }), // function that lets you filter unwanted effects and build a custom message
  cleanStore: ({ current, parent, mainStore }) =>
    cleanStore({ current, parent, mainStore }),
} // function that returns a clean store
```

## Usage

### With default config

```js
import createSagaWatcher from 'saga-watcher'

const middleware = [
  createSagaMiddleware({
    sagaMonitor: createSagaWatcher(),
  }),
]
```

### With custom config

```js
import createSagaWatcher from 'saga-watcher'

// custom functions to override defaults
const buildCustomMessage = ({ current, parent, mainStore }) =>
  return 'custom message'
const customCleanStore = ({ current, parent, mainStore }) =>
  current && parent
    ? mainStore.filter(e => e.effectId !== current.effectId)
    : mainStore

// configuration
const config = {
  getMessage: ({ current, parent, mainStore }) => buildCustomMessage({current, parent, mainStore}),
  cleanStore: ({ current, parent, mainStore }) =>
    customCleanStore({ current, parent, mainStore }),
}

const middleware = [
  createSagaMiddleware({
    sagaMonitor: createSagaWatcher(config),
  }),
]
```

> Run `$$LogSagas()` in the developer console to display a snapshot of all the available sagas.

> Run `$$LogStore()` in the developer console to display effects store.

> Run `$$LogTotalMessages()` in the developer console to display the number of displayed messages.

<img src="https://drive.google.com/uc?export=view&id=1F6Cca2yEC32qC2OhfjfSS-JUFcfScZTy" style="width: 650px; max-width: 100%; height: auto" />

## Credits

This was adapted from the [sagaMonitor](https://github.com/redux-saga/redux-saga/blob/master/examples/sagaMonitor/index.js) example in the [redux-saga](https://github.com/redux-saga/redux-saga) repository and [clarketm
/
saga-monitor](https://github.com/clarketm/saga-monitor).
