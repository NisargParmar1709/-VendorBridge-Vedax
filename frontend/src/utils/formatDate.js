import { format, isBefore, isValid, parseISO, startOfDay } from "date-fns";

function normalizeDate(date) {
  if (!date) {
    return null;
  }

  const parsedDate = date instanceof Date ? date : parseISO(String(date));

  return isValid(parsedDate) ? parsedDate : null;
}

export function formatDisplayDate(date) {
  const parsedDate = normalizeDate(date);

  return parsedDate ? format(parsedDate, "dd MMM yyyy") : "";
}

export function formatInputDate(date) {
  const parsedDate = normalizeDate(date);

  return parsedDate ? format(parsedDate, "yyyy-MM-dd") : "";
}

export function isDatePast(date) {
  const parsedDate = normalizeDate(date);

  if (!parsedDate) {
    return false;
  }

  return isBefore(startOfDay(parsedDate), startOfDay(new Date()));
}