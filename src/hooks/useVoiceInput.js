/**
 * 음성 입력 훅
 * Web Speech API 사용 (브라우저/웹뷰)
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import logger from '../lib/utils/logger';

/**
 * 음성 인식 지원 여부
 */
const SpeechRecognition = window.SpeechRecognition || /** @type {any} */ (window).webkitSpeechRecognition;
const isSupported = !!SpeechRecognition;

/**
 * 음성 입력 훅
 * @param {Object} options
 * @param {string} [options.language='ko-KR'] - 인식 언어
 * @param {boolean} [options.continuous=true] - 연속 인식 여부
 * @param {Function} [options.onResult] - 결과 콜백
 * @param {Function} [options.onError] - 에러 콜백
 * @returns {Object}
 */
export default function useVoiceInput({
  language = 'ko-KR',
  continuous = true,
  onResult,
  onError,
} = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState(
    isSupported ? null : '음성 인식이 지원되지 않는 브라우저입니다.',
  );

  const recognitionRef = useRef(null);

  /**
   * 음성 인식 초기화
   */
  useEffect(() => {
    if (!isSupported) {
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = language;
    recognition.continuous = continuous;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      if (finalTranscript) {
        setTranscript(prev => prev + finalTranscript);
        onResult?.(finalTranscript);
      }
      setInterimTranscript(interim);
    };

    recognition.onerror = (event) => {
      let errorMessage = '음성 인식 오류가 발생했습니다.';

      switch (event.error) {
        case 'no-speech':
          errorMessage = '음성이 감지되지 않았습니다.';
          break;
        case 'audio-capture':
          errorMessage = '마이크를 찾을 수 없습니다.';
          break;
        case 'not-allowed':
          errorMessage = '마이크 권한이 필요합니다.';
          break;
        case 'network':
          errorMessage = '네트워크 오류가 발생했습니다.';
          break;
        default:
          errorMessage = `오류: ${event.error}`;
      }

      setError(errorMessage);
      setIsListening(false);
      onError?.(event.error, errorMessage);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [language, continuous, onResult, onError]);

  /**
   * 녹음 시작
   */
  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('음성 인식이 지원되지 않습니다.');
      return;
    }

    if (recognitionRef.current && !isListening) {
      setTranscript('');
      setInterimTranscript('');
      setError(null);

      try {
        recognitionRef.current.start();
      } catch {
        // 이미 시작된 경우 무시
        logger.warn('Recognition already started');
      }
    }
  }, [isListening]);

  /**
   * 녹음 중지
   */
  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  /**
   * 녹음 토글
   */
  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  /**
   * 텍스트 초기화
   */
  const clearTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  /**
   * 에러 초기화
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * 전체 텍스트 (확정 + 임시)
   */
  const fullTranscript = transcript + interimTranscript;

  return {
    // 상태
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    fullTranscript,
    error,

    // 액션
    startListening,
    stopListening,
    toggleListening,
    clearTranscript,
    clearError,
  };
}
