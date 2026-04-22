(function () {
  const elements = {
    textArea: document.getElementById('source-text'),
    showPinyin: document.getElementById('show-pinyin'),
    treatFirstLineAsTitle: document.getElementById('treat-first-line-as-title'),
    fontSize: document.getElementById('font-size'),
    lineHeight: document.getElementById('line-height'),
    pageMargin: document.getElementById('page-margin'),
    previewButton: document.getElementById('preview-button'),
    printButton: document.getElementById('print-button'),
    previewPage: document.getElementById('print-page'),
    previewContent: document.getElementById('preview-content'),
  };

  function syncControls(state) {
    elements.textArea.value = state.rawText;
    elements.showPinyin.checked = state.showPinyin;
    elements.treatFirstLineAsTitle.checked = state.treatFirstLineAsTitle;
    elements.fontSize.value = String(state.fontSize);
    elements.lineHeight.value = String(state.lineHeight);
    elements.pageMargin.value = String(state.pageMargin);
  }

  function applyPageStyles(state) {
    const dynamicPrintStyle = document.getElementById('dynamic-print-style');
    if (dynamicPrintStyle) {
      dynamicPrintStyle.textContent = '@page { size: A4 portrait; margin: ' + state.pageMargin + 'mm; }';
    }
    elements.previewPage.style.setProperty('--page-margin', state.pageMargin + 'mm');
    elements.previewContent.style.setProperty('--content-font-size', state.fontSize + 'px');
    elements.previewContent.style.setProperty('--content-line-height', String(state.lineHeight));
  }

  function renderFromState(state) {
    const paragraphs = window.pinyinService.annotateText(state.rawText);
    applyPageStyles(state);
    window.previewRenderer.renderPreview(elements.previewContent, paragraphs, {
      showPinyin: state.showPinyin,
      treatFirstLineAsTitle: state.treatFirstLineAsTitle,
    });
  }

  function collectStateFromControls() {
    return {
      rawText: elements.textArea.value,
      showPinyin: elements.showPinyin.checked,
      treatFirstLineAsTitle: elements.treatFirstLineAsTitle.checked,
      fontSize: Number(elements.fontSize.value),
      lineHeight: Number(elements.lineHeight.value),
      pageMargin: Number(elements.pageMargin.value),
    };
  }

  function updateStateAndRender() {
    window.appState.setState(collectStateFromControls());
  }

  function bindEvents() {
    elements.previewButton.addEventListener('click', updateStateAndRender);
    elements.printButton.addEventListener('click', function () {
      updateStateAndRender();
      window.print();
    });

    [elements.showPinyin, elements.treatFirstLineAsTitle, elements.fontSize, elements.lineHeight, elements.pageMargin].forEach((element) => {
      element.addEventListener('change', updateStateAndRender);
    });

    elements.textArea.addEventListener('input', updateStateAndRender);

    window.appState.subscribe(renderFromState);
  }

  function init() {
    const initialText = elements.textArea.value.trim();
    window.appState.setState({
      ...window.appState.defaultState,
      rawText: initialText,
    });
    syncControls(window.appState.getState());
    bindEvents();
    renderFromState(window.appState.getState());
  }

  init();
})();
