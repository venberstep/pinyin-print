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

  const hanziRegex = /[㐀-䶿一-鿿豈-﫿]/;
  const latinRegex = /[A-Za-z]/;
  const numberRegex = /[0-9]/;
  const punctRegex = /[，。！？；：、“”‘’（）《》〈〉【】—…,.!?;:()\[\]{}<>"'、·]/;
  const spaceRegex = /[ \t]/;
  const neutralToneChars = new Set(['地', '得']);
  const wordSegmenter = typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function'
    ? new Intl.Segmenter('zh-CN', { granularity: 'word' })
    : null;
  const diModifierWords = new Set(['高兴', '开心', '认真', '慢慢', '轻轻', '飞快', '好好', '悄悄', '静静', '默默', '深深', '稳稳', '重重', '努力', '渐渐', '紧紧']);
  const diLocationPrefixes = new Set(['遍', '满', '各', '原', '就', '本', '此', '那', '这', '外', '内', '异', '实', '当', '随']);
  const diVerbStarters = new Set(['说', '走', '放', '笑', '跑', '看', '听', '写', '读', '唱', '跳', '哭', '拿', '吃', '喝', '想', '讲', '问', '学', '做', '敲', '站', '坐', '睡', '爬', '飞', '冲', '推', '拉', '搬', '抱', '望', '听']);
  const deComplementStarters = new Set(['不', '太', '很', '真', '多', '少', '高', '低', '快', '慢', '好', '坏', '远', '近', '早', '晚', '轻', '重', '对', '错', '像', '有', '慌', '清', '开', '动', '住', '了', '过', '上', '下']);

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

    const segments = typeof library.segment === 'function' ? library.segment(hanziText) : [];
    const segmentedPinyin = [];

    segments.forEach((segment) => {
      const originChars = Array.from(segment.origin || '');
      const resultChars = library.pinyin(segment.origin || '', {
        type: 'array',
        toneType: 'symbol',
        nonZh: 'removed',
        v: false,
      });

      originChars.forEach((_, index) => {
        segmentedPinyin.push(resultChars[index] || '');
      });
    });

    const fallbackPinyin = library.pinyin(hanziText, {
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
        token.pinyin = [segmentedPinyin[hanziIndex] || fallbackPinyin[hanziIndex] || ''];
        token.source = 'library';
      }

      hanziIndex += 1;
    });

    return tokens;
  }

  function createWordRanges(tokens) {
    const chars = tokens.map((token) => token.text).join('');
    const library = window.pinyinPro;

    if (library && typeof library.segment === 'function') {
      const ranges = [];
      let cursor = 0;

      library.segment(chars).forEach((segment) => {
        const text = segment.origin || '';
        if (!text) {
          return;
        }

        const length = Array.from(text).length;
        ranges.push({
          text,
          start: cursor,
          end: cursor + length - 1,
        });
        cursor += length;
      });

      return ranges;
    }

    if (!wordSegmenter) {
      return [];
    }

    const ranges = [];

    for (const segment of wordSegmenter.segment(chars)) {
      if (!segment.segment) {
        continue;
      }

      const end = segment.index + Array.from(segment.segment).length - 1;
      ranges.push({
        text: segment.segment,
        start: segment.index,
        end,
      });
    }

    return ranges;
  }

  function findWordAtIndex(wordRanges, index) {
    return wordRanges.find((range) => index >= range.start && index <= range.end) || null;
  }

  function shouldUseNeutralTone(tokens, wordRanges, index) {
    const token = tokens[index];
    if (!token || token.type !== 'hanzi' || !neutralToneChars.has(token.text)) {
      return false;
    }

    const prev = tokens[index - 1];
    const next = tokens[index + 1];
    const word = findWordAtIndex(wordRanges, index);
    const prevChar = prev ? prev.text : '';
    const nextChar = next ? next.text : '';

    if (token.text === '地') {
      return Boolean(
        prev
          && next
          && prev.type === 'hanzi'
          && next.type === 'hanzi'
          && word
          && word.text === '地'
          && (diModifierWords.has(prevChar + token.text) || diModifierWords.has(prevChar + prevChar) || diVerbStarters.has(nextChar))
          && !diLocationPrefixes.has(prevChar)
      );
    }

    if (token.text === '得') {
      return Boolean(
        prev
          && next
          && prev.type === 'hanzi'
          && next.type === 'hanzi'
          && word
          && word.text === '得'
          && deComplementStarters.has(nextChar)
      );
    }

    return false;
  }

  function applyNeutralToneRules(tokens) {
    const wordRanges = createWordRanges(tokens);

    tokens.forEach((token, index) => {
      if (shouldUseNeutralTone(tokens, wordRanges, index)) {
        token.pinyin = ['de'];
        token.source = 'rule';
      }
    });

    return tokens;
  }

  function annotateParagraph(paragraph) {
    const tokens = tokenizeParagraph(paragraph);
    applyOverrides(tokens);
    applyLibraryPinyin(tokens);
    applyNeutralToneRules(tokens);
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
