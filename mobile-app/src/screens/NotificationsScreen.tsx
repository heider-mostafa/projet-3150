import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, layout } from '../theme';
import { ChevronLeft, Bell, MessageCircle, AlertTriangle, Calendar, Moon } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface NotifSettings {
    maintenance: boolean;
    chat: boolean;
    billing: boolean;
    dnd: boolean;
}

export const NotificationsScreen = () => {
    const navigation = useNavigation();
    const { user } = useAuth();
    const [settings, setSettings] = useState<NotifSettings>({
        maintenance: true,
        chat: true,
        billing: false,
        dnd: false,
    });

    // Load saved preferences
    useEffect(() => {
        if (!user) return;
        (async () => {
            const { data } = await supabase
                .from('project_profiles')
                .select('notification_prefs')
                .eq('id', user.id)
                .single();
            if (data?.notification_prefs) {
                setSettings(prev => ({ ...prev, ...data.notification_prefs }));
            }
        })();
    }, [user]);

    const toggle = (key: keyof NotifSettings) => {
        setSettings(prev => {
            const updated = { ...prev, [key]: !prev[key] };
            // Save to DB
            if (user) {
                supabase
                    .from('project_profiles')
                    .update({ notification_prefs: updated })
                    .eq('id', user.id)
                    .then();
            }
            return updated;
        });
    };

    const categories = [
        { key: 'maintenance', icon: AlertTriangle, label: 'Critical Repairs', sub: 'Urgent leaks, power outages' },
        { key: 'chat', icon: MessageCircle, label: 'Resident Support', sub: 'Direct messages from management' },
        { key: 'billing', icon: Calendar, label: 'Treasury Alerts', sub: 'Rent due dates & processing' },
    ];

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <SafeAreaView edges={['top']}>
                    <View style={styles.headerContent}>
                        <TouchableOpacity onPress={() => navigation.goBack()}>
                            <ChevronLeft color={colors.text} size={24} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>ALERT ORCHESTRATION</Text>
                        <View style={{ width: 24 }} />
                    </View>
                </SafeAreaView>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.superTitle}>COMMUNICATION HUB</Text>
                <Text style={styles.title}>Stay Synced.</Text>

                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>PUSH NOTIFICATIONS</Text>
                    <View style={styles.card}>
                        {categories.map((cat, idx) => (
                            <View key={cat.key} style={[styles.item, idx === categories.length - 1 && { borderBottomWidth: 0 }]}>
                                <View style={styles.iconBox}>
                                    <cat.icon color={colors.primary} size={20} />
                                </View>
                                <View style={styles.info}>
                                    <Text style={styles.label}>{cat.label}</Text>
                                    <Text style={styles.subText}>{cat.sub}</Text>
                                </View>
                                <Switch
                                    value={settings[cat.key as keyof typeof settings]}
                                    onValueChange={() => toggle(cat.key as keyof typeof settings)}
                                    trackColor={{ false: '#EEE', true: colors.primary }}
                                />
                            </View>
                        ))}
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>SILENCE PROTOCOL</Text>
                    <View style={styles.card}>
                        <View style={[styles.item, { borderBottomWidth: 0 }]}>
                            <View style={styles.iconBox}>
                                <Moon color={colors.accent} size={20} />
                            </View>
                            <View style={styles.info}>
                                <Text style={styles.label}>Do Not Disturb</Text>
                                <Text style={styles.subText}>Silence all between 10PM - 8AM</Text>
                            </View>
                            <Switch
                                value={settings.dnd}
                                onValueChange={() => toggle('dnd')}
                                trackColor={{ false: '#EEE', true: colors.accent }}
                            />
                        </View>
                    </View>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        You can update your alert preferences at any time.
                        Emergency life-safety alerts (fire, flood evac) cannot be disabled.
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
        marginBottom: spacing.xl,
    },
    section: {
        marginBottom: spacing.xl,
    },
    sectionHeader: {
        fontSize: 9,
        fontWeight: '800',
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
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(15, 76, 58, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.m,
    },
    info: {
        flex: 1,
    },
    label: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.text,
    },
    subText: {
        fontSize: 11,
        color: colors.textTertiary,
        marginTop: 2,
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
