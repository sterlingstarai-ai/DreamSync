/**
 * 음성 녹음 컴포넌트
 */
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useVoiceInput } from '../../hooks/useVoiceInput';

export default function VoiceRecorder({ onTranscript, onError }) {
  const { isListening, isSupported, transcript, startListening, stopListening, error } = useVoiceInput();

  const handleToggle = () => {
    if (isListening) {
      stopListening();
      if (transcript) {
        onTranscript?.(transcript);
      }
    } else {
      startListening();
    }
  };

  if (!isSupported) {
    return (
      <div className="flex items-center gap-2 text-text-muted text-sm">
        <MicOff size={16} />
        <span>음성 입력을 지원하지 않는 브라우저입니다</span>
      </div>
    );
  }

  if (error) {
    onError?.(error);
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={handleToggle}
        className={`p-4 rounded-full transition-all ${
          isListening
            ? 'bg-accent-danger animate-pulse'
            : 'bg-accent-primary hover:bg-accent-primary/80'
        }`}
      >
        {isListening ? (
          <Loader2 size={24} className="text-white animate-spin" />
        ) : (
          <Mic size={24} className="text-white" />
        )}
      </button>

      <span className="text-sm text-text-secondary">
        {isListening ? '듣고 있어요...' : '탭하여 음성으로 기록'}
      </span>

      {transcript && isListening && (
        <div className="w-full p-3 bg-bg-tertiary rounded-lg text-sm text-text-primary">
          {transcript}
        </div>
      )}
    </div>
  );
}
