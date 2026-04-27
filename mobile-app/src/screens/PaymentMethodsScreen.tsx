import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, layout } from '../theme';
import { ChevronLeft, Plus, CreditCard, Landmark, CheckCircle2 } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { GlassCard } from '../components/GlassCard';

import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export const PaymentMethodsScreen = () => {
    const { user } = useAuth();
    const navigation = useNavigation<any>();
    const [selected, setSelected] = useState('');
    const [methods, setMethods] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isApplePayConfigured, setIsApplePayConfigured] = useState(false);

    const fetchMethods = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const { data: instruments, error: instError } = await supabase
                .from('project_payment_instruments')
                .select('*')
                .eq('user_id', user.id);

            if (instError) throw instError;
            setMethods(instruments || []);
            if (instruments && instruments.length > 0) setSelected(instruments[0].id);

            const { data: applePay, error: appleError } = await supabase
                .from('project_apple_pay_config')
                .select('is_bonded')
                .eq('user_id', user.id)
                .single();

            if (applePay) setIsApplePayConfigured(applePay.is_bonded);
        } catch (err) {
            console.error('Error fetching treasury:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddInstrument = async () => {
        if (!user) return;
        try {
            // Simulated Stripe SetupIntent flow
            const mockInstrument = {
                user_id: user.id,
                brand: 'Visa',
                last4: Math.floor(1000 + Math.random() * 9000).toString(),
                stripe_payment_method_id: `pm_${Math.random().toString(36).substr(2, 9)}`,
                is_default: methods.length === 0,
                instrument_type: 'card'
            };

            const { error } = await supabase.from('project_payment_instruments').insert(mockInstrument);
            if (error) throw error;

            fetchMethods();
            Alert.alert('Instrument Added', 'Your secure payment method has been registered.');
        } catch (err: any) {
            Alert.alert('Setup Failed', err.message);
        }
    };

    const configureApplePay = async () => {
        if (!user) return;
        try {
            const { error } = await supabase.from('project_apple_pay_config').upsert({
                user_id: user.id,
                is_bonded: true,
                bonded_at: new Date().toISOString()
            });

            if (error) throw error;

            setIsApplePayConfigured(true);
            Alert.alert('Apple Pay Bonded', 'Identity pass linked to your Apple Wallet for residency authentication.');
        } catch (err: any) {
            Alert.alert('Configuration Error', err.message);
        }
    };

    React.useEffect(() => {
        fetchMethods();
    }, [user]);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <SafeAreaView edges={['top']}>
                    <View style={styles.headerContent}>
                        <TouchableOpacity onPress={() => navigation.goBack()}>
                            <ChevronLeft color={colors.text} size={24} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>TREASURY & PAYMENTS</Text>
                        <View style={{ width: 24 }} />
                    </View>
                </SafeAreaView>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.superTitle}>FINANCIAL PROTOCOL</Text>
                <Text style={styles.title}>Manage Flow.</Text>

                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>CONNECTED ACCOUNTS</Text>
                    {methods.length === 0 ? (
                        <GlassCard style={styles.emptyCard}>
                            <Text style={styles.emptyText}>No instruments found in treasury.</Text>
                        </GlassCard>
                    ) : (
                        methods.map((method) => (
                            <TouchableOpacity
                                key={method.id}
                                onPress={() => setSelected(method.id)}
                                style={styles.methodWrapper}
                            >
                                <GlassCard style={[
                                    styles.methodCard,
                                    selected === method.id && { borderColor: colors.primary, borderWidth: 1.5 }
                                ]}>
                                    <View style={styles.methodIcon}>
                                        {method.brand === 'Visa' ? <CreditCard color={colors.primary} size={20} /> : <Landmark color={colors.primary} size={20} />}
                                    </View>
                                    <View style={styles.methodInfo}>
                                        <Text style={styles.methodLabel}>
                                            {method.brand} •••• {method.last4}
                                        </Text>
                                        <Text style={styles.methodSub}>
                                            Securely vaulted via Stripe
                                        </Text>
                                    </View>
                                    {selected === method.id && <CheckCircle2 color={colors.primary} size={20} />}
                                </GlassCard>
                            </TouchableOpacity>
                        ))
                    )}
                </View>

                <TouchableOpacity style={styles.addBtn} onPress={handleAddInstrument}>
                    <View style={styles.addIcon}>
                        <Plus color="white" size={20} />
                    </View>
                    <Text style={styles.addText}>ADD NEW PAYMENT INSTRUMENT</Text>
                </TouchableOpacity>

                <View style={styles.applePayBox}>
                    <Text style={styles.applePayTitle}>Apple Pay Setup</Text>
                    <Text style={styles.applePayDesc}>
                        Link your Resident Identity to Apple Pay for one-tap lobby purchases and rent settlement.
                    </Text>
                    <TouchableOpacity
                        style={[styles.appleBtn, isApplePayConfigured && { backgroundColor: '#34C759' }]}
                        onPress={configureApplePay}
                    >
                        <Text style={[styles.appleText, isApplePayConfigured && { color: 'white' }]}>
                            {isApplePayConfigured ? 'Apple Pay Bonded' : 'Configure Apple Pay'}
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.securityBox}>
                    <Text style={styles.securityText}>
                        AES-256 Encrypted. Payments processed by Stripe & Plaid.
                        We never store your full card numbers.
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
    methodWrapper: {
        marginBottom: spacing.m,
    },
    methodCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.m,
    },
    methodIcon: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: 'rgba(15, 76, 58, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.m,
    },
    methodInfo: {
        flex: 1,
    },
    methodLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.text,
    },
    methodSub: {
        fontSize: 11,
        color: colors.textTertiary,
        marginTop: 2,
    },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        paddingVertical: spacing.l,
        borderWidth: 1.5,
        borderColor: colors.border,
        borderStyle: 'dashed',
        borderRadius: 12,
    },
    addIcon: {
        backgroundColor: colors.primary,
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addText: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.5,
        color: colors.text,
    },
    applePayBox: {
        marginTop: spacing.xxl,
        padding: spacing.xl,
        backgroundColor: '#000',
        borderRadius: 16,
    },
    applePayTitle: {
        color: 'white',
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 8,
    },
    applePayDesc: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 11,
        lineHeight: 18,
        marginBottom: spacing.l,
    },
    appleBtn: {
        backgroundColor: 'white',
        height: 44,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    appleText: {
        fontWeight: '700',
        fontSize: 12,
    },
    securityBox: {
        marginTop: spacing.xxl,
        alignItems: 'center',
    },
    securityText: {
        fontSize: 9,
        color: colors.textTertiary,
        textAlign: 'center',
        lineHeight: 16,
    },
    emptyCard: {
        padding: spacing.xl,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 11,
        color: colors.textTertiary,
    }
});
