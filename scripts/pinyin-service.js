(function () {
  const overrideDictionary = {
    重庆: ['chóng', 'qìng'],
    银行: ['yín', 'háng'],
    行为: ['xíng', 'wéi'],
    重要: ['zhòng', 'yào'],
    音乐: ['yīn', 'yuè'],
    长大: ['zhǎng', 'dà'],
    快乐: ['kuài', 'lè'],
    还好: ['hái', 'hǎo'],
  };

  const hanziRegex = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;
  const latinRegex = /[A-Za-z]/;
  const numberRegex = /[0-9]/;
  const punctRegex = /[，。！？；：、“”‘’（）《》〈〉【】—…,.!?;:()\[\]{}<>"'、·]/;
  const spaceRegex = /[ \t]/;

  function normalizeText(text) {
    return String(text || '').replace(/\r\n?/g, '\n');
  }

  function splitParagraphs(text) {
    return normalizeText(text).split('\n');
  }

  function detectCharType(char) {
    if (char === '\n') {
      return 'newline';
    }

    if (spaceRegex.test(char)) {
      return 'space';
    }

    if (hanziRegex.test(char)) {
      return 'hanzi';
    }

    if (latinRegex.test(char)) {
      return 'latin';
    }

    if (numberRegex.test(char)) {
      return 'number';
    }

    if (punctRegex.test(char)) {
      return 'punct';
    }

    return 'other';
  }

  function tokenizeParagraph(paragraph) {
    if (!paragraph) {
      return [];
    }

    return Array.from(paragraph).map((char) => ({
      text: char,
      type: detectCharType(char),
      pinyin: [],
      source: null,
    }));
  }

  function applyOverrides(tokens) {
    if (!tokens.length) {
      return tokens;
    }

    const chars = tokens.map((token) => token.text).join('');
    const entries = Object.entries(overrideDictionary).sort((left, right) => right[0].length - left[0].length);
    const occupied = new Set();

    entries.forEach(([phrase, pinyinList]) => {
      let searchStart = 0;

      while (searchStart < chars.length) {
        const foundIndex = chars.indexOf(phrase, searchStart);
        if (foundIndex === -1) {
          break;
        }

        const range = Array.from({ length: phrase.length }, (_, offset) => foundIndex + offset);
        const canUse = range.every((index) => !occupied.has(index) && tokens[index] && tokens[index].type === 'hanzi');

        if (canUse) {
          range.forEach((tokenIndex, offset) => {
            tokens[tokenIndex].pinyin = [pinyinList[offset] || ''];
            tokens[tokenIndex].source = 'override';
            occupied.add(tokenIndex);
          });
        }

        searchStart = foundIndex + phrase.length;
      }
    });

    return tokens;
  }

  function applyLibraryPinyin(tokens) {
    if (!tokens.length) {
      return tokens;
    }

    const library = window.pinyinPro;
    if (!library || typeof library.pinyin !== 'function') {
      return tokens;
    }

    const hanziText = tokens
      .filter((token) => token.type === 'hanzi')
      .map((token) => token.text)
      .join('');

    if (!hanziText) {
      return tokens;
    }

    const pinyinList = library.pinyin(hanziText, {
      type: 'array',
      toneType: 'symbol',
      nonZh: 'removed',
      v: false,
    });

    let hanziIndex = 0;
    tokens.forEach((token) => {
      if (token.type !== 'hanzi') {
        return;
      }

      if (!token.pinyin.length) {
        token.pinyin = [pinyinList[hanziIndex] || ''];
        token.source = 'library';
      }

      hanziIndex += 1;
    });

    return tokens;
  }

  function annotateParagraph(paragraph) {
    const tokens = tokenizeParagraph(paragraph);
    applyOverrides(tokens);
    applyLibraryPinyin(tokens);
    return tokens;
  }

  function annotateText(text) {
    return splitParagraphs(text).map((paragraph) => annotateParagraph(paragraph));
  }

  window.pinyinService = {
    annotateText,
    normalizeText,
    splitParagraphs,
    overrideDictionary,
  };
})();
