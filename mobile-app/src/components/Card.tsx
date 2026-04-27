import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing, layout } from '../theme';

interface CardProps {
    children: React.ReactNode;
    style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({ children, style }) => {
    return (
        <View style={[styles.container, style]}>
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.surface,
        borderWidth: layout.borderWidth,
        borderColor: colors.border,
        padding: spacing.m,
        borderRadius: layout.radius,
        // No shadows - flatness is the key
    },
});
