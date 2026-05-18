const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const CHARLOTTE_TIME_ZONE = "America/New_York";

export function getDateForCharlotteDisplay(value: string) {
  if (DATE_ONLY_PATTERN.test(value)) {
    return new Date(`${value}T12:00:00.000Z`);
  }

  return new Date(value);
}

