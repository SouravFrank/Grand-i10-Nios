import Svg, { G, Path } from 'react-native-svg';

type Props = {
  size?: number;
  color?: string;
  style?: object;
};

export function FastagBrandIcon({ size = 24, color = '#F97316', style }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none" style={style}>
      <G stroke={color} strokeLinecap="round" strokeLinejoin="round">
        {/* F Top Bar & Down Hook */}
        <Path d="M 22 36 L 62 36 L 58 45 L 42 45" strokeWidth="7" fill="none" />

        {/* F Left Slanted Leg */}
        <Path d="M 24 36 L 9 74" strokeWidth="8" fill="none" />

        {/* Main Middle Crossbar (Connects F and T, hooks up at right) */}
        <Path d="M 18 52 L 85 52 Q 93 52 93 37" strokeWidth="7" fill="none" />

        {/* T Slanted Leg */}
        <Path d="M 64 52 L 49 74" strokeWidth="8" fill="none" />

        {/* RFID Wireless Signal Waves */}
        <Path d="M 68 36 A 13 13 0 0 1 89 26" strokeWidth="6" fill="none" />
        <Path d="M 67 24 A 17 17 0 0 1 93 14" strokeWidth="6" fill="none" />
        <Path d="M 66 12 A 21 21 0 0 1 96 2" strokeWidth="6" fill="none" />
      </G>
    </Svg>
  );
}
