import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

interface IconProps {
  color: string;
  size: number;
  active?: boolean;
}

const RanksIcon: React.FC<IconProps> = ({ color, size, active }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 15L8.5 11.5L5 15V5C5 4.44772 5.44772 4 6 4H11C11.5523 4 12 4.44772 12 5V15Z"
        stroke={color}
        strokeWidth={active ? 2.2 : 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Rect
        x="14"
        y="6"
        width="5"
        height="14"
        rx="1"
        stroke={color}
        strokeWidth={active ? 2.2 : 1.8}
        fill="none"
      />
      <Path
        d="M9 20H19"
        stroke={color}
        strokeWidth={active ? 2.2 : 1.8}
        strokeLinecap="round"
      />
      <Path
        d="M5 20H7"
        stroke={color}
        strokeWidth={active ? 2.2 : 1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
};

export default RanksIcon; 