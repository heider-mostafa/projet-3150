import React from 'react';
import { TextInput, View, Text, StyleSheet, TextInputProps } from 'react-native';
import { colors, spacing, typography, layout } from '../theme';

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
}

export const Input: React.FC<InputProps> = ({
    label,
    error,
    style,
    ...props
}) => {
    return (
        <View style={styles.wrapper}>
            {label && <Text style={styles.label}>{label.toUpperCase()}</Text>}
            <TextInput
                style={[
                    styles.input,
                    error ? styles.inputError : null,
                    style
                ]}
                placeholderTextColor={colors.textSecondary}
                {...props}
            />
            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        marginBottom: spacing.m,
    },
    label: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.textSecondary,
        marginBottom: spacing.xs,
        letterSpacing: 0.5,
    },
    input: {
        height: 56,
        borderWidth: layout.borderWidth,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        paddingHorizontal: spacing.m,
        fontSize: typography.sizes.m,
        color: colors.text,
        borderRadius: layout.radius,
    },
    inputError: {
        borderColor: colors.error,
    },
    errorText: {
        marginTop: spacing.xs,
        color: colors.error,
        fontSize: typography.sizes.xs,
    },
});
