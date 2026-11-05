export interface QuoteOptions {
  quoteType: '"' | "'";
  separator: string;
  escapeInternal: boolean;
  trimLines: boolean;
  skipEmptyLines: boolean;
  addTrailingSeparator: boolean;
}

export const PRESET_MODES: { label: string; options: QuoteOptions }[] = [
  {
    label: '双引号 + 逗号',
    options: { quoteType: '"', separator: ',\n', escapeInternal: false, trimLines: true, skipEmptyLines: false, addTrailingSeparator: true },
  },
  {
    label: '单引号 + 逗号',
    options: { quoteType: "'", separator: ',\n', escapeInternal: false, trimLines: true, skipEmptyLines: false, addTrailingSeparator: true },
  },
  {
    label: '双引号 + 空格',
    options: { quoteType: '"', separator: ' ', escapeInternal: false, trimLines: true, skipEmptyLines: false, addTrailingSeparator: false },
  },
  {
    label: '单引号 + 空格',
    options: { quoteType: "'", separator: ' ', escapeInternal: false, trimLines: true, skipEmptyLines: false, addTrailingSeparator: false },
  },
  {
    label: '仅包裹 (双引号)',
    options: { quoteType: '"', separator: '\n', escapeInternal: false, trimLines: true, skipEmptyLines: false, addTrailingSeparator: false },
  },
  {
    label: '仅包裹 (单引号)',
    options: { quoteType: "'", separator: '\n', escapeInternal: false, trimLines: true, skipEmptyLines: false, addTrailingSeparator: false },
  },
  {
    label: '双引号 + 逗号 (一行)',
    options: { quoteType: '"', separator: ',', escapeInternal: false, trimLines: true, skipEmptyLines: false, addTrailingSeparator: false },
  },
  {
    label: '单引号 + 逗号 (一行)',
    options: { quoteType: "'", separator: ',', escapeInternal: false, trimLines: true, skipEmptyLines: false, addTrailingSeparator: false },
  },
  {
    label: '双引号 + 逗号空格 (一行)',
    options: { quoteType: '"', separator: ', ', escapeInternal: false, trimLines: true, skipEmptyLines: false, addTrailingSeparator: false },
  },
  {
    label: '单引号 + 逗号空格 (一行)',
    options: { quoteType: "'", separator: ', ', escapeInternal: false, trimLines: true, skipEmptyLines: false, addTrailingSeparator: false },
  },
];

export const DEFAULT_MODE_INDEX = 0;

export function transformToQuotedLines(input: string, options: QuoteOptions): string {
  // Normalize line endings: \r\n or \r → \n
  const normalized = input.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  let lines = normalized.split('\n');

  if (options.skipEmptyLines) {
    lines = lines.filter(line => line.trim() !== '');
  }

  lines = lines.map(line => {
    let processed = line;
    if (options.trimLines) processed = processed.trim();
    if (options.escapeInternal) {
      // Escape internal quote chars: split by quote, rejoin with escaped quote
      const parts = processed.split(options.quoteType);
      processed = parts.join('\\' + options.quoteType);
    }
    return options.quoteType + processed + options.quoteType;
  });

  let result = lines.join(options.separator);

  // Add trailing separator if requested (e.g. trailing comma)
  if (options.addTrailingSeparator && lines.length > 0) {
    if (options.separator === ',\n') {
      // join already added ,\n between lines but NOT after the last one
      result = result + ',';
    }
  }

  return result;
}
