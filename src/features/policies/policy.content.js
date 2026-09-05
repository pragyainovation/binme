export const EMPTY_POLICY_VALUE = [{ type: "paragraph", children: [{ text: "" }] }];

export function toRichTextValue(content) {
  if (Array.isArray(content) && content.length) return content;
  if (typeof content === "string" && content.trim()) {
    return content.split(/\n{2,}/).map((text) => ({ type: "paragraph", children: [{ text }] }));
  }
  return [{ type: "paragraph", children: [{ text: "" }] }];
}
