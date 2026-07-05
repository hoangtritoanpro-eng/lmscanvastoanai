import React, { useEffect, useRef, memo } from 'react';

interface Props {
  content: string;
  className?: string;
  block?: boolean;
}

const normalizeLatexMarkup = (raw: string): string => {
  if (!raw) return '';

  let text = String(raw);

  // Chuẩn hóa các lời giải AI hay trả về dạng LaTeX list để không hiện thô:
  // \begin{itemize} \item ... \item ... \end{itemize}
  const convertList = (input: string, env: 'itemize' | 'enumerate') => {
    const tag = env === 'itemize' ? 'ul' : 'ol';
    const pattern = new RegExp(`\\\\begin\\{${env}\\}([\\s\\S]*?)\\\\end\\{${env}\\}`, 'g');
    return input.replace(pattern, (_match, body) => {
      const items = String(body)
        .split(/\\item/g)
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => `<li>${item}</li>`)
        .join('');
      return `<${tag} class="list-disc ml-5 space-y-1">${items}</${tag}>`;
    });
  };

  text = convertList(text, 'itemize');
  text = convertList(text, 'enumerate');

  // Nếu dữ liệu bị escape thành \\( ... \\), trả về dạng MathJax chuẩn.
  text = text.replace(/\\\\\(/g, '\\(').replace(/\\\\\)/g, '\\)');
  text = text.replace(/\\\\\[/g, '\\[').replace(/\\\\\]/g, '\\]');

  // Xuống dòng trong text thuần dễ đọc hơn, nhưng không phá HTML đã có.
  text = text.replace(/\n/g, '<br/>');

  return text;
};

const MathText: React.FC<Props> = ({ content, className = '', block = false }) => {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    const render = async (attempt = 0) => {
      if (!ref.current || cancelled) return;

      let processedContent = normalizeLatexMarkup(content || '');
      if (!block) {
        // Trong option/inline, tránh $$ làm vỡ layout; MathJax vẫn render $...$.
        processedContent = processedContent.replace(/\$\$/g, '$');
      }

      ref.current.innerHTML = processedContent;

      const mathJax = (window as any).MathJax;
      if (mathJax?.typesetPromise) {
        try {
          ref.current.removeAttribute('data-mathjax-type');
          await mathJax.typesetPromise([ref.current]);
        } catch (err) {
          console.warn('MathJax error:', err);
        }
      } else if (attempt < 8) {
        // MathJax có thể load chậm; vẫn hiển thị text trước, rồi thử render lại vài lần.
        window.setTimeout(() => render(attempt + 1), 250);
      }
    };

    render();
    return () => { cancelled = true; };
  }, [content, block]);

  const Component = block ? 'div' : 'span';

  return (
    <Component
      ref={ref as any}
      className={`${className} ${!block ? 'inline-math-wrapper' : ''}`}
      style={{ display: block ? 'block' : 'inline' }}
    />
  );
};

export default memo(MathText);
