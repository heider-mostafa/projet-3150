import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, layout } from '../theme';
import { ChevronLeft, ShieldCheck, Fingerprint, Download, Trash2, Eye, LucideIcon } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import * as LocalAuthentication from 'expo-local-authentication';

interface SecurityItem {
    icon: LucideIcon;
    label: string;
    sub: string;
    value?: boolean;
    onValueChange?: (val: boolean) => void;
    action?: () => void;
    critical?: boolean;
}

interface SecuritySection {
    title: string;
    items: SecurityItem[];
}

export const SecurityPrivacyScreen = () => {
    const navigation = useNavigation();
    const { user } = useAuth();
    const [faEnabled, setFaEnabled] = useState(true);
    const [biometrics, setBiometrics] = useState(false);
    const [biometricAvailable, setBiometricAvailable] = useState(false);

    // Check biometric hardware & load saved prefs
    useEffect(() => {
        (async () => {
            const compatible = await LocalAuthentication.hasHardwareAsync();
            const enrolled = await LocalAuthentication.isEnrolledAsync();
            setBiometricAvailable(compatible && enrolled);
        })();

        if (!user) return;
        (async () => {
            const { data } = await supabase
                .from('project_profiles')
                .select('security_prefs')
                .eq('id', user.id)
                .single();
            if (data?.security_prefs) {
                if (data.security_prefs.two_factor !== undefined) setFaEnabled(data.security_prefs.two_factor);
                if (data.security_prefs.biometric !== undefined) setBiometrics(data.security_prefs.biometric);
            }
        })();
    }, [user]);

    const savePrefs = (prefs: { two_factor: boolean; biometric: boolean }) => {
        if (!user) return;
        supabase
            .from('project_profiles')
            .update({ security_prefs: prefs })
            .eq('id', user.id)
            .then();
    };

    const handleToggle2FA = (val: boolean) => {
        setFaEnabled(val);
        savePrefs({ two_factor: val, biometric: biometrics });
    };

    const handleToggleBiometric = async (val: boolean) => {
        if (val && !biometricAvailable) {
            Alert.alert('Not Available', 'Face ID / Touch ID is not configured on this device. Enable it in your device Settings first.');
            return;
        }
        if (val) {
            // Verify identity before enabling
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Authenticate to enable biometric login',
            });
            if (!result.success) return;
        }
        setBiometrics(val);
        savePrefs({ two_factor: faEnabled, biometric: val });
    };

    const sections: SecuritySection[] = [
        {
            title: 'PROTECTION',
            items: [
                { icon: ShieldCheck, label: 'Two-Factor Auth', sub: 'Receive codes via SMS', value: faEnabled, onValueChange: handleToggle2FA },
                { icon: Fingerprint, label: 'Biometric Access', sub: biometricAvailable ? 'Use Face ID / Touch ID to unlock' : 'Not available on this device', value: biometrics, onValueChange: handleToggleBiometric },
            ]
        },
        {
            title: 'DATA RIGHTS (LOI 25)',
            items: [
                { icon: Download, label: 'Export My Data', sub: 'PDF / JSON portability package', action: () => { } },
                { icon: Eye, label: 'Access Log', sub: 'Who viewed my reports?', action: () => { } },
                { icon: Trash2, label: 'Right to Forget', sub: 'Schedule data deletion', action: () => { }, critical: true },
            ]
        }
    ];

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <SafeAreaView edges={['top']}>
                    <View style={styles.headerContent}>
                        <TouchableOpacity onPress={() => navigation.goBack()}>
                            <ChevronLeft color={colors.text} size={24} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>SECURITY HUB</Text>
                        <View style={{ width: 24 }} />
                    </View>
                </SafeAreaView>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.intro}>
                    <Text style={styles.superTitle}>RESIDENT PROTOCOL</Text>
                    <Text style={styles.title}>Your Data,{"\n"}Your Sovereignty.</Text>
                </View>

                {sections.map((section, sidx) => (
                    <View key={sidx} style={styles.section}>
                        <Text style={styles.sectionTitle}>{section.title}</Text>
                        <View style={styles.card}>
                            {section.items.map((item, iidx) => (
                                <View key={iidx} style={[styles.item, iidx === section.items.length - 1 && { borderBottomWidth: 0 }]}>
                                    <View style={styles.iconContainer}>
                                        <item.icon color={item.critical ? colors.error : colors.primary} size={20} />
                                    </View>
                                    <View style={styles.textContainer}>
                                        <Text style={[styles.itemLabel, item.critical && { color: colors.error }]}>{item.label}</Text>
                                        <Text style={styles.itemSub}>{item.sub}</Text>
                                    </View>
                                    {item.onValueChange !== undefined ? (
                                        <Switch
                                            value={item.value}
                                            onValueChange={item.onValueChange}
                                            trackColor={{ false: '#EEE', true: colors.primary }}
                                        />
                                    ) : (
                                        <TouchableOpacity onPress={item.action}>
                                            <Text style={styles.actionLink}>{item.critical ? 'INITIATE' : 'VIEW'}</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ))}
                        </View>
                    </View>
                ))}

                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        Residential Maintenance Group adheres to Quebec Bill 25 and PIPEDA standards for personal information management.
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.m,
    },
    headerTitle: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.textSecondary,
        letterSpacing: 2,
    },
    scrollContent: {
        padding: spacing.l,
        paddingBottom: 40,
    },
    intro: {
        marginBottom: spacing.xxl,
    },
    superTitle: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.primary,
        letterSpacing: 1.5,
        marginBottom: 4,
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
        color: colors.text,
        lineHeight: 38,
    },
    section: {
        marginBottom: spacing.xl,
    },
    sectionTitle: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.textTertiary,
        letterSpacing: 2,
        marginBottom: spacing.m,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.l,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(15, 76, 58, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.m,
    },
    textContainer: {
        flex: 1,
    },
    itemLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.text,
    },
    itemSub: {
        fontSize: 11,
        color: colors.textTertiary,
        marginTop: 2,
    },
    actionLink: {
        fontSize: 10,
        fontWeight: '800',
        color: colors.primary,
        letterSpacing: 1,
    },
    footer: {
        marginTop: spacing.xl,
        paddingHorizontal: spacing.s,
    },
    footerText: {
        fontSize: 9,
        color: colors.textTertiary,
        textAlign: 'center',
        lineHeight: 16,
    }
});
