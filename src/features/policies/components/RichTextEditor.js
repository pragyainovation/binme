"use client";

import { useCallback, useMemo } from "react";
import isHotkey from "is-hotkey";
import { createEditor, Editor, Element as SlateElement, Transforms } from "slate";
import { withHistory } from "slate-history";
import { Editable, Slate, useSlate, withReact } from "slate-react";

const HOTKEYS = { "mod+b": "bold", "mod+i": "italic", "mod+u": "underline" };
const LIST_TYPES = ["numbered-list", "bulleted-list"];

function isMarkActive(editor, format) {
  return Editor.marks(editor)?.[format] === true;
}

function toggleMark(editor, format) {
  if (isMarkActive(editor, format)) Editor.removeMark(editor, format);
  else Editor.addMark(editor, format, true);
}

function isBlockActive(editor, format) {
  const [match] = Editor.nodes(editor, { match: (node) => SlateElement.isElement(node) && node.type === format });
  return Boolean(match);
}

function toggleBlock(editor, format) {
  const isActive = isBlockActive(editor, format);
  const isList = LIST_TYPES.includes(format);
  Transforms.unwrapNodes(editor, { match: (node) => SlateElement.isElement(node) && LIST_TYPES.includes(node.type), split: true });
  Transforms.setNodes(editor, { type: isActive ? "paragraph" : isList ? "list-item" : format });
  if (!isActive && isList) Transforms.wrapNodes(editor, { type: format, children: [] });
}

function ToolbarButton({ format, block = false, children }) {
  const editor = useSlate();
  const active = block ? isBlockActive(editor, format) : isMarkActive(editor, format);
  return <button type="button" onMouseDown={(event) => { event.preventDefault(); block ? toggleBlock(editor, format) : toggleMark(editor, format); }} aria-pressed={active} style={active ? styles.toolbarActive : styles.toolbarButton}>{children}</button>;
}

function Element({ attributes, children, element }) {
  switch (element.type) {
    case "heading-one": return <h2 {...attributes} style={styles.headingOne}>{children}</h2>;
    case "heading-two": return <h3 {...attributes} style={styles.headingTwo}>{children}</h3>;
    case "block-quote": return <blockquote {...attributes} style={styles.quote}>{children}</blockquote>;
    case "bulleted-list": return <ul {...attributes} style={styles.list}>{children}</ul>;
    case "numbered-list": return <ol {...attributes} style={styles.list}>{children}</ol>;
    case "list-item": return <li {...attributes}>{children}</li>;
    default: return <p {...attributes} style={styles.paragraph}>{children}</p>;
  }
}

function Leaf({ attributes, children, leaf }) {
  let value = children;
  if (leaf.bold) value = <strong>{value}</strong>;
  if (leaf.italic) value = <em>{value}</em>;
  if (leaf.underline) value = <u>{value}</u>;
  return <span {...attributes}>{value}</span>;
}

export default function RichTextEditor({ value, onChange }) {
  const editor = useMemo(() => withHistory(withReact(createEditor())), []);
  const renderElement = useCallback((props) => <Element {...props} />, []);
  const renderLeaf = useCallback((props) => <Leaf {...props} />, []);

  return <Slate editor={editor} initialValue={value} onValueChange={onChange}>
    <div style={styles.toolbar} aria-label="Text formatting">
      <ToolbarButton format="bold"><strong>B</strong></ToolbarButton>
      <ToolbarButton format="italic"><em>I</em></ToolbarButton>
      <ToolbarButton format="underline"><u>U</u></ToolbarButton>
      <ToolbarButton block format="heading-one">H1</ToolbarButton>
      <ToolbarButton block format="heading-two">H2</ToolbarButton>
      <ToolbarButton block format="block-quote">❝</ToolbarButton>
      <ToolbarButton block format="bulleted-list">• List</ToolbarButton>
      <ToolbarButton block format="numbered-list">1. List</ToolbarButton>
    </div>
    <Editable renderElement={renderElement} renderLeaf={renderLeaf} placeholder="Write policy content here..." spellCheck onKeyDown={(event) => {
      for (const hotkey in HOTKEYS) {
        if (isHotkey(hotkey, event)) {
          event.preventDefault();
          toggleMark(editor, HOTKEYS[hotkey]);
        }
      }
    }} style={styles.editor} />
  </Slate>;
}

const styles = {
  toolbar: { display: "flex", flexWrap: "wrap", gap: 6, padding: 10, border: "1px solid rgba(23,33,31,.18)", borderBottom: 0, borderRadius: "12px 12px 0 0", background: "#f8f6f1" },
  toolbarButton: { border: "1px solid rgba(23,33,31,.12)", borderRadius: 7, padding: "6px 9px", background: "#fff", color: "#17211f", fontWeight: 700, cursor: "pointer" },
  toolbarActive: { border: "1px solid #17211f", borderRadius: 7, padding: "6px 9px", background: "#17211f", color: "#fff", fontWeight: 700, cursor: "pointer" },
  editor: { minHeight: 320, padding: "14px", border: "1px solid rgba(23,33,31,.18)", borderRadius: "0 0 12px 12px", background: "#fffdf9", lineHeight: 1.6, outline: "none" },
  paragraph: { margin: "0 0 14px" },
  headingOne: { margin: "4px 0 14px", fontSize: 25 },
  headingTwo: { margin: "4px 0 14px", fontSize: 20 },
  quote: { margin: "0 0 14px", paddingLeft: 14, borderLeft: "3px solid #ff764d", color: "#53615f" },
  list: { margin: "0 0 14px", paddingLeft: 24 },
};
