/**
 * 프로필 섹션 컴포넌트
 */
import { User, ChevronRight, LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function ProfileSection({ onEditProfile, onLogout }) {
  const { user } = useAuth();

  return (
    <div className="bg-bg-secondary border border-border-default rounded-xl overflow-hidden">
      {/* 프로필 정보 */}
      <button
        onClick={onEditProfile}
        className="w-full flex items-center gap-3 p-4 hover:bg-bg-tertiary/50 transition-colors"
      >
        {/* 아바타 */}
        <div className="w-14 h-14 bg-accent-primary/20 rounded-full flex items-center justify-center">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt="프로필"
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <User size={24} className="text-accent-primary" />
          )}
        </div>

        <div className="flex-1 text-left">
          <h3 className="font-medium text-text-primary">
            {user?.name || '사용자'}
          </h3>
          <p className="text-sm text-text-secondary">
            {user?.email || '프로필 설정하기'}
          </p>
        </div>

        <ChevronRight size={20} className="text-text-muted" />
      </button>

      {/* 통계 */}
      {user && (
        <div className="grid grid-cols-3 border-t border-border-default">
          <div className="p-3 text-center border-r border-border-default">
            <p className="text-lg font-bold text-accent-primary">{user.dreamCount || 0}</p>
            <p className="text-xs text-text-muted">기록한 꿈</p>
          </div>
          <div className="p-3 text-center border-r border-border-default">
            <p className="text-lg font-bold text-accent-secondary">{user.checkInStreak || 0}</p>
            <p className="text-xs text-text-muted">연속 체크인</p>
          </div>
          <div className="p-3 text-center">
            <p className="text-lg font-bold text-accent-success">{user.symbolCount || 0}</p>
            <p className="text-xs text-text-muted">발견한 심볼</p>
          </div>
        </div>
      )}

      {/* 로그아웃 */}
      <button
        onClick={onLogout}
        className="w-full flex items-center gap-2 p-4 border-t border-border-default
                   text-accent-danger hover:bg-accent-danger/10 transition-colors"
      >
        <LogOut size={18} />
        <span>로그아웃</span>
      </button>
    </div>
  );
}
