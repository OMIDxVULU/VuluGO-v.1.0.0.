import React from 'react';
import Svg, { Path, G, Circle } from 'react-native-svg';
import { View } from 'react-native';

interface ViewerIconProps {
  width?: number;
  height?: number;
  color?: string;
}

const ViewerIcon: React.FC<ViewerIconProps> = ({
  width = 20,
  height = 20,
  color = '#FF4D8F'
}) => {
  return (
    <View>
      <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
        {/* Group of people icon */}
        <G>
          {/* First person (center) */}
          <Circle cx="12" cy="8" r="3.5" fill={color} />
          <Path 
            d="M12 12.5c-2.5 0-5.5 1.5-5.5 4v2.5h11V16.5c0-2.5-3-4-5.5-4z" 
            fill={color} 
          />
          
          {/* Second person (left) */}
          <Circle cx="6.5" cy="9" r="2.5" fillOpacity="0.7" fill={color} />
          <Path 
            d="M6.5 12.5c-1.5 0-4.5 1-4.5 3v2h4v-2c0-1.2 0.5-2.3 1.5-3" 
            fillOpacity="0.7" 
            fill={color} 
          />
          
          {/* Third person (right) */}
          <Circle cx="17.5" cy="9" r="2.5" fillOpacity="0.7" fill={color} />
          <Path 
            d="M17.5 12.5c1.5 0 4.5 1 4.5 3v2h-4v-2c0-1.2-0.5-2.3-1.5-3" 
            fillOpacity="0.7" 
            fill={color} 
          />
        </G>
      </Svg>
    </View>
  );
};

export default ViewerIcon; 