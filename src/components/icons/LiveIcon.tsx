import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

interface IconProps {
  color: string;
  size: number;
  active?: boolean;
}

const LiveIcon: React.FC<IconProps> = ({ color, size, active }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M17 4H7C4.79086 4 3 5.79086 3 8V16C3 18.2091 4.79086 20 7 20H17C19.2091 20 21 18.2091 21 16V8C21 5.79086 19.2091 4 17 4Z"
        stroke={color}
        strokeWidth={active ? 2.2 : 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Circle 
        cx="12" 
        cy="12" 
        r="3" 
        stroke={color}
        strokeWidth={active ? 2.2 : 1.8}
        fill="none"
      />
      <Circle 
        cx="12" 
        cy="12" 
        r="1" 
        fill={color}
      />
    </Svg>
  );
};

export default LiveIcon; 