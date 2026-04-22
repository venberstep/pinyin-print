(function () {
  function createTextSpan(text, className) {
    const span = document.createElement('span');
    if (className) {
      span.className = className;
    }
    span.textContent = text;
    return span;
  }

  function renderToken(token, showPinyin) {
    if (token.type === 'hanzi') {
      if (showPinyin) {
        const ruby = document.createElement('ruby');
        ruby.append(document.createTextNode(token.text));

        const rt = document.createElement('rt');
        rt.textContent = token.pinyin[0] || '';
        ruby.append(rt);
        return ruby;
      }

      return document.createTextNode(token.text);
    }

    if (token.type === 'space') {
      return createTextSpan('\u00A0', 'token-space');
    }

    return document.createTextNode(token.text);
  }

  function renderParagraph(tokens, showPinyin, className) {
    const paragraph = document.createElement('p');
    if (className) {
      paragraph.className = className;
    }

    if (!tokens.length) {
      paragraph.innerHTML = '&nbsp;';
      return paragraph;
    }

    tokens.forEach((token) => {
      paragraph.append(renderToken(token, showPinyin));
    });

    return paragraph;
  }

  function renderPreview(container, paragraphTokens, options) {
    container.innerHTML = '';

    if (!paragraphTokens.length || paragraphTokens.every((tokens) => !tokens.length)) {
      const empty = document.createElement('p');
      empty.className = 'empty-state';
      empty.textContent = '请输入中文内容后生成预览。';
      container.append(empty);
      return;
    }

    container.classList.toggle('is-no-pinyin', !options.showPinyin);

    paragraphTokens.forEach((tokens, index) => {
      const className = options.treatFirstLineAsTitle && index === 0 ? 'preview-title' : '';
      container.append(renderParagraph(tokens, options.showPinyin, className));
    });
  }

  window.previewRenderer = {
    renderPreview,
  };
})();
