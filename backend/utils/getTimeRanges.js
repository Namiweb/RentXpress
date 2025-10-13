export function getTimeRanges() {
  const now = new Date();

  // --- Today ---
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  // --- Yesterday ---
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const endOfYesterday = new Date(endOfToday);
  endOfYesterday.setDate(endOfYesterday.getDate() - 1);

  // --- This Week ---
  const day = now.getDay(); // Sunday = 0
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  const startOfThisWeek = new Date(now);
  startOfThisWeek.setDate(now.getDate() + diffToMonday);
  startOfThisWeek.setHours(0, 0, 0, 0);

  const endOfThisWeek = new Date(startOfThisWeek);
  endOfThisWeek.setDate(startOfThisWeek.getDate() + 6);
  endOfThisWeek.setHours(23, 59, 59, 999);

  // --- Last Week ---
  const startOfLastWeek = new Date(startOfThisWeek);
  startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
  const endOfLastWeek = new Date(endOfThisWeek);
  endOfLastWeek.setDate(endOfLastWeek.getDate() - 7);

  // --- This Month ---
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfThisMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );

  // --- Last Month ---
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    0,
    23,
    59,
    59,
    999
  );

  // --- This Year ---
  const startOfThisYear = new Date(now.getFullYear(), 0, 1);
  const endOfThisYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

  // --- Last Year ---
  const startOfLastYear = new Date(now.getFullYear() - 1, 0, 1);
  const endOfLastYear = new Date(
    now.getFullYear() - 1,
    11,
    31,
    23,
    59,
    59,
    999
  );

  return {
    today: { start: startOfToday, end: endOfToday },
    yesterday: { start: startOfYesterday, end: endOfYesterday },
    thisWeek: { start: startOfThisWeek, end: endOfThisWeek },
    lastWeek: { start: startOfLastWeek, end: endOfLastWeek },
    thisMonth: { start: startOfThisMonth, end: endOfThisMonth },
    lastMonth: { start: startOfLastMonth, end: endOfLastMonth },
    thisYear: { start: startOfThisYear, end: endOfThisYear },
    lastYear: { start: startOfLastYear, end: endOfLastYear },
  };
}
