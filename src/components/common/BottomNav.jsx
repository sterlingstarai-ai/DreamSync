/**
 * Bottom Navigation 컴포넌트
 * 모바일 하단 네비게이션
 */
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Moon, CheckSquare, BarChart3, Settings } from 'lucide-react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

const navItems = [
  { path: '/', icon: Home, label: '홈' },
  { path: '/dream', icon: Moon, label: '꿈 기록' },
  { path: '/checkin', icon: CheckSquare, label: '체크인' },
  { path: '/report', icon: BarChart3, label: '리포트' },
  { path: '/settings', icon: Settings, label: '설정' },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleNavClick = async (path) => {
    if (Capacitor.isNativePlatform()) {
      try {
        await Haptics.impact({ style: ImpactStyle.Light });
      } catch {
        // 무시
      }
    }
    navigate(path);
  };

  return (
    <nav className="bottom-nav fixed bottom-0 left-0 right-0 z-40">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <button
              key={item.path}
              onClick={() => handleNavClick(item.path)}
              className={`
                flex flex-col items-center justify-center
                w-16 h-full gap-0.5
                transition-colors duration-150
                ${isActive
                  ? 'text-violet-400'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }
              `}
            >
              <div className="relative">
                <Icon
                  className={`w-6 h-6 transition-transform duration-150 ${
                    isActive ? 'scale-110' : ''
                  }`}
                />
                {isActive && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-violet-400" />
                )}
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/**
 * Bottom Nav가 있는 레이아웃용 패딩
 */
export function BottomNavSpacer() {
  return <div className="h-20" />;
}
