import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { colors, spacing, layout } from '../theme';

interface PersonaToggleProps {
    activePersona: 'tenant' | 'landlord';
    onPersonaChange: (persona: 'tenant' | 'landlord') => void;
}

export const PersonaToggle: React.FC<PersonaToggleProps> = ({
    activePersona,
    onPersonaChange
}) => {
    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={[styles.segment, activePersona === 'tenant' && styles.activeSegment]}
                onPress={() => onPersonaChange('tenant')}
            >
                <Text style={[styles.text, activePersona === 'tenant' && styles.activeText]}>TENANT</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.segment, activePersona === 'landlord' && styles.activeSegment]}
                onPress={() => onPersonaChange('landlord')}
            >
                <Text style={[styles.text, activePersona === 'landlord' && styles.activeText]}>LANDLORD</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        backgroundColor: 'rgba(0,0,0,0.05)',
        padding: 2,
        borderRadius: 6,
        marginBottom: spacing.l,
    },
    segment: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 4,
    },
    activeSegment: {
        backgroundColor: colors.surface,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    text: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.textTertiary,
        letterSpacing: 1,
    },
    activeText: {
        color: colors.primary,
    },
});
