const categoryLabels: Record<string, string> = {
  'Web Development': '웹 개발',
  Design: '디자인',
  Marketing: '마케팅',
  Other: '기타',
};

export function formatProjectCategory(category: string) {
  return categoryLabels[category] ?? category;
}
