/**
 * HealthKit/Health Connect 설정 컴포넌트
 */
import { useState } from 'react';
import { Heart, Check, X, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '../common';

export default function HealthKitSetup({ isConnected, onConnect, onDisconnect }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleConnect = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await onConnect?.();
    } catch (e) {
      setError(e.message || '연결에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setIsLoading(true);

    try {
      await onDisconnect?.();
    } catch (e) {
      setError(e.message || '연결 해제에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 bg-bg-secondary border border-border-default rounded-xl">
      <div className="flex items-start gap-3 mb-4">
        <div className={`p-2 rounded-xl ${isConnected ? 'bg-accent-success/20' : 'bg-bg-tertiary'}`}>
          <Heart size={24} className={isConnected ? 'text-accent-success' : 'text-text-muted'} />
        </div>

        <div className="flex-1">
          <h3 className="font-medium text-text-primary">
            건강 데이터 연동
          </h3>
          <p className="text-sm text-text-secondary mt-1">
            {isConnected
              ? '수면 데이터를 자동으로 수집하고 있어요.'
              : 'Apple HealthKit 또는 Google Health Connect에서 수면 데이터를 가져옵니다.'}
          </p>
        </div>

        {/* 상태 아이콘 */}
        {isConnected ? (
          <Check size={20} className="text-accent-success" />
        ) : (
          <X size={20} className="text-text-muted" />
        )}
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-accent-danger/10 rounded-lg">
          <AlertCircle size={16} className="text-accent-danger" />
          <span className="text-sm text-accent-danger">{error}</span>
        </div>
      )}

      {/* 수집 데이터 목록 */}
      <div className="mb-4 p-3 bg-bg-tertiary rounded-lg">
        <p className="text-xs text-text-muted mb-2">수집하는 데이터:</p>
        <div className="flex flex-wrap gap-2">
          {['수면 시간', 'REM 수면', '딥 수면', '심박수', 'HRV'].map((item) => (
            <span
              key={item}
              className="px-2 py-1 bg-bg-secondary rounded text-xs text-text-secondary"
            >
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* 버튼 */}
      {isConnected ? (
        <Button
          onClick={handleDisconnect}
          variant="secondary"
          fullWidth
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            '연결 해제'
          )}
        </Button>
      ) : (
        <Button
          onClick={handleConnect}
          fullWidth
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            '건강 앱 연결하기'
          )}
        </Button>
      )}

      {/* 안내 문구 */}
      <p className="text-xs text-text-muted text-center mt-3">
        데이터는 기기에만 저장되며 외부로 전송되지 않습니다.
      </p>
    </div>
  );
}
