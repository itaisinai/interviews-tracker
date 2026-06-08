export function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function endOfWeek(date: Date) {
  const result = new Date(date);
  result.setDate(result.getDate() + 7);
  result.setHours(23, 59, 59, 999);
  return result;
}
