import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export interface LedgerEntry {
    id: string;
    utility_type: string;
    amount_due: number;
    status: string;
    billing_period: string;
    created_at: string;
    user_id: string;
    tenant_name?: string;
}

export type LedgerFilter = 'all' | 'settled' | 'pending' | 'unpaid';

interface TreasuryData {
    netLiquidity: number;
    monthlyIncome: number;
    monthlyExpenses: number;
    trendPercent: number;
    pendingTotal: number;
    overdueTotal: number;
    entries: LedgerEntry[];
    isLoading: boolean;
    filter: LedgerFilter;
    setFilter: (f: LedgerFilter) => void;
    refresh: () => void;
    exportCSV: () => string;
}

export const useTreasuryData = (): TreasuryData => {
    const { user } = useAuth();
    const [entries, setEntries] = useState<LedgerEntry[]>([]);
    const [allEntries, setAllEntries] = useState<LedgerEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<LedgerFilter>('all');
    const [stats, setStats] = useState({
        netLiquidity: 0,
        monthlyIncome: 0,
        monthlyExpenses: 0,
        trendPercent: 0,
        pendingTotal: 0,
        overdueTotal: 0,
    });

    const fetchData = async () => {
        if (!user) return;
        setIsLoading(true);

        try {
            // Get tenant IDs for this landlord's buildings
            const { data: buildings } = await supabase
                .from('project_buildings')
                .select('id')
                .eq('owner_id', user.id);

            const buildingIds = (buildings || []).map(b => b.id);
            if (buildingIds.length === 0) {
                setIsLoading(false);
                return;
            }

            const { data: units } = await supabase
                .from('project_units')
                .select('id, tenant_id')
                .in('building_id', buildingIds)
                .not('tenant_id', 'is', null);

            const tenantIds = (units || []).map(u => u.tenant_id).filter(Boolean);
            if (tenantIds.length === 0) {
                setIsLoading(false);
                return;
            }

            // Fetch all ledger entries
            const { data: ledger } = await supabase
                .from('project_utility_ledger')
                .select('*')
                .in('user_id', tenantIds)
                .order('created_at', { ascending: false });

            const allData = (ledger || []) as LedgerEntry[];
            setAllEntries(allData);

            // Calculate stats
            const now = new Date();
            const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            const lastMonth = now.getMonth() === 0
                ? `${now.getFullYear() - 1}-12`
                : `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`;

            let totalIncome = 0;
            let totalExpenses = 0;
            let lastMonthIncome = 0;
            let pendingTotal = 0;
            let overdueTotal = 0;

            allData.forEach(entry => {
                const amt = Number(entry.amount_due || 0);
                const entryMonth = entry.billing_period || entry.created_at?.slice(0, 7);

                if (entry.status === 'settled') {
                    if (entryMonth === thisMonth) totalIncome += amt;
                    if (entryMonth === lastMonth) lastMonthIncome += amt;
                } else if (entry.status === 'pending') {
                    pendingTotal += amt;
                } else if (entry.status === 'unpaid' || entry.status === 'overdue') {
                    overdueTotal += amt;
                }

                if (entry.utility_type !== 'rent' && entryMonth === thisMonth) {
                    totalExpenses += amt;
                }
            });

            const netLiquidity = totalIncome - totalExpenses;
            const trendPercent = lastMonthIncome > 0
                ? Math.round(((totalIncome - lastMonthIncome) / lastMonthIncome) * 100 * 10) / 10
                : 0;

            setStats({
                netLiquidity,
                monthlyIncome: totalIncome,
                monthlyExpenses: totalExpenses,
                trendPercent,
                pendingTotal,
                overdueTotal,
            });
        } catch (err) {
            console.error('useTreasuryData error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // Apply filter
    useEffect(() => {
        if (filter === 'all') {
            setEntries(allEntries);
        } else {
            setEntries(allEntries.filter(e => e.status === filter));
        }
    }, [filter, allEntries]);

    useEffect(() => {
        fetchData();
    }, [user]);

    const exportCSV = (): string => {
        const header = 'Date,Type,Amount,Status,Period\n';
        const rows = entries.map(e =>
            `${e.created_at},${e.utility_type},${e.amount_due},${e.status},${e.billing_period || ''}`
        ).join('\n');
        return header + rows;
    };

    return {
        ...stats,
        entries,
        isLoading,
        filter,
        setFilter,
        refresh: fetchData,
        exportCSV,
    };
};
