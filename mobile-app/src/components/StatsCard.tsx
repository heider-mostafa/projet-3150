import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { GlassCard } from './GlassCard';
import { colors, spacing, typography } from '../theme';

interface StatsCardProps {
    label: string;
    value: string | number;
    subValue?: string;
    trend?: 'up' | 'down';
    trendValue?: string;
    style?: StyleProp<ViewStyle>;
}

export const StatsCard: React.FC<StatsCardProps> = ({
    label,
    value,
    subValue,
    trend,
    trendValue,
    style
}) => {
    return (
        <GlassCard style={[styles.container, style]}>
            <Text style={styles.label}>{label.toUpperCase()}</Text>
            <Text style={styles.value}>{value}</Text>
            {subValue && <Text style={styles.subValue}>{subValue}</Text>}
            {trend && (
                <View style={styles.trendRow}>
                    <Text style={[
                        styles.trendText,
                        { color: trend === 'up' ? colors.success : colors.error }
                    ]}>
                        {trend === 'up' ? '▲' : '▼'} {trendValue}
                    </Text>
                </View>
            )}
        </GlassCard>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        minWidth: 140,
    },
    label: {
        fontSize: 8,
        fontWeight: '700',
        color: colors.textTertiary,
        letterSpacing: 1.5,
        marginBottom: spacing.xs,
    },
    value: {
        fontSize: typography.sizes.xl,
        fontWeight: '700',
        color: colors.text,
    },
    subValue: {
        fontSize: 10,
        color: colors.textTertiary,
        marginTop: 2,
    },
    trendRow: {
        marginTop: spacing.s,
    },
    trendText: {
        fontSize: 10,
        fontWeight: '700',
    },
});
