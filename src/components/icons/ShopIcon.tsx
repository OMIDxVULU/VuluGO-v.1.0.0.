import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

interface IconProps {
  color: string;
  size: number;
  active?: boolean;
}

const ShopIcon: React.FC<IconProps> = ({ color, size, active }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 6H21L19 16H5L3 6Z"
        stroke={color}
        strokeWidth={active ? 2.2 : 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M7 21H17V16H7V21Z"
        stroke={color}
        strokeWidth={active ? 2.2 : 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Circle 
        cx="9" 
        cy="9" 
        r="1" 
        fill={color}
      />
      <Circle 
        cx="15" 
        cy="9" 
        r="1" 
        fill={color}
      />
    </Svg>
  );
};

export default ShopIcon; 