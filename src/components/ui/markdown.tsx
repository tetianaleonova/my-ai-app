import React from "react";

function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

function parseTableRow(line: string): string[] {
  return line
    .split("|")
    .slice(1, -1)
    .map((cell) => cell.trim());
}

function isTableSeparator(line: string): boolean {
  return /^\|[\s\-|:]+\|$/.test(line.trim());
}

function isTableRow(line: string): boolean {
  return line.trim().startsWith("|") && line.trim().endsWith("|");
}

export function Markdown({ content, className = "" }: { content: string; className?: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    // Table
    if (isTableRow(line)) {
      const headers = parseTableRow(line);
      i++;
      // skip separator row
      if (i < lines.length && isTableSeparator(lines[i])) i++;
      const rows: string[][] = [];
      while (i < lines.length && isTableRow(lines[i])) {
        rows.push(parseTableRow(lines[i]));
        i++;
      }
      elements.push(
        <div key={`table-${i}`} className="overflow-x-auto my-2 rounded-xl border border-gray-100">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50">
                {headers.map((h, hi) => (
                  <th
                    key={hi}
                    className="px-4 py-2.5 text-left font-semibold text-gray-700 border-b border-gray-100 whitespace-nowrap"
                  >
                    {renderInline(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className={ri % 2 === 1 ? "bg-gray-50/50" : ""}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-4 py-2 text-gray-700 border-b border-gray-50 last:border-0">
                      {renderInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // ## Heading
    if (line.startsWith("## ")) {
      elements.push(
        <p key={i} className="font-bold text-gray-900 mt-3 mb-0.5 text-base">
          {renderInline(line.slice(3))}
        </p>
      );
      i++;
      continue;
    }

    // ### Heading
    if (line.startsWith("### ")) {
      elements.push(
        <p key={i} className="font-semibold text-gray-800 mt-2 mb-0.5">
          {renderInline(line.slice(4))}
        </p>
      );
      i++;
      continue;
    }

    // Bullet list (-, •)
    if (/^[-•]\s/.test(line)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^[-•]\s/.test(lines[i])) {
        items.push(
          <li key={i} className="flex gap-2">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-current shrink-0 opacity-40" />
            <span>{renderInline(lines[i].replace(/^[-•]\s/, ""))}</span>
          </li>
        );
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="space-y-1 my-1 ml-1">
          {items}
        </ul>
      );
      continue;
    }

    // Numbered list
    if (/^\d+\.\s/.test(line)) {
      const items: React.ReactNode[] = [];
      let num = 1;
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(
          <li key={i} className="flex gap-2">
            <span className="shrink-0 font-semibold text-gray-400 w-5">{num}.</span>
            <span>{renderInline(lines[i].replace(/^\d+\.\s/, ""))}</span>
          </li>
        );
        i++;
        num++;
      }
      elements.push(
        <ol key={`ol-${i}`} className="space-y-1 my-1 ml-1">
          {items}
        </ol>
      );
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={i} className="leading-relaxed">
        {renderInline(line)}
      </p>
    );
    i++;
  }

  return <div className={`space-y-1.5 ${className}`}>{elements}</div>;
}
