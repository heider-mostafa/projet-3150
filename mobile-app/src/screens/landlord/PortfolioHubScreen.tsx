import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, layout } from '../../theme';
import { GlassCard } from '../../components/GlassCard';
import {
    Building2,
    Search,
    Filter,
    Plus,
    ChevronRight,
    MapPin,
    Users,
    Zap
} from 'lucide-react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

export const PortfolioHubScreen = () => {
    const navigation = useNavigation<any>();
    const { user } = useAuth();
    const { t } = useLanguage();
    const [assets, setAssets] = useState<any[]>([]);
    const [searchText, setSearchText] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const fetchBuildings = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('project_buildings')
                .select('*, units:project_units(id, status, tenant_id)')
                .eq('owner_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            const mapped = (data || []).map(b => {
                const unitCount = b.units?.length || 0;
                const occupiedCount = b.units?.filter((u: any) => u.tenant_id).length || 0;
                const occupancy = unitCount > 0 ? Math.round((occupiedCount / unitCount) * 100) : 0;
                return {
                    id: b.id,
                    name: b.name,
                    address: b.address,
                    units: unitCount,
                    occupancy: `${occupancy}%`,
                    health: occupancy === 100 ? t('portfolio.optimal') : occupancy >= 80 ? t('portfolio.stable') : t('portfolio.actionRequired'),
                };
            });
            setAssets(mapped);
        } catch (err) {
            console.error('Error fetching buildings:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useFocusEffect(useCallback(() => { fetchBuildings(); }, [user]));

    const filteredAssets = assets.filter(a => {
        if (!searchText.trim()) return true;
        const q = searchText.toLowerCase();
        return a.name.toLowerCase().includes(q) || (a.address || '').toLowerCase().includes(q);
    });

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <SafeAreaView edges={['top']}>
                    <View style={styles.headerContent}>
                        <Text style={styles.brand}>{t('portfolio.brand')}</Text>
                        <Text style={styles.title}>{t('portfolio.title')}</Text>
                    </View>
                    <View style={styles.searchBar}>
                        <Search color={colors.textTertiary} size={16} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder={t('portfolio.searchPlaceholder')}
                            placeholderTextColor={colors.textTertiary}
                            value={searchText}
                            onChangeText={setSearchText}
                        />
                    </View>
                </SafeAreaView>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Summary Grid */}
                <View style={styles.summaryGrid}>
                    <GlassCard style={styles.summaryItem}>
                        <Building2 color={colors.primary} size={20} />
                        <Text style={styles.summaryVal}>{String(assets.length).padStart(2, '0')}</Text>
                        <Text style={styles.summaryLabel}>{t('portfolio.totalBuildings')}</Text>
                    </GlassCard>
                    <GlassCard style={styles.summaryItem}>
                        <Users color={colors.primary} size={20} />
                        <Text style={styles.summaryVal}>{assets.reduce((sum, a) => sum + a.units, 0)}</Text>
                        <Text style={styles.summaryLabel}>{t('portfolio.totalUnits')}</Text>
                    </GlassCard>
                </View>

                {/* Building List */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>{t('portfolio.managedBuildings')}</Text>
                    <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AddBuilding')}>
                        <Plus color={colors.primary} size={16} />
                    </TouchableOpacity>
                </View>

                {isLoading ? (
                    <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
                ) : filteredAssets.length === 0 && assets.length === 0 ? (
                    <GlassCard style={{ alignItems: 'center', padding: spacing.xl, gap: spacing.m }}>
                        <Building2 color={colors.textTertiary} size={32} />
                        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{t('portfolio.noBuildingsTitle')}</Text>
                        <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: 'center' }}>{t('portfolio.noBuildingsSub')}</Text>
                    </GlassCard>
                ) : filteredAssets.length === 0 ? (
                    <GlassCard style={{ alignItems: 'center', padding: spacing.xl }}>
                        <Text style={{ fontSize: 13, color: colors.textTertiary }}>No buildings match "{searchText}"</Text>
                    </GlassCard>
                ) : null}
                <View style={styles.assetList}>
                    {filteredAssets.map((asset) => (
                        <TouchableOpacity
                            key={asset.id}
                            onPress={() => navigation.navigate('BuildingDetail', { buildingId: asset.id, buildingName: asset.name })}
                        >
                            <GlassCard style={styles.assetCard}>
                                <View style={styles.assetTop}>
                                    <View style={styles.assetInfo}>
                                        <Text style={styles.assetName}>{asset.name}</Text>
                                        <View style={styles.addressRow}>
                                            <MapPin color={colors.textTertiary} size={10} />
                                            <Text style={styles.assetAddress}>{asset.address}</Text>
                                        </View>
                                    </View>
                                    <View style={[styles.healthPill, { backgroundColor: asset.health === 'Optimal' ? 'rgba(74, 187, 101, 0.1)' : 'rgba(255, 165, 0, 0.1)' }]}>
                                        <Text style={[styles.healthText, { color: asset.health === 'Optimal' ? colors.success : colors.warning }]}>
                                            {asset.health.toUpperCase()}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.assetStats}>
                                    <View style={styles.statBox}>
                                        <Text style={styles.statVal}>{asset.units}</Text>
                                        <Text style={styles.statLabel}>{t('portfolio.units')}</Text>
                                    </View>
                                    <View style={styles.statDivider} />
                                    <View style={styles.statBox}>
                                        <Text style={styles.statVal}>{asset.occupancy}</Text>
                                        <Text style={styles.statLabel}>{t('portfolio.occupancy')}</Text>
                                    </View>
                                    <TouchableOpacity style={styles.actionBtn}>
                                        <Text style={styles.actionText}>{t('portfolio.manage')}</Text>
                                        <ChevronRight color={colors.primary} size={14} />
                                    </TouchableOpacity>
                                </View>
                            </GlassCard>
                        </TouchableOpacity>
                    ))}
                </View>

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
    headerContent: {
        paddingHorizontal: spacing.l,
        marginTop: spacing.s,
    },
    brand: {
        fontSize: 10,
        fontWeight: '800',
        color: colors.primary,
        letterSpacing: 2.5,
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
        color: colors.text,
        marginTop: 4,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background,
        marginHorizontal: spacing.l,
        marginTop: spacing.l,
        paddingHorizontal: spacing.m,
        paddingVertical: 10,
        borderRadius: 12,
        gap: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: colors.text,
    },
    scrollContent: {
        padding: spacing.l,
    },
    summaryGrid: {
        flexDirection: 'row',
        gap: spacing.m,
        marginBottom: spacing.xl,
    },
    summaryItem: {
        flex: 1,
        alignItems: 'center',
        padding: spacing.l,
        backgroundColor: colors.surface,
    },
    summaryVal: {
        fontSize: 24,
        fontWeight: '800',
        color: colors.text,
        marginTop: 12,
    },
    summaryLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.textTertiary,
        letterSpacing: 1,
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
    addBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    assetList: {
        gap: spacing.m,
    },
    assetCard: {
        padding: spacing.m,
        backgroundColor: colors.surface,
    },
    assetTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    assetInfo: {
        flex: 1,
    },
    assetName: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
    },
    addressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 4,
    },
    assetAddress: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    healthPill: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    healthText: {
        fontSize: 8,
        fontWeight: '800',
    },
    assetStats: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.l,
        paddingTop: spacing.m,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    statBox: {
        flex: 1,
    },
    statVal: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
    },
    statLabel: {
        fontSize: 8,
        fontWeight: '800',
        color: colors.textTertiary,
        letterSpacing: 0.5,
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        height: 20,
        backgroundColor: colors.border,
        marginHorizontal: spacing.m,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
    },
    actionText: {
        fontSize: 10,
        fontWeight: '800',
        color: colors.primary,
    },
    safePadding: {
        height: 100,
    }
});
