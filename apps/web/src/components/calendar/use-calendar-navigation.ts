import { useCallback, useState } from "react";

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function useCalendarNavigation(initialMonth = new Date()) {
  const [month, setMonth] = useState(() => startOfMonth(initialMonth));

  const onPreviousMonth = useCallback(() => {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1));
  }, []);

  const onNextMonth = useCallback(() => {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1));
  }, []);

  const onToday = useCallback(() => {
    setMonth(startOfMonth(new Date()));
  }, []);

  return {
    month,
    onPreviousMonth,
    onNextMonth,
    onToday,
  };
}
