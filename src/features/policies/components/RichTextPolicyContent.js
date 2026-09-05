import { toRichTextValue } from "@/features/policies/policy.content";

function Text({ leaf }) {
  let content = leaf.text || "";
  if (leaf.bold) content = <strong>{content}</strong>;
  if (leaf.italic) content = <em>{content}</em>;
  if (leaf.underline) content = <u>{content}</u>;
  return content;
}

function Block({ node }) {
  const children = node.children?.map((child, index) => child.text !== undefined ? <Text key={index} leaf={child} /> : <Block key={index} node={child} />);
  switch (node.type) {
    case "heading-one": return <h2>{children}</h2>;
    case "heading-two": return <h3>{children}</h3>;
    case "block-quote": return <blockquote>{children}</blockquote>;
    case "bulleted-list": return <ul>{children}</ul>;
    case "numbered-list": return <ol>{children}</ol>;
    case "list-item": return <li>{children}</li>;
    default: return <p>{children}</p>;
  }
}

export default function RichTextPolicyContent({ content }) {
  return <>{toRichTextValue(content).map((node, index) => <Block key={index} node={node} />)}</>;
}
