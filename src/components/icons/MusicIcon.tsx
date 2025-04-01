import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

interface IconProps {
  color: string;
  size: number;
  active?: boolean;
}

const MusicIcon: React.FC<IconProps> = ({ color, size, active }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle 
        cx="5.5" 
        cy="17.5" 
        r="2.5" 
        stroke={color}
        strokeWidth={active ? 2.2 : 1.8}
        fill="none"
      />
      <Circle 
        cx="18.5" 
        cy="15.5" 
        r="2.5" 
        stroke={color}
        strokeWidth={active ? 2.2 : 1.8}
        fill="none"
      />
      <Path
        d="M8 17.5V6L21 3V15.5"
        stroke={color}
        strokeWidth={active ? 2.2 : 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

export default MusicIcon; 