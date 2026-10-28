import React from 'react';
import { Svg, Circle, Path, G } from 'react-native-svg';
import { useTheme } from '@/ui/theme';
import { 
  createSegmentPath, 
  FOCUS_RING_CONSTANTS 
} from './SegmentPath';

interface RingSVGProps {
  mode: 'work' | 'break';
  innerProgress: number;           // 0-1 (iç halka progress)
  outerSegmentsProgress: number[]; // Her segmentin progress'i (0-1)
  totalSessions: number;
  completedWorkSessions: number;
  isRunning: boolean;
  innerColor: string;      // Çalışma iç
  outerColor: string;      // Çalışma dış
  breakInnerColor: string; // Mola iç
  breakOuterColor: string; // Mola dış
}

export function RingSVG({
  mode,
  innerProgress,
  outerSegmentsProgress,
  totalSessions,
  completedWorkSessions,
  isRunning,
  innerColor,
  outerColor,
  breakInnerColor,
  breakOuterColor,
}: RingSVGProps) {
  const { c } = useTheme();
  const { SVG_SIZE, CENTER, R_INNER, R_OUTER, W_INNER, W_OUTER, DASH_INNER } = FOCUS_RING_CONSTANTS;
  
  const isWork = mode === 'work';
  const innerStroke = isWork ? innerColor : breakInnerColor;

  // Segment path'leri önceden hesapla
  const segmentPaths = React.useMemo(() => 
    Array.from({ length: totalSessions }, (_, i) => ({
      bgPath: createSegmentPath({ index: i, total: totalSessions, progress: 1, radius: FOCUS_RING_CONSTANTS.R_OUTER, center: FOCUS_RING_CONSTANTS.CENTER }),
      fgPath: (progress: number) => createSegmentPath({ index: i, total: totalSessions, progress, radius: FOCUS_RING_CONSTANTS.R_OUTER, center: FOCUS_RING_CONSTANTS.CENTER }),
    })), [totalSessions]);

  return (
    <Svg width={SVG_SIZE} height={SVG_SIZE} style={{ transform: [{ rotate: '-90deg' }] }}>
      {/* Dış segmentler */}
      <G>
        {segmentPaths.map(({ bgPath, fgPath }, i) => {
          const isCompleted = i < completedWorkSessions;
          const isCurrent = i === completedWorkSessions && isRunning;
          const isCurrentBreak = mode === 'break' && isRunning && i === completedWorkSessions;
          
          let progress = 0;
          let strokeColor = c.border;
          
          if (isCompleted) {
            progress = 1;
            strokeColor = outerColor; // Tamamlanan çalışmalar her zaman çalışma rengi
          } else if (isCurrent) {
            progress = outerSegmentsProgress[i];
            strokeColor = outerColor;
          } else if (isCurrentBreak) {
            progress = outerSegmentsProgress[i];
            strokeColor = breakOuterColor;
          } else if (mode === 'break' && i < completedWorkSessions) {
            // Mola sırasında tamamlanmış çalışmalar dolu kalsın
            progress = 1;
            strokeColor = outerColor;
          }
          
          return (
            <React.Fragment key={i}>
              {/* Background segment (track) */}
              <Path
                d={bgPath}
                stroke={c.border}
                strokeWidth={FOCUS_RING_CONSTANTS.W_OUTER}
                fill="none"
                strokeLinecap="round"
              />
              {/* Foreground segment (progress) */}
              <Path
                d={fgPath(progress)}
                stroke={strokeColor}
                strokeWidth={FOCUS_RING_CONSTANTS.W_OUTER}
                fill="none"
                strokeLinecap="round"
              />
            </React.Fragment>
          );
        })}
      </G>

      {/* Dış halka arka plan (tam daire) */}
      <Circle
        cx={CENTER}
        cy={CENTER}
        r={R_OUTER}
        stroke={c.border}
        strokeWidth={W_OUTER}
        fill="none"
        strokeLinecap="round"
      />

      {/* İç halka arka plan (tam daire) */}
      <Circle
        cx={CENTER}
        cy={CENTER}
        r={R_INNER}
        stroke={c.border}
        strokeWidth={W_INNER}
        fill="none"
      />

      {/* İç halka progress */}
      <Circle
        cx={CENTER}
        cy={CENTER}
        r={R_INNER}
        stroke={innerStroke}
        strokeWidth={W_INNER}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={DASH_INNER}
        strokeDashoffset={DASH_INNER * (1 - innerProgress)}
      />
    </Svg>
  );
}