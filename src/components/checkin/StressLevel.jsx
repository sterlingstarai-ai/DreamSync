/**
 * 스트레스 레벨 컴포넌트 (2축: 업무/관계)
 */
import { useState } from 'react';
import { Briefcase, Users } from 'lucide-react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

const stressLabels = ['없음', '약간', '보통', '높음', '매우 높음'];

export default function StressLevel({ value, onChange }) {
  const [work, setWork] = useState(value?.work || 1);
  const [relation, setRelation] = useState(value?.relation || 1);

  const handleChange = async (type, newValue) => {
    if (type === 'work') {
      setWork(newValue);
      onChange?.({ work: newValue, relation });
    } else {
      setRelation(newValue);
      onChange?.({ work, relation: newValue });
    }

    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (e) {
      // 웹에서는 무시
    }
  };

  const StressSlider = ({ type, value: sliderValue, icon: Icon, label }) => (
    <div className="mb-4 last:mb-0">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} className="text-text-muted" />
        <span className="text-sm text-text-secondary">{label}</span>
        <span className="ml-auto text-sm text-accent-primary font-medium">
          {stressLabels[sliderValue - 1]}
        </span>
      </div>

      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((num) => (
          <button
            key={num}
            onClick={() => handleChange(type, num)}
            className={`flex-1 h-8 rounded transition-all ${
              num <= sliderValue
                ? num <= 2
                  ? 'bg-accent-success'
                  : num <= 3
                    ? 'bg-accent-warning'
                    : 'bg-accent-danger'
                : 'bg-bg-tertiary'
            }`}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="p-4 bg-bg-secondary border border-border-default rounded-xl">
      <label className="block text-sm text-text-secondary mb-4">스트레스 수준</label>

      <StressSlider type="work" value={work} icon={Briefcase} label="업무/학업" />
      <StressSlider type="relation" value={relation} icon={Users} label="대인관계" />
    </div>
  );
}
