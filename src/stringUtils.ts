// any combination of spaces and punctuation characters
// thanks to http://stackoverflow.com/a/25575009
const wordSeparators = /[\s\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-.\/:;<=>?@\[\]^_`{|}~]+/;
const capitals = /[A-Z\u00C0-\u00D6\u00D9-\u00DD]/g;

/**
 * Taken from https://www.npmjs.com/package/just-kebab-case
 * @example
 * kebabCase('the quick brown fox'); // 'the-quick-brown-fox'
 * @example
 * kebabCase('the-quick-brown-fox'); // 'the-quick-brown-fox'
 * @example
 * kebabCase('the_quick_brown_fox'); // 'the-quick-brown-fox'
 * @example
 * kebabCase('theQuickBrownFox'); // 'the-quick-brown-fox'
 * @example
 * kebabCase('theQuickBrown Fox'); // 'the-quick-brown-fox'
 * @example
 * kebabCase('thequickbrownfox'); // 'thequickbrownfox'
 * @example
 * kebabCase('the - quick * brown# fox'); // 'the-quick-brown-fox'
 * @example
 * kebabCase('theQUICKBrownFox'); // 'the-q-u-i-c-k-brown-fox'
 */
export function kebabCase(str: string) {
  //replace capitals with space + lower case equivalent for later parsing
  return str
    .replace(capitals, function matcher(match) {
      return " " + (match.toLowerCase() || match);
    })
    .trim()
    .split(wordSeparators)
    .join("-");
}
