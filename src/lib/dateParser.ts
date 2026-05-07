/**
 * Natural language date/time parser.
 * Supports Chinese natural language expressions like:
 *   "今天", "明天", "后天", "下周一", "下周", "3天后", "下午3点", "明天下午3点"
 */

export interface ParsedDateTime {
  date: Date;
  text: string; // ISO string for datetime-local input
}

/**
 * Parse a Chinese natural language date/time string.
 * Returns a Date object if recognized, or null.
 */
export function parseNaturalDate(input: string): ParsedDateTime | null {
  const now = new Date();
  let target = new Date(now);
  let matched = false;

  // Reset to start of day
  target.setHours(0, 0, 0, 0);

  // Check for "N天后" / "N天后" pattern
  const daysAfterMatch = input.match(/(\d+)\s*天后/);
  if (daysAfterMatch) {
    const days = parseInt(daysAfterMatch[1], 10);
    target.setDate(target.getDate() + days);
    matched = true;
  }

  // Check for "下周N" pattern (next week Monday = 1, etc.)
  const nextWeekDayMatch = input.match(/下周([一二三四五六日天])/);
  if (nextWeekDayMatch) {
    const dayMap: Record<string, number> = {
      '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 0, '天': 0,
    };
    const targetDay = dayMap[nextWeekDayMatch[1]];
    if (targetDay !== undefined) {
      const currentDay = target.getDay();
      const daysUntilNextWeek = (7 - currentDay) + targetDay;
      target.setDate(target.getDate() + daysUntilNextWeek);
      matched = true;
    }
  }

  // Check for "下周一" without specific day
  if (!matched && input.includes('下周')) {
    target.setDate(target.getDate() + 7);
    matched = true;
  }

  // Check for "周N" / "星期N" pattern (this week)
  if (!matched) {
    const weekDayMatch = input.match(/(?:周|星期)([一二三四五六日天])/);
    if (weekDayMatch) {
      const dayMap: Record<string, number> = {
        '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 0, '天': 0,
      };
      const targetDay = dayMap[weekDayMatch[1]];
      if (targetDay !== undefined) {
        const currentDay = target.getDay();
        let diff = targetDay - currentDay;
        if (diff <= 0) diff += 7; // Next occurrence
        target.setDate(target.getDate() + diff);
        matched = true;
      }
    }
  }

  // Check for "明天"
  if (!matched && input.includes('明天')) {
    target.setDate(target.getDate() + 1);
    matched = true;
  }

  // Check for "后天"
  if (!matched && input.includes('后天')) {
    target.setDate(target.getDate() + 2);
    matched = true;
  }

  // Check for "今天"
  if (!matched && input.includes('今天')) {
    // today, keep as is
    matched = true;
  }

  // If no date matched, return null
  if (!matched) return null;

  // Now parse time if present
  // Match patterns like "下午3点", "下午3点半", "15:00", "3点", "3点半"
  let hours = 0;
  let minutes = 0;
  let hasTime = false;

  // 24h format: "15:00", "9:30"
  const time24Match = input.match(/(\d{1,2}):(\d{2})/);
  if (time24Match) {
    hours = parseInt(time24Match[1], 10);
    minutes = parseInt(time24Match[2], 10);
    hasTime = true;
  }

  // "下午3点" or "上午10点" pattern
  const amPmMatch = input.match(/(上午|下午|晚上|中午|早上|傍晚)(\d{1,2})点(半)?/);
  if (!hasTime && amPmMatch) {
    const amPm = amPmMatch[1];
    let h = parseInt(amPmMatch[2], 10);
    const half = amPmMatch[3] === '半';

    if (amPm === '下午' || amPm === '晚上' || amPm === '傍晚') {
      if (h !== 12) h += 12;
    } else if (amPm === '中午') {
      h = 12;
    } else if (amPm === '上午' || amPm === '早上') {
      if (h === 12) h = 0;
    }
    hours = h;
    minutes = half ? 30 : 0;
    hasTime = true;
  }

  // Simple "N点" or "N点半" pattern
  if (!hasTime) {
    const simpleTimeMatch = input.match(/(\d{1,2})点(半)?/);
    if (simpleTimeMatch) {
      hours = parseInt(simpleTimeMatch[1], 10);
      minutes = simpleTimeMatch[2] === '半' ? 30 : 0;
      hasTime = true;
    }
  }

  target.setHours(hours, minutes, 0, 0);

  return {
    date: target,
    text: toDatetimeLocalString(target),
  };
}

/**
 * Format a Date to the datetime-local input format string.
 */
export function toDatetimeLocalString(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Format a Date to a human-readable Chinese string.
 */
export function formatDateCN(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);

  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

  let prefix = '';
  if (diffDays === 0) prefix = '今天';
  else if (diffDays === 1) prefix = '明天';
  else if (diffDays === 2) prefix = '后天';
  else if (diffDays === -1) prefix = '昨天';
  else if (diffDays > 2 && diffDays <= 6) prefix = weekDays[date.getDay()];
  else {
    return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
  }

  const hours = date.getHours().toString().padStart(2, '0');
  const mins = date.getMinutes().toString().padStart(2, '0');
  return `${prefix} ${hours}:${mins}`;
}

/**
 * Extract task title by removing date/time patterns from the input string.
 */
export function extractTitle(input: string): string {
  let title = input
    .replace(/(今天|明天|后天)/g, '')
    .replace(/下周[一二三四五六日天]/g, '')
    .replace(/下周/g, '')
    .replace(/周[一二三四五六日天]/g, '')
    .replace(/星期[一二三四五六日天]/g, '')
    .replace(/(\d+)\s*天后/g, '')
    .replace(/(上午|下午|晚上|中午|早上|傍晚)\d{1,2}点半?/g, '')
    .replace(/\d{1,2}点半?/g, '')
    .replace(/\d{1,2}:\d{2}/g, '')
    .trim();
  return title || input.trim();
}
