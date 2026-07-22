import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { X, Activity, Database, Cpu, Users, FileText, Clock } from 'lucide-react';

const ServerMetricsModal = ({ isOpen, onClose }) => {
    const { data: metrics, isLoading, isError } = useQuery({
        queryKey: ['server-metrics'],
        queryFn: async () => {
            const { data } = await api.get('/health/metrics');
            return data;
        },
        enabled: isOpen,
        refetchInterval: 5000 // Poll every 5s while open
    });

    if (!isOpen) return null;

    const formatUptime = (seconds) => {
        if (!seconds) return '0s';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        return `${h}h ${m}m ${s}s`;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div className="flex items-center gap-2">
                        <Activity className="text-primary-600" size={20} />
                        <h2 className="text-lg font-bold text-gray-800">Server Metrics</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-10 space-y-4">
                            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-gray-500 font-medium">Gathering metrics...</p>
                        </div>
                    ) : isError ? (
                        <div className="text-center py-10">
                            <div className="text-red-500 mb-2">⚠️</div>
                            <h3 className="text-gray-800 font-bold">Failed to load metrics</h3>
                            <p className="text-gray-500 text-sm">The server might be offline or unreachable.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Status Banner */}
                            <div className={`p-4 rounded-xl flex items-center gap-3 ${metrics.status === 'healthy' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                                <div className={`w-3 h-3 rounded-full ${metrics.status === 'healthy' ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`}></div>
                                <span className="font-semibold capitalize">System is {metrics.status}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Database */}
                                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 flex flex-col gap-2">
                                    <div className="flex items-center gap-2 text-gray-500 text-sm font-medium">
                                        <Database size={16} /> Database
                                    </div>
                                    <div className="text-gray-800 font-bold capitalize flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${metrics.database.status === 'connected' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                        {metrics.database.status}
                                    </div>
                                </div>

                                {/* Uptime */}
                                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 flex flex-col gap-2">
                                    <div className="flex items-center gap-2 text-gray-500 text-sm font-medium">
                                        <Clock size={16} /> Uptime
                                    </div>
                                    <div className="text-gray-800 font-bold">
                                        {formatUptime(metrics.system.uptimeSeconds)}
                                    </div>
                                </div>

                                {/* Memory */}
                                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 flex flex-col gap-2">
                                    <div className="flex items-center gap-2 text-gray-500 text-sm font-medium">
                                        <Cpu size={16} /> Memory (RSS)
                                    </div>
                                    <div className="text-gray-800 font-bold">
                                        {metrics.system.memoryUsageMB.rss} MB
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                                        <div className="bg-primary-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, (metrics.system.memoryUsageMB.rss / 512) * 100)}%` }}></div>
                                    </div>
                                </div>

                                {/* Memory Heap */}
                                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 flex flex-col gap-2">
                                    <div className="flex items-center gap-2 text-gray-500 text-sm font-medium">
                                        <Cpu size={16} /> Heap Used
                                    </div>
                                    <div className="text-gray-800 font-bold">
                                        {metrics.system.memoryUsageMB.heapUsed} / {metrics.system.memoryUsageMB.heapTotal} MB
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                                        <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${(metrics.system.memoryUsageMB.heapUsed / metrics.system.memoryUsageMB.heapTotal) * 100}%` }}></div>
                                    </div>
                                </div>

                                {/* Users */}
                                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 flex flex-col gap-2">
                                    <div className="flex items-center gap-2 text-gray-500 text-sm font-medium">
                                        <Users size={16} /> Total Users
                                    </div>
                                    <div className="text-gray-800 font-bold text-xl">
                                        {metrics.platform.totalUsers.toLocaleString()}
                                    </div>
                                </div>

                                {/* Posts */}
                                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 flex flex-col gap-2">
                                    <div className="flex items-center gap-2 text-gray-500 text-sm font-medium">
                                        <FileText size={16} /> Total Posts
                                    </div>
                                    <div className="text-gray-800 font-bold text-xl">
                                        {metrics.platform.totalPosts.toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ServerMetricsModal;
