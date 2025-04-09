import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface PersonGroupIconProps {
  size?: number;
  primaryColor?: string;
  secondaryColor?: string;
  spacing?: number;
  overlap?: number;
}

const PersonGroupIcon: React.FC<PersonGroupIconProps> = ({
  size = 24,
  primaryColor = '#E358F2',
  secondaryColor = '#5865F2',
  spacing = 2,
  overlap = 0.3,
}) => {
  const personWidth = size * 0.4;
  const personHeight = size * 0.45;
  const offset = personWidth * (1 - overlap);

  return (
    <View style={styles.container}>
      {/* Left Person (Primary Color) */}
      <View style={[styles.iconWrapper, { left: 0 }]}>
        <Svg width={personWidth} height={personHeight} viewBox="0 0 9 10" fill="none">
          <Path
            d="M4.5 5C5.88071 5 7 3.88071 7 2.5C7 1.11929 5.88071 0 4.5 0C3.11929 0 2 1.11929 2 2.5C2 3.88071 3.11929 5 4.5 5ZM6.75 6H6.46C5.88 6.28 5.21 6.5 4.5 6.5C3.79 6.5 3.13 6.28 2.54 6H2.25C1.01 6 0 7.01 0 8.25V9C0 9.55 0.45 10 1 10H8C8.55 10 9 9.55 9 9V8.25C9 7.01 7.99 6 6.75 6Z"
            fill={primaryColor}
          />
        </Svg>
      </View>

      {/* Center Person (Primary Color) */}
      <View style={[styles.iconWrapper, { left: offset }]}>
        <Svg width={personWidth} height={personHeight} viewBox="0 0 9 10" fill="none">
          <Path
            d="M4.5 5C5.88071 5 7 3.88071 7 2.5C7 1.11929 5.88071 0 4.5 0C3.11929 0 2 1.11929 2 2.5C2 3.88071 3.11929 5 4.5 5ZM6.75 6H6.46C5.88 6.28 5.21 6.5 4.5 6.5C3.79 6.5 3.13 6.28 2.54 6H2.25C1.01 6 0 7.01 0 8.25V9C0 9.55 0.45 10 1 10H8C8.55 10 9 9.55 9 9V8.25C9 7.01 7.99 6 6.75 6Z"
            fill={primaryColor}
          />
        </Svg>
      </View>

      {/* Right Person (Secondary Color) */}
      <View style={[styles.iconWrapper, { left: offset * 2 }]}>
        <Svg width={personWidth} height={personHeight} viewBox="0 0 9 10" fill="none">
          <Path
            d="M4.5 5C5.88071 5 7 3.88071 7 2.5C7 1.11929 5.88071 0 4.5 0C3.11929 0 2 1.11929 2 2.5C2 3.88071 3.11929 5 4.5 5ZM6.75 6H6.46C5.88 6.28 5.21 6.5 4.5 6.5C3.79 6.5 3.13 6.28 2.54 6H2.25C1.01 6 0 7.01 0 8.25V9C0 9.55 0.45 10 1 10H8C8.55 10 9 9.55 9 9V8.25C9 7.01 7.99 6 6.75 6Z"
            fill={secondaryColor}
          />
        </Svg>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrapper: {
    position: 'absolute',
    zIndex: 1,
  },
});

export default PersonGroupIcon; 