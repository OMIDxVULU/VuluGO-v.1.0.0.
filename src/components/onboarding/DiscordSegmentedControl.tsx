import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AuthColors } from '../auth/AuthDesignSystem';

interface SegmentedControlOption {
  value: string;
  label: string;
}

interface DiscordSegmentedControlProps {
  options: SegmentedControlOption[];
  selectedValue: string;
  onValueChange: (value: string) => void;
  style?: any;
}

export const DiscordSegmentedControl: React.FC<DiscordSegmentedControlProps> = ({
  options,
  selectedValue,
  onValueChange,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {options.map((option, index) => {
        const isSelected = option.value === selectedValue;
        const isFirst = index === 0;
        const isLast = index === options.length - 1;
        
        return (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.segment,
              isSelected && styles.segmentSelected,
              isFirst && styles.segmentFirst,
              isLast && styles.segmentLast,
            ]}
            onPress={() => onValueChange(option.value)}
            activeOpacity={0.8}
          >
            <Text style={[
              styles.segmentText,
              isSelected && styles.segmentTextSelected,
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// Discord-style pill toggle for single options
interface DiscordPillToggleProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  style?: any;
}

export const DiscordPillToggle: React.FC<DiscordPillToggleProps> = ({
  label,
  selected,
  onPress,
  style,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.pillToggle,
        selected && styles.pillToggleSelected,
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[
        styles.pillToggleText,
        selected && styles.pillToggleTextSelected,
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Segmented Control Styles - Discord exact tokens
  container: {
    flexDirection: 'row',
    backgroundColor: '#151924', // Panel/surface
    borderRadius: 14, // Default radius
    padding: 2,
    borderWidth: 1,
    borderColor: '#252A3A', // Border/divider
  },
  segment: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12, // Slightly smaller than container
    minHeight: 44, // Good touch target
  },
  segmentSelected: {
    backgroundColor: '#5865F2', // Accent primary
    // Remove elevation/shadows for minimal look
  },
  segmentFirst: {
    // No additional styling needed due to container border radius
  },
  segmentLast: {
    // No additional styling needed due to container border radius
  },
  segmentText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#9AA3B2', // Muted text for inactive
  },
  segmentTextSelected: {
    color: '#FFFFFF', // White text for active
    fontWeight: '600',
  },

  // Pill Toggle Styles - Discord exact tokens
  pillToggle: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20, // Full pill shape
    backgroundColor: '#151924', // Panel/surface
    borderWidth: 1,
    borderColor: '#252A3A', // Border/divider
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44, // Good touch target
  },
  pillToggleSelected: {
    backgroundColor: '#5865F2', // Accent primary
    borderColor: '#5865F2',
    // Remove elevation/shadows for minimal look
  },
  pillToggleText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#9AA3B2', // Muted text for inactive
  },
  pillToggleTextSelected: {
    color: '#FFFFFF', // White text for active
    fontWeight: '600',
  },
});

export default {
  DiscordSegmentedControl,
  DiscordPillToggle,
};
