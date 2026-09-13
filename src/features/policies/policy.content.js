export const EMPTY_POLICY_VALUE = [{ type: "paragraph", children: [{ text: "" }] }];

export function toRichTextValue(content) {
  if (Array.isArray(content) && content.length) return content;
  if (typeof content === "string" && content.trim()) {
    return content.split(/\n{2,}/).map((text) => ({ type: "paragraph", children: [{ text }] }));
  }
  return [{ type: "paragraph", children: [{ text: "" }] }];
}

export function richTextToPlainText(content) {
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";
  const readNode = (node) => node.text || (node.children || []).map(readNode).join("");
  return content.map(readNode).filter(Boolean).join("\n\n").trim();
}
