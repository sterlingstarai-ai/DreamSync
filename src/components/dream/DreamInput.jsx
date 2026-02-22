/**
 * 꿈 텍스트 입력 컴포넌트
 */
import { useRef, useEffect } from 'react';

export default function DreamInput({ value, onChange, placeholder, maxLength = 2000 }) {
  const textareaRef = useRef(null);
  const charCount = value?.length || 0;

  // 자동 높이 조절
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 300)}px`;
    }
  }, [value]);

  const handleChange = (e) => {
    const newValue = e.target.value;
    if (newValue.length <= maxLength) {
      onChange(newValue);
    }
  };

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        placeholder={placeholder || "꿈의 내용을 자유롭게 적어보세요..."}
        className="w-full min-h-[150px] p-4 bg-bg-tertiary border border-border-default rounded-xl
                   text-text-primary placeholder-text-muted resize-none
                   focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary
                   transition-colors"
        rows={5}
      />
      <div className="absolute bottom-3 right-3 text-xs text-text-muted">
        {charCount} / {maxLength}
      </div>
    </div>
  );
}
