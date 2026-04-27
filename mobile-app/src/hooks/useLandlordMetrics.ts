import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface LandlordMetrics {
    totalUnits: number;
    occupiedUnits: number;
    occupancyRate: number;
    pendingRequests: number;
    activeWorkOrders: number;
    monthlyRevenue: number;
    monthlyExpenses: number;
    portfolioScore: number;
    leasesExpiringSoon: number;
    isLoading: boolean;
    refresh: () => void;
}

export const useLandlordMetrics = (): LandlordMetrics => {
    const { user } = useAuth();
    const [metrics, setMetrics] = useState<Omit<LandlordMetrics, 'isLoading' | 'refresh'>>({
        totalUnits: 0,
        occupiedUnits: 0,
        occupancyRate: 0,
        pendingRequests: 0,
        activeWorkOrders: 0,
        monthlyRevenue: 0,
        monthlyExpenses: 0,
        portfolioScore: 0,
        leasesExpiringSoon: 0,
    });
    const [isLoading, setIsLoading] = useState(true);

    const fetchMetrics = async () => {
        if (!user) return;
        setIsLoading(true);

        try {
            // 1. Get all buildings owned by this landlord
            const { data: buildings } = await supabase
                .from('project_buildings')
                .select('id')
                .eq('owner_id', user.id);

            const buildingIds = (buildings || []).map(b => b.id);

            if (buildingIds.length === 0) {
                setIsLoading(false);
                return;
            }

            // 2. Get all units across those buildings
            const { data: units } = await supabase
                .from('project_units')
                .select('id, tenant_id, lease_end')
                .in('building_id', buildingIds);

            const totalUnits = (units || []).length;
            const occupiedUnits = (units || []).filter(u => u.tenant_id).length;
            const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

            // Leases expiring within 30 days
            const now = new Date();
            const next30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
            const leasesExpiringSoon = (units || []).filter(u => {
                if (!u.lease_end) return false;
                const leaseEnd = new Date(u.lease_end);
                return leaseEnd >= now && leaseEnd <= next30;
            }).length;

            // 3. Get pending requests
            const tenantIds = (units || []).filter(u => u.tenant_id).map(u => u.tenant_id);
            let pendingRequests = 0;
            if (tenantIds.length > 0) {
                const { count } = await supabase
                    .from('project_requests')
                    .select('id', { count: 'exact', head: true })
                    .in('tenant_id', tenantIds)
                    .eq('status', 'pending');
                pendingRequests = count || 0;
            }

            // 4. Get active work orders
            const { count: woCount } = await supabase
                .from('project_work_orders')
                .select('id', { count: 'exact', head: true })
                .eq('landlord_id', user.id)
                .in('status', ['dispatched', 'arrived', 'in_progress']);
            const activeWorkOrders = woCount || 0;

            // 5. Get monthly revenue/expenses from ledger
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

            let monthlyRevenue = 0;
            let monthlyExpenses = 0;

            if (tenantIds.length > 0) {
                const { data: ledgerData } = await supabase
                    .from('project_utility_ledger')
                    .select('amount_due, status, utility_type')
                    .in('user_id', tenantIds)
                    .gte('created_at', startOfMonth)
                    .lte('created_at', endOfMonth);

                (ledgerData || []).forEach(entry => {
                    if (entry.utility_type === 'rent' && entry.status === 'settled') {
                        monthlyRevenue += Number(entry.amount_due || 0);
                    } else if (entry.utility_type !== 'rent') {
                        monthlyExpenses += Number(entry.amount_due || 0);
                    }
                });
            }

            // 6. Calculate portfolio score (0-100)
            // Weighted: occupancy 40%, no pending issues 30%, revenue trend 30%
            const occScore = occupancyRate;
            const issueScore = pendingRequests === 0 ? 100 : Math.max(0, 100 - pendingRequests * 15);
            const revenueScore = monthlyRevenue > 0 ? 80 : 40;
            const portfolioScore = Math.round(occScore * 0.4 + issueScore * 0.3 + revenueScore * 0.3);

            setMetrics({
                totalUnits,
                occupiedUnits,
                occupancyRate,
                pendingRequests,
                activeWorkOrders,
                monthlyRevenue,
                monthlyExpenses,
                portfolioScore: Math.min(100, portfolioScore),
                leasesExpiringSoon,
            });
        } catch (err) {
            console.error('useLandlordMetrics error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchMetrics();
    }, [user]);

    return {
        ...metrics,
        isLoading,
        refresh: fetchMetrics,
    };
};
