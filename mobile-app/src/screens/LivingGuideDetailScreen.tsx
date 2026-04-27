import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';
import { GlassCard } from '../components/GlassCard';
import {
    ChevronLeft, Wifi, Trash2, Zap, Droplet, Copy, Eye, EyeOff
} from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import * as Clipboard from 'expo-clipboard';

export const LivingGuideDetailScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { user } = useAuth();

    const category = route.params?.category || 'wifi';

    const [serviceData, setServiceData] = useState<any>(null);
    const [utilityData, setUtilityData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showPassword, setShowPassword] = useState(false);

    const categoryConfig: Record<string, { title: string; icon: any; color: string }> = {
        wifi: { title: 'WiFi & Connectivity', icon: Wifi, color: colors.primary },
        energy: { title: 'Energy & Power', icon: Zap, color: colors.accent },
        water: { title: 'Water Supply', icon: Droplet, color: '#4A90E2' },
        waste: { title: 'Waste Management', icon: Trash2, color: colors.warning },
    };

    const config = categoryConfig[category] || categoryConfig.wifi;
    const IconComponent = config.icon;

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        if (!user) return;
        try {
            // Get the tenant's unit and building
            const { data: unit } = await supabase
                .from('project_units')
                .select('id, building_id')
                .eq('tenant_id', user.id)
                .limit(1)
                .single();

            if (!unit) {
                setIsLoading(false);
                return;
            }

            // Get building service for this category
            const { data: service } = await supabase
                .from('project_building_services')
                .select('*')
                .eq('building_id', unit.building_id)
                .eq('service_type', category)
                .limit(1)
                .single();

            if (service) {
                setServiceData(service.config);
            }

            // For energy/water, also get utility usage data
            if (category === 'energy' || category === 'water') {
                const utilityType = category === 'energy' ? 'electricity' : 'water';
                const { data: usage } = await supabase
                    .from('project_utility_usage')
                    .select('*')
                    .eq('unit_id', unit.id)
                    .eq('utility_type', utilityType)
                    .order('reading_date', { ascending: false })
                    .limit(6);

                setUtilityData(usage || []);

                // Also get billing data from ledger
                if (!service) {
                    const { data: billing } = await supabase
                        .from('project_utility_ledger')
                        .select('*')
                        .eq('user_id', user.id)
                        .eq('utility_type', utilityType)
                        .order('created_at', { ascending: false })
                        .limit(3);

                    if (billing && billing.length > 0) {
                        setServiceData({
                            latest_bill: billing[0].amount_due,
                            billing_period: billing[0].billing_period,
                            status: billing[0].status,
                            history: billing,
                        });
                    }
                }
            }
        } catch (err) {
            console.error('LivingGuideDetail fetch error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const copyToClipboard = async (text: string, label: string) => {
        await Clipboard.setStringAsync(text);
        Alert.alert('Copied!', `${label} copied to clipboard.`);
    };

    const renderWifiContent = () => {
        if (!serviceData) {
            return (
                <GlassCard style={styles.noDataCard}>
                    <Text style={styles.noDataText}>No WiFi information configured for this building.</Text>
                    <Text style={styles.noDataSub}>Contact your building manager for WiFi details.</Text>
                </GlassCard>
            );
        }

        return (
            <>
                <GlassCard style={styles.credentialCard}>
                    <Text style={styles.credentialLabel}>NETWORK NAME (SSID)</Text>
                    <View style={styles.credentialRow}>
                        <Text style={styles.credentialValue}>{serviceData.ssid || '—'}</Text>
                        <TouchableOpacity
                            onPress={() => copyToClipboard(serviceData.ssid, 'Network name')}
                            style={styles.copyBtn}
                        >
                            <Copy color={colors.primary} size={16} />
                        </TouchableOpacity>
                    </View>
                </GlassCard>

                <GlassCard style={styles.credentialCard}>
                    <Text style={styles.credentialLabel}>PASSWORD</Text>
                    <View style={styles.credentialRow}>
                        <Text style={styles.credentialValue}>
                            {showPassword ? (serviceData.password || '—') : '••••••••••'}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TouchableOpacity
                                onPress={() => setShowPassword(!showPassword)}
                                style={styles.copyBtn}
                            >
                                {showPassword ? (
                                    <EyeOff color={colors.textTertiary} size={16} />
                                ) : (
                                    <Eye color={colors.textTertiary} size={16} />
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => copyToClipboard(serviceData.password, 'Password')}
                                style={styles.copyBtn}
                            >
                                <Copy color={colors.primary} size={16} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </GlassCard>

                {serviceData.speed_mbps && (
                    <GlassCard style={styles.infoCard}>
                        <Text style={styles.infoLabel}>CONNECTION SPEED</Text>
                        <Text style={styles.infoValue}>{serviceData.speed_mbps} Mbps</Text>
                    </GlassCard>
                )}

                {serviceData.notes && (
                    <GlassCard style={styles.infoCard}>
                        <Text style={styles.infoLabel}>NOTES</Text>
                        <Text style={styles.infoText}>{serviceData.notes}</Text>
                    </GlassCard>
                )}
            </>
        );
    };

    const renderEnergyWaterContent = () => {
        const typeLabel = category === 'energy' ? 'Energy' : 'Water';

        if (!serviceData && utilityData.length === 0) {
            return (
                <GlassCard style={styles.noDataCard}>
                    <Text style={styles.noDataText}>No {typeLabel.toLowerCase()} data available yet.</Text>
                    <Text style={styles.noDataSub}>Usage data will appear once meter readings are recorded.</Text>
                </GlassCard>
            );
        }

        return (
            <>
                {serviceData?.latest_bill && (
                    <GlassCard style={styles.billCard}>
                        <Text style={styles.billLabel}>LATEST BILL</Text>
                        <Text style={styles.billAmount}>
                            ${Number(serviceData.latest_bill).toFixed(2)}
                        </Text>
                        {serviceData.billing_period && (
                            <Text style={styles.billPeriod}>Period: {serviceData.billing_period}</Text>
                        )}
                        {serviceData.status && (
                            <View style={[styles.statusPill, {
                                backgroundColor: serviceData.status === 'settled' ? 'rgba(74, 187, 101, 0.1)' : 'rgba(255, 165, 0, 0.1)'
                            }]}>
                                <Text style={[styles.statusText, {
                                    color: serviceData.status === 'settled' ? colors.success : colors.warning
                                }]}>
                                    {serviceData.status.toUpperCase()}
                                </Text>
                            </View>
                        )}
                    </GlassCard>
                )}

                {serviceData?.history && serviceData.history.length > 1 && (
                    <>
                        <Text style={styles.subSection}>BILLING HISTORY</Text>
                        {serviceData.history.map((bill: any, idx: number) => (
                            <GlassCard key={bill.id || idx} style={styles.historyItem}>
                                <View style={styles.historyRow}>
                                    <Text style={styles.historyPeriod}>{bill.billing_period || '—'}</Text>
                                    <Text style={styles.historyAmount}>${Number(bill.amount_due).toFixed(2)}</Text>
                                </View>
                            </GlassCard>
                        ))}
                    </>
                )}

                {utilityData.length > 0 && (
                    <>
                        <Text style={styles.subSection}>METER READINGS</Text>
                        {utilityData.map((reading, idx) => (
                            <GlassCard key={reading.id || idx} style={styles.historyItem}>
                                <View style={styles.historyRow}>
                                    <Text style={styles.historyPeriod}>{reading.reading_date}</Text>
                                    <Text style={styles.historyAmount}>
                                        {Number(reading.reading_value).toFixed(1)} {category === 'energy' ? 'kWh' : 'L'}
                                    </Text>
                                </View>
                            </GlassCard>
                        ))}
                    </>
                )}
            </>
        );
    };

    const renderWasteContent = () => {
        if (!serviceData) {
            return (
                <GlassCard style={styles.noDataCard}>
                    <Text style={styles.noDataText}>No waste schedule configured for this building.</Text>
                    <Text style={styles.noDataSub}>Contact your building manager for collection details.</Text>
                </GlassCard>
            );
        }

        return (
            <>
                {serviceData.pickup_days && (
                    <GlassCard style={styles.infoCard}>
                        <Text style={styles.infoLabel}>COLLECTION DAYS</Text>
                        <Text style={styles.infoValue}>
                            {Array.isArray(serviceData.pickup_days)
                                ? serviceData.pickup_days.join(', ')
                                : serviceData.pickup_days}
                        </Text>
                    </GlassCard>
                )}

                {serviceData.recycling !== undefined && (
                    <GlassCard style={styles.infoCard}>
                        <Text style={styles.infoLabel}>RECYCLING</Text>
                        <Text style={styles.infoValue}>
                            {serviceData.recycling ? 'Available ♻️' : 'Not available'}
                        </Text>
                    </GlassCard>
                )}

                {serviceData.recycling_days && (
                    <GlassCard style={styles.infoCard}>
                        <Text style={styles.infoLabel}>RECYCLING DAYS</Text>
                        <Text style={styles.infoValue}>
                            {Array.isArray(serviceData.recycling_days)
                                ? serviceData.recycling_days.join(', ')
                                : serviceData.recycling_days}
                        </Text>
                    </GlassCard>
                )}

                {serviceData.notes && (
                    <GlassCard style={styles.infoCard}>
                        <Text style={styles.infoLabel}>INSTRUCTIONS</Text>
                        <Text style={styles.infoText}>{serviceData.notes}</Text>
                    </GlassCard>
                )}
            </>
        );
    };

    const renderContent = () => {
        switch (category) {
            case 'wifi': return renderWifiContent();
            case 'energy':
            case 'water': return renderEnergyWaterContent();
            case 'waste': return renderWasteContent();
            default: return renderWifiContent();
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <SafeAreaView edges={['top']}>
                    <View style={styles.headerContent}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                            <ChevronLeft color={colors.text} size={24} />
                        </TouchableOpacity>
                        <View>
                            <Text style={styles.brand}>LIVING GUIDE</Text>
                            <Text style={styles.headerTitle}>{config.title}</Text>
                        </View>
                    </View>
                </SafeAreaView>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Hero Card */}
                <GlassCard style={[styles.heroCard, { borderLeftColor: config.color }]}>
                    <IconComponent color={config.color} size={32} />
                    <Text style={[styles.heroTitle, { color: config.color }]}>{config.title}</Text>
                </GlassCard>

                {isLoading ? (
                    <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
                ) : (
                    renderContent()
                )}

                <View style={{ height: 80 }} />
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
        paddingBottom: spacing.m,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.l,
        gap: 12,
        marginTop: spacing.s,
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    brand: {
        fontSize: 10,
        fontWeight: '800',
        color: colors.primary,
        letterSpacing: 2.5,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.text,
        marginTop: 2,
    },
    scrollContent: {
        padding: spacing.l,
    },
    heroCard: {
        padding: spacing.xl,
        alignItems: 'center',
        gap: spacing.m,
        borderLeftWidth: 3,
        marginBottom: spacing.l,
    },
    heroTitle: {
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 1,
    },
    // Credential cards (WiFi)
    credentialCard: {
        padding: spacing.l,
        marginBottom: spacing.m,
    },
    credentialLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.textTertiary,
        letterSpacing: 1.5,
        marginBottom: spacing.s,
    },
    credentialRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    credentialValue: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
        fontFamily: 'monospace',
    },
    copyBtn: {
        padding: 8,
    },
    // Info cards
    infoCard: {
        padding: spacing.l,
        marginBottom: spacing.m,
    },
    infoLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.textTertiary,
        letterSpacing: 1.5,
        marginBottom: spacing.s,
    },
    infoValue: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
    },
    infoText: {
        fontSize: 14,
        color: colors.textSecondary,
        lineHeight: 20,
    },
    // Bill card
    billCard: {
        padding: spacing.xl,
        alignItems: 'center',
        marginBottom: spacing.m,
    },
    billLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.textTertiary,
        letterSpacing: 2,
    },
    billAmount: {
        fontSize: 36,
        fontWeight: '800',
        color: colors.text,
        marginTop: spacing.s,
    },
    billPeriod: {
        fontSize: 12,
        color: colors.textTertiary,
        marginTop: spacing.s,
    },
    statusPill: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        marginTop: spacing.m,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    subSection: {
        fontSize: 10,
        fontWeight: '800',
        color: colors.textTertiary,
        letterSpacing: 2,
        marginTop: spacing.l,
        marginBottom: spacing.m,
    },
    historyItem: {
        padding: spacing.m,
        marginBottom: spacing.s,
    },
    historyRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    historyPeriod: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.text,
    },
    historyAmount: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.text,
    },
    // No data
    noDataCard: {
        padding: spacing.xl,
        alignItems: 'center',
    },
    noDataText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textSecondary,
        textAlign: 'center',
    },
    noDataSub: {
        fontSize: 12,
        color: colors.textTertiary,
        textAlign: 'center',
        marginTop: 8,
    },
});
