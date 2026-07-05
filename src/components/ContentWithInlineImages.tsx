import React from 'react';
import QuestionImage from './QuestionImage';
import MathText from './MathText';

interface ContentWithInlineImagesProps {
  content: string;
  className?: string;
  /** Dùng khi muốn render text trong cùng dòng. Mặc định false để lời giải/câu hỏi hiển thị đẹp hơn. */
  inline?: boolean;
}

/**
 * Component render nội dung có thể chứa:
 * - Công thức MathJax/LaTeX: $...$, $$...$$, \(...\), \[...\]
 * - Ảnh inline: [IMAGE:drive_file_id] hoặc [IMG:drive_file_id]
 * - HTML đơn giản từ Word/import
 *
 * Lưu ý: phần text được đưa qua MathText, không render raw bằng dangerouslySetInnerHTML nữa,
 * nên công thức toán trong câu hỏi/đáp án/lời giải sẽ được MathJax typeset.
 */
const ContentWithInlineImages: React.FC<ContentWithInlineImagesProps> = ({
  content,
  className = '',
  inline = false,
}) => {
  if (!content) return null;

  const imagePattern = /\[(?:IMAGE|IMG):([^\]]+)\]/gi;
  const parts: Array<{ type: 'text' | 'image'; content: string }> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  imagePattern.lastIndex = 0;
  while ((match = imagePattern.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: content.substring(lastIndex, match.index) });
    }
    parts.push({ type: 'image', content: match[1].trim() });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push({ type: 'text', content: content.substring(lastIndex) });
  }

  if (parts.length === 0 || (parts.length === 1 && parts[0].type === 'text')) {
    return <MathText content={content} className={className} block={!inline} />;
  }

  return (
    <div className={className}>
      {parts.map((part, index) => {
        if (part.type === 'text') {
          return (
            <MathText
              key={`text-${index}`}
              content={part.content}
              block={!inline}
              className={inline ? 'inline' : 'block'}
            />
          );
        }
        return (
          <QuestionImage
            key={`image-${index}`}
            imageId={part.content}
            alt={`Hình ${index + 1}`}
          />
        );
      })}
    </div>
  );
};

export default ContentWithInlineImages;
