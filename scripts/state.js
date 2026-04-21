(function () {
  const defaultState = {
    rawText: '',
    showPinyin: true,
    fontSize: 18,
    lineHeight: 2,
    pageMargin: 15,
  };

  const state = { ...defaultState };
  const listeners = new Set();

  function getState() {
    return { ...state };
  }

  function setState(partialState) {
    Object.assign(state, partialState);
    listeners.forEach((listener) => listener(getState()));
  }

  function subscribe(listener) {
    listeners.add(listener);
    return function unsubscribe() {
      listeners.delete(listener);
    };
  }

  window.appState = {
    getState,
    setState,
    subscribe,
    defaultState: { ...defaultState },
  };
})();
