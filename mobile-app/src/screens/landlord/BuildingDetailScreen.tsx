import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, layout } from '../../theme';
import { GlassCard } from '../../components/GlassCard';
import {
    ChevronLeft,
    Users,
    Building2,
    Calendar,
    ArrowUpRight,
    MapPin,
    AlertTriangle,
    CreditCard,
    MoreVertical,
    UserPlus,
    Copy,
    CheckCircle2
} from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

// Generate a random 6-character invite code
const generateCode = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, O, 0, 1 for clarity
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};

export const BuildingDetailScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { user } = useAuth();
    const { buildingId, buildingName } = route.params || { buildingId: null, buildingName: 'Building' };

    const [units, setUnits] = useState<any[]>([]);
    const [buildingAddress, setBuildingAddress] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [generatingCode, setGeneratingCode] = useState<string | null>(null); // unit ID currently generating for

    // ─── Fetch building details ───
    const fetchBuilding = async () => {
        if (!buildingId) return;
        const { data } = await supabase
            .from('project_buildings')
            .select('address')
            .eq('id', buildingId)
            .single();
        if (data) setBuildingAddress(data.address);
    };

    // ─── Fetch units with tenant info ───
    const fetchUnits = async () => {
        if (!buildingId) return;
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('project_units')
                .select('*, tenant:project_profiles(full_name)')
                .eq('building_id', buildingId)
                .order('unit_number', { ascending: true });

            if (error) throw error;
            setUnits(data || []);
        } catch (err) {
            console.error('Error fetching units:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchBuilding();
        fetchUnits();
    }, []);

    // ─── Generate invite code for a vacant unit ───
    const handleGenerateInvite = async (unitId: string, unitNumber: string) => {
        setGeneratingCode(unitId);
        try {
            const code = generateCode();
            const { error } = await supabase
                .from('project_invite_codes')
                .insert({
                    code,
                    unit_id: unitId,
                    building_id: buildingId,
                    created_by: user?.id,
                });

            if (error) throw error;

            Alert.alert(
                'Invite Code Generated',
                `Code for Unit ${unitNumber}:\n\n${code}\n\nShare this with your tenant. It expires in 7 days.`,
                [
                    {
                        text: 'Copy Code',
                        onPress: () => Share.share({ message: `Your Home OS invite code for Unit ${unitNumber}: ${code}` }),
                    },
                    { text: 'OK' },
                ]
            );
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to generate invite code.');
        } finally {
            setGeneratingCode(null);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'occupied': return colors.success;
            case 'notice': return colors.warning;
            case 'vacant': return colors.textTertiary;
            default: return colors.primary;
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <SafeAreaView edges={['top']}>
                    <View style={styles.navRow}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                            <ChevronLeft color={colors.text} size={24} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.moreBtn}>
                            <MoreVertical color={colors.text} size={20} />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.headerContent}>
                        <Text style={styles.buildingName}>{buildingName}</Text>
                        <View style={styles.addressRow}>
                            <MapPin color={colors.textTertiary} size={12} />
                            <Text style={styles.addressText}>{buildingAddress || 'Loading...'}</Text>
                        </View>
                    </View>
                </SafeAreaView>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Building Telemetry stats */}
                <View style={styles.statsGrid}>
                    <GlassCard style={styles.statItem}>
                        <Text style={styles.statLabel}>UNITS</Text>
                        <Text style={styles.statVal}>{units.length}</Text>
                    </GlassCard>
                    <GlassCard style={styles.statItem}>
                        <Text style={styles.statLabel}>OCCUPANCY</Text>
                        <Text style={styles.statVal}>
                            {units.length > 0
                                ? `${Math.round((units.filter(u => u.status === 'occupied').length / units.length) * 100)}%`
                                : '—'}
                        </Text>
                    </GlassCard>
                </View>

                {/* Unit Roll */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>RESIDENTIAL UNIT ROLL</Text>
                    <TouchableOpacity style={styles.filterBtn}>
                        <Text style={styles.filterText}>ALL UNITS</Text>
                    </TouchableOpacity>
                </View>

                {isLoading ? (
                    <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
                ) : units.length === 0 ? (
                    <GlassCard style={styles.emptyState}>
                        <Building2 color={colors.textTertiary} size={32} />
                        <Text style={styles.emptyTitle}>No Units Yet</Text>
                        <Text style={styles.emptySub}>Units will appear here once added to this building.</Text>
                    </GlassCard>
                ) : (
                    <View style={styles.unitList}>
                        {units.map((unit) => (
                            <TouchableOpacity key={unit.id}>
                                <GlassCard style={styles.unitCard}>
                                    <View style={styles.unitMain}>
                                        <View>
                                            <Text style={styles.unitNumber}>UNIT {unit.unit_number}</Text>
                                            <Text style={styles.tenantName}>
                                                {unit.tenant?.full_name || 'VACANT - LISTING READY'}
                                            </Text>
                                        </View>
                                        <View style={[styles.statusPill, { backgroundColor: `${getStatusColor(unit.status)}15` }]}>
                                            <Text style={[styles.statusText, { color: getStatusColor(unit.status) }]}>
                                                {(unit.status || 'vacant').toUpperCase()}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={styles.unitFooter}>
                                        <View style={styles.footerItem}>
                                            <CreditCard color={colors.textTertiary} size={12} />
                                            <Text style={styles.footerText}>
                                                ${unit.rent_amount ? Number(unit.rent_amount).toFixed(0) : '—'}/mo
                                            </Text>
                                        </View>
                                        {unit.status === 'vacant' || !unit.tenant_id ? (
                                            <TouchableOpacity
                                                style={styles.inviteBtn}
                                                onPress={() => handleGenerateInvite(unit.id, unit.unit_number)}
                                                disabled={generatingCode === unit.id}
                                            >
                                                {generatingCode === unit.id ? (
                                                    <ActivityIndicator color={colors.primary} size="small" />
                                                ) : (
                                                    <>
                                                        <UserPlus color={colors.primary} size={12} />
                                                        <Text style={styles.inviteBtnText}>INVITE TENANT</Text>
                                                    </>
                                                )}
                                            </TouchableOpacity>
                                        ) : (
                                            <ArrowUpRight color={colors.primary} size={14} />
                                        )}
                                    </View>
                                </GlassCard>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                <View style={styles.safePadding} />
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
        paddingBottom: spacing.l,
    },
    navRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.m,
        marginTop: spacing.s,
    },
    backBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    moreBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerContent: {
        paddingHorizontal: spacing.l,
        marginTop: spacing.s,
    },
    buildingName: {
        fontSize: 28,
        fontWeight: '700',
        color: colors.text,
    },
    addressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 4,
    },
    addressText: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    scrollContent: {
        padding: spacing.l,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: spacing.m,
        marginBottom: spacing.xl,
    },
    statItem: {
        flex: 1,
        padding: spacing.l,
        backgroundColor: colors.surface,
    },
    statLabel: {
        fontSize: 9,
        fontWeight: '800',
        color: colors.textTertiary,
        letterSpacing: 1,
    },
    statVal: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.text,
        marginTop: 4,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.m,
    },
    sectionTitle: {
        fontSize: 10,
        fontWeight: '800',
        color: colors.textTertiary,
        letterSpacing: 2,
    },
    filterBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
    },
    filterText: {
        fontSize: 9,
        fontWeight: '800',
        color: colors.primary,
    },
    unitList: {
        gap: spacing.m,
        marginBottom: spacing.xl,
    },
    unitCard: {
        padding: spacing.m,
        backgroundColor: colors.surface,
    },
    unitMain: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    unitNumber: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
    },
    tenantName: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 2,
    },
    statusPill: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusText: {
        fontSize: 8,
        fontWeight: '900',
    },
    unitFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: spacing.m,
        paddingTop: spacing.s,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    footerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    footerText: {
        fontSize: 11,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    inviteBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: 'rgba(15, 76, 58, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(15, 76, 58, 0.1)',
    },
    inviteBtnText: {
        fontSize: 9,
        fontWeight: '800',
        color: colors.primary,
        letterSpacing: 0.5,
    },
    emptyState: {
        alignItems: 'center',
        padding: spacing.xl,
        gap: spacing.m,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
    },
    emptySub: {
        fontSize: 12,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    safePadding: {
        height: 100,
    }
});
