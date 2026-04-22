(function () {
  const PAGE_WIDTH_MM = 210;

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
      return createTextSpan(' ', 'token-space');
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

  function createTianzigeCell(token, showPinyin) {
    const cell = document.createElement('span');
    cell.className = 'tianzige-cell';

    if (!token) {
      cell.classList.add('is-blank');
      return cell;
    }

    if (token.type === 'space') {
      cell.classList.add('is-space');
      return cell;
    }

    const content = document.createElement('span');
    content.className = 'tianzige-cell-content';

    if (token.type === 'hanzi') {
      cell.classList.add('is-hanzi');
      if (showPinyin) {
        const pinyin = document.createElement('span');
        pinyin.className = 'tianzige-pinyin';
        pinyin.textContent = token.pinyin[0] || '';
        cell.append(pinyin);
      }
    } else {
      cell.classList.add('is-plain');
    }

    content.textContent = token.text;
    cell.append(content);
    return cell;
  }

  function createTianzigeRow(tokens, cellsPerRow, showPinyin) {
    const row = document.createElement('div');
    row.className = 'tianzige-row';

    const rowTokens = tokens.slice(0, cellsPerRow);
    rowTokens.forEach((token) => {
      row.append(createTianzigeCell(token, showPinyin));
    });

    for (let index = rowTokens.length; index < cellsPerRow; index += 1) {
      row.append(createTianzigeCell(null, showPinyin));
    }

    return row;
  }

  function createTianzigeTitle(tokens) {
    return renderParagraph(tokens, false, 'preview-title');
  }

  function calculateCellsPerRow(options) {
    const usableWidthMm = Math.max(PAGE_WIDTH_MM - (options.pageMargin || 15) * 2, 40);
    const cellSizePx = Math.max(options.tianzigeCellSize || 44, 1);
    const mmPerPx = 25.4 / 96;
    const cellSizeMm = cellSizePx * mmPerPx;
    return Math.max(1, Math.floor(usableWidthMm / cellSizeMm));
  }

  function renderTianzigePreview(container, paragraphTokens, options) {
    const cellsPerRow = calculateCellsPerRow(options);
    const grid = document.createElement('div');
    grid.className = 'tianzige-grid';

    paragraphTokens.forEach((tokens, index) => {
      if (options.treatFirstLineAsTitle && index === 0 && tokens.length) {
        container.append(createTianzigeTitle(tokens));
        return;
      }

      if (!tokens.length) {
        grid.append(createTianzigeRow([], cellsPerRow, options.showPinyin));
        return;
      }

      for (let start = 0; start < tokens.length; start += cellsPerRow) {
        grid.append(createTianzigeRow(tokens.slice(start, start + cellsPerRow), cellsPerRow, options.showPinyin));
      }
    });

    container.append(grid);
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

    if (options.tianzigeMode) {
      renderTianzigePreview(container, paragraphTokens, options);
      return;
    }

    paragraphTokens.forEach((tokens, index) => {
      const className = options.treatFirstLineAsTitle && index === 0 ? 'preview-title' : '';
      container.append(renderParagraph(tokens, options.showPinyin, className));
    });
  }

  window.previewRenderer = {
    renderPreview,
  };
})();
