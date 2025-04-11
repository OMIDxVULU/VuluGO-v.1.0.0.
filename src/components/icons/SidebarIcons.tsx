import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

interface IconProps {
  color: string;
  size?: number;
  active?: boolean;
}

export const ChatIcon: React.FC<IconProps> = ({ color, size = 24, active = false }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H4V4h16v12z"
      stroke={color}
      strokeWidth={active ? 2.2 : 1.8}
      fill="none"
    />
  </Svg>
);

export const LiveIcon: React.FC<IconProps> = ({ color, size = 24, active = false }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21 6h-7.59l3.29-3.29L16 2l-4 4-4-4-.71.71L10.59 6H3c-1.1 0-2 .89-2 2v12c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.11-.9-2-2-2zm0 14H3V8h18v12z"
      stroke={color}
      strokeWidth={active ? 2.2 : 1.8}
      fill="none"
    />
  </Svg>
);

export const MusicIcon: React.FC<IconProps> = ({ color, size = 24, active = false }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle 
      cx="5.5" 
      cy="17.5" 
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

export const GoldMinerIcon: React.FC<IconProps> = ({ color, size = 24, active = false }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M15.75 8.25L12 12m-6 2.25a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 0 0 0-4.5z"
      stroke={color}
      strokeWidth={active ? 2.2 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M19.5 19.5a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5z"
      stroke={color}
      strokeWidth={active ? 2.2 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M6.75 7.5l9 4.5m-9-4.5A2.25 2.25 0 1 1 6.75 3a2.25 2.25 0 0 1 0 4.5z"
      stroke={color}
      strokeWidth={active ? 2.2 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const SlotsIcon: React.FC<IconProps> = ({ color, size = 24, active = false }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm1 2v14h14V5H5zm2 6h10v2H7v-2z"
      stroke={color}
      strokeWidth={active ? 2.2 : 1.8}
      fill="none"
    />
  </Svg>
);

export const LeaderboardIcon: React.FC<IconProps> = ({ color, size = 24, active = false }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M7.5 21H2V9h5.5v12zm7.25-18h-5.5v18h5.5V3zM22 11h-5.5v10H22V11z"
      stroke={color}
      strokeWidth={active ? 2.2 : 1.8}
      fill="none"
    />
  </Svg>
);

export const ShopIcon: React.FC<IconProps> = ({ color, size = 24, active = false }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"
      stroke={color}
      strokeWidth={active ? 2.2 : 1.8}
      fill="none"
    />
  </Svg>
); 