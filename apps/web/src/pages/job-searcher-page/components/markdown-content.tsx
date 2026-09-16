import { useMemo } from "react";

interface MarkdownContentProps {
  content: string;
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  const formattedContent = useMemo(() => {
    if (!content) return null;

    const lines = content.split("\n");
    const elements: JSX.Element[] = [];
    let currentParagraph: string[] = [];
    let listItems: string[] = [];
    let inList = false;

    const flushParagraph = () => {
      if (currentParagraph.length > 0) {
        const text = currentParagraph.join(" ").trim();
        if (text) {
          elements.push(
            <p key={`p-${elements.length}`} className="mb-4 text-gray-700 leading-relaxed">
              {text}
            </p>
          );
        }
        currentParagraph = [];
      }
    };

    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`ul-${elements.length}`} className="mb-4 ml-6 list-disc space-y-2">
            {listItems.map((item, idx) => (
              <li key={idx} className="text-gray-700">
                {item}
              </li>
            ))}
          </ul>
        );
        listItems = [];
        inList = false;
      }
    };

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      // Headers (##, ###, ####)
      if (trimmed.startsWith("#### ")) {
        flushParagraph();
        flushList();
        elements.push(
          <h4 key={`h4-${index}`} className="text-base font-semibold text-gray-900 mt-6 mb-3">
            {trimmed.slice(5)}
          </h4>
        );
      } else if (trimmed.startsWith("### ")) {
        flushParagraph();
        flushList();
        elements.push(
          <h3 key={`h3-${index}`} className="text-lg font-semibold text-gray-900 mt-6 mb-3">
            {trimmed.slice(4)}
          </h3>
        );
      } else if (trimmed.startsWith("## ")) {
        flushParagraph();
        flushList();
        elements.push(
          <h2 key={`h2-${index}`} className="text-xl font-semibold text-gray-900 mt-8 mb-4">
            {trimmed.slice(3)}
          </h2>
        );
      } else if (trimmed.startsWith("# ")) {
        flushParagraph();
        flushList();
        elements.push(
          <h1 key={`h1-${index}`} className="text-2xl font-bold text-gray-900 mt-8 mb-4">
            {trimmed.slice(2)}
          </h1>
        );
      }
      // Bullet points (-, *)
      else if (trimmed.match(/^[-*]\s+/)) {
        flushParagraph();
        inList = true;
        listItems.push(trimmed.slice(2));
      }
      // Empty line
      else if (trimmed === "") {
        if (inList) {
          flushList();
        } else {
          flushParagraph();
        }
      }
      // Regular text
      else {
        if (inList) {
          flushList();
        }
        currentParagraph.push(trimmed);
      }
    });

    // Flush remaining content
    flushList();
    flushParagraph();

    return elements;
  }, [content]);

  return <div className="space-y-2">{formattedContent}</div>;
}
