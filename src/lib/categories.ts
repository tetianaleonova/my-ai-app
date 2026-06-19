export const EXPENSE_CATEGORIES = [
  { value: "Їжа", emoji: "🍕", color: "#FF6B6B" },
  { value: "Транспорт", emoji: "🚗", color: "#4ECDC4" },
  { value: "Покупки", emoji: "🛍️", color: "#45B7D1" },
  { value: "Житло", emoji: "🏠", color: "#96CEB4" },
  { value: "Здоров'я", emoji: "💊", color: "#FFEAA7" },
  { value: "Розваги", emoji: "🎮", color: "#DDA0DD" },
  { value: "Освіта", emoji: "📚", color: "#98D8C8" },
  { value: "Подорожі", emoji: "✈️", color: "#F7DC6F" },
  { value: "Інше", emoji: "🌱", color: "#AED6F1" },
];

export const INCOME_CATEGORIES = [
  { value: "Зарплата", emoji: "💼", color: "#82E0AA" },
  { value: "Фріланс", emoji: "💻", color: "#A9DFBF" },
  { value: "Інвестиції", emoji: "📈", color: "#FAD7A0" },
  { value: "Подарунок", emoji: "🎁", color: "#F9E79F" },
  { value: "Інший дохід", emoji: "💫", color: "#D7BDE2" },
];

export function getCategoryMeta(value: string) {
  return (
    [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].find((c) => c.value === value) ?? {
      value,
      emoji: "💰",
      color: "#CBD5E0",
    }
  );
}
