
import React, { useState, useEffect } from 'react';
import { db } from '../../db';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { IndianRupee, Weight, Calendar } from 'lucide-react';

const MasterTab: React.FC = () => {
  const [stats, setStats] = useState({ totalRevenue: 0, totalKg: 0 });
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const sales = await db.sales.toArray();
    let rev = 0;
    let kg = 0;
    const dailyData: Record<string, number> = {};

    sales.forEach(s => {
      rev += s.totalAmount;
      const dateKey = new Date(s.date).toLocaleDateString();
      dailyData[dateKey] = (dailyData[dateKey] || 0) + s.totalAmount;

      s.items.forEach(item => {
        const weight = item.type === '1kg' ? 1 : 0.5;
        kg += weight * item.quantity;
      });
    });

    setStats({ totalRevenue: rev, totalKg: kg });
    
    const processedChart = Object.entries(dailyData)
      .slice(-7)
      .map(([date, value]) => ({ date, value }));
    setChartData(processedChart);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-8 rounded-3xl shadow-xl border border-blue-500/20">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
              <IndianRupee className="h-8 w-8 text-white" />
            </div>
            <span className="text-xs font-bold text-blue-100 uppercase tracking-widest bg-blue-900/40 px-3 py-1 rounded-full">Total Revenue</span>
          </div>
          <div className="text-4xl font-black text-white">₹{stats.totalRevenue.toLocaleString()}</div>
          <p className="text-blue-100 text-sm mt-2 opacity-80">Total accumulated income from all salesmen</p>
        </div>

        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-8 rounded-3xl shadow-xl border border-indigo-500/20">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
              <Weight className="h-8 w-8 text-white" />
            </div>
            <span className="text-xs font-bold text-indigo-100 uppercase tracking-widest bg-indigo-900/40 px-3 py-1 rounded-full">Volume Sold</span>
          </div>
          <div className="text-4xl font-black text-white">{stats.totalKg.toLocaleString()} KG</div>
          <p className="text-indigo-100 text-sm mt-2 opacity-80">Total weight of goods sold to date</p>
        </div>
      </div>

      <div className="bg-slate-800 p-8 rounded-3xl border border-slate-700 shadow-xl overflow-hidden min-h-[450px]">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-xl font-bold text-white">Revenue Timeline</h3>
            <p className="text-slate-400 text-sm">Performance tracking for recent sales.</p>
          </div>
          <div className="flex items-center space-x-2 text-slate-400 text-sm">
            <Calendar className="h-4 w-4" />
            <span>Last 7 Days</span>
          </div>
        </div>
        
        <div className="w-full h-[350px]">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={350}>
              <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px' }}
                  itemStyle={{ color: '#60a5fa', fontWeight: 'bold' }}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === chartData.length - 1 ? '#60a5fa' : '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 italic">No historical data available for graph.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MasterTab;
