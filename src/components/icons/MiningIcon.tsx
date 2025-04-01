import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

interface IconProps {
  color: string;
  size: number;
  active?: boolean;
}

const MiningIcon: React.FC<IconProps> = ({ color, size, active }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle 
        cx="12" 
        cy="12" 
        r="8" 
        stroke={color}
        strokeWidth={active ? 2.2 : 1.8}
        fill="none"
      />
      <Path
        d="M12 8L14.5 12.5L12 17L9.5 12.5L12 8Z"
        stroke={color}
        strokeWidth={active ? 2.2 : 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M8.5 10.5L15.5 10.5"
        stroke={color}
        strokeWidth={active ? 2.2 : 1.8}
        strokeLinecap="round"
      />
      <Path
        d="M8.5 14.5H15.5"
        stroke={color}
        strokeWidth={active ? 2.2 : 1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
};

export default MiningIcon; 