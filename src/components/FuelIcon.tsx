import React from 'react';
import Svg, { Path, Defs, LinearGradient, Stop, Filter, FeGaussianBlur, FeColorMatrix } from 'react-native-svg';

interface FuelIconProps {
  width?: number;
  height?: number;
  primaryColor?: string;
  secondaryColor?: string;
  glowColor?: string;
}

const FuelIcon = ({ 
  width = 24, 
  height = 24, 
  primaryColor = "#F2E558", 
  secondaryColor = "#F358E2",
  glowColor = "rgba(242, 229, 88, 0.5)"
}: FuelIconProps) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
      <Defs>
        <LinearGradient 
          id="fuelGradient" 
          x1="3" 
          y1="3" 
          x2="21" 
          y2="21" 
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0" stopColor={primaryColor} />
          <Stop offset="1" stopColor={secondaryColor} />
        </LinearGradient>
        <Filter id="fuelGlow" x="-50%" y="-50%" width="200%" height="200%">
          <FeGaussianBlur stdDeviation="1.5" />
          <FeColorMatrix
            type="matrix"
            values="0 0 0 0 0.95
                    0 0 0 0 0.9
                    0 0 0 0 0.2
                    0 0 0 0.5 0"
          />
        </Filter>
      </Defs>
      
      {/* Glow effect */}
      <Path 
        d="M18 10a1 1 0 0 1-1-1V5h-6a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-7a1 1 0 0 0-1-1h-1zm-4 5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" 
        fill={glowColor}
        filter="url(#fuelGlow)"
      />
      
      {/* Main shape */}
      <Path 
        d="M19.77 7.23l.01-.01-3.72-3.72L15 4.56l2.11 2.11c-.94.36-1.61 1.26-1.61 2.33a2.5 2.5 0 0 0 2.5 2.5c.36 0 .69-.08 1-.21v7.21c0 .55-.45 1-1 1s-1-.45-1-1V14c0-1.1-.9-2-2-2h-1V5c0-1.1-.9-2-2-2H6c-1.1 0-2 .9-2 2v16h10v-7.5h1.5v5a2.5 2.5 0 0 0 5 0V9c0-.69-.28-1.32-.73-1.77zM12 10H6V5h6v5zm6 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" 
        fill="url(#fuelGradient)"
      />
      
      {/* Highlight */}
      <Path 
        d="M11 8.5c0 .83-.67 1.5-1.5 1.5S8 9.33 8 8.5 8.67 7 9.5 7s1.5.67 1.5 1.5z" 
        fill="#FFFFFF" 
        fillOpacity="0.5" 
      />
    </Svg>
  );
};

export default FuelIcon; 