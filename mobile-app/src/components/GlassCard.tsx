import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors, layout, spacing } from '../theme';

interface GlassCardProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    intensity?: number;
}

export const GlassCard: React.FC<GlassCardProps> = ({
    children,
    style,
    intensity = layout.blurIntensity
}) => {
    return (
        <BlurView
            intensity={intensity}
            tint="light"
            style={[styles.container, style]}
        >
            <View style={styles.inner}>
                {children}
            </View>
        </BlurView>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: layout.radius,
        overflow: 'hidden',
        borderWidth: layout.borderWidth,
        borderColor: 'rgba(255, 255, 255, 0.5)',
        backgroundColor: colors.glass,
    },
    inner: {
        padding: spacing.m,
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.05)',
        borderRadius: layout.radius,
    },
});
