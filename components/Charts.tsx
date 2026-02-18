
import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, LineChart, Line } from 'recharts';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ChartProps {
  data: any[];
  colors: string[];
  currency: string;
  isDark: boolean;
  customKeys?: string[];
  onClick?: (data: any) => void;
}

interface OverviewChartProps extends ChartProps {
  remaining: number;
  totalIncome: number;
  t: (key: string) => string;
}

const ChartTooltip = ({ active, payload, label, currency, isDark }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className={`p-2.5 rounded-xl shadow-2xl border ${isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-100 text-gray-900'} animate-in zoom-in duration-200 z-50`}>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{data.name || label}</p>
          <div className="space-y-1">
             {payload.map((entry: any, index: number) => (
                <p key={index} className="text-[11px] font-bold flex items-center gap-2">
                   <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }}></span>
                   {entry.name}: <span className="font-mono">{currency} {entry.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </p>
             ))}
          </div>
        </div>
      );
    }
    return null;
};

// --- REPORTS PIE CHART ---
export const CategoryPieChart: React.FC<ChartProps> = ({ data, colors, currency, isDark, onClick }) => {
  return (
    <div className="w-full h-full relative">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
          <Pie
            data={data}
            cx="50%"
            cy="50%" 
            innerRadius="55%" 
            outerRadius="90%" 
            paddingAngle={3} 
            dataKey="value"
            stroke={isDark ? "#1f2937" : "#ffffff"} 
            strokeWidth={3}
            animationBegin={0}
            animationDuration={800}
            label={false}
            onClick={(data) => onClick && onClick(data)}
            style={{ cursor: 'pointer' }}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={colors[index % colors.length]}
                style={{ cursor: 'pointer', outline: 'none' }}
              />
            ))}
          </Pie>
          <RechartsTooltip content={<ChartTooltip currency={currency} isDark={isDark} />} />
          <Legend 
              layout="vertical"
              verticalAlign="middle"
              align="right"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ 
                  fontSize: '9px', 
                  fontWeight: 'bold', 
                  textTransform: 'uppercase',
                  paddingLeft: '10px'
              }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

// --- DASHBOARD BUDGET CHART ---
export const FinancialOverviewChart: React.FC<OverviewChartProps> = ({ data, colors, currency, isDark, remaining, totalIncome, t, onClick }) => {
  const chartData = [...data];
  
  if (remaining > 0) {
    chartData.push({
      name: t('reminding'),
      value: remaining,
      isSpecial: true,
      color: '#32d74b' // Green
    });
  } else if (remaining < 0) {
    chartData.push({
      name: t('extraExpense'),
      value: Math.abs(remaining),
      isSpecial: true,
      color: '#ff3b30' // Red
    });
  }

  return (
    <div className="w-full h-full relative">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%" 
            innerRadius="40%" 
            outerRadius="90%" 
            paddingAngle={2} 
            dataKey="value"
            stroke={isDark ? "#1f2937" : "#ffffff"} 
            strokeWidth={2}
            animationBegin={0}
            animationDuration={800}
            label={false}
            onClick={(data) => onClick && onClick(data)}
            style={{ cursor: 'pointer' }}
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.isSpecial ? entry.color : colors[index % colors.length]}
                style={{ cursor: 'pointer', outline: 'none' }}
              />
            ))}
          </Pie>
          <RechartsTooltip content={<ChartTooltip currency={currency} isDark={isDark} />} />
          <Legend 
              verticalAlign="bottom" 
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ 
                  fontSize: '8px', 
                  fontWeight: '900', 
                  textTransform: 'uppercase',
                  paddingTop: '10px',
                  position: 'relative'
              }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export const FlowBarChart: React.FC<ChartProps> = ({ data, currency, isDark, onClick }) => {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={data} 
              margin={{ top: 10, right: 0, left: -20, bottom: 0 }}
              onClick={(e) => {
                if (e && e.activePayload && e.activePayload.length > 0) {
                  onClick && onClick(e.activePayload[0].payload);
                }
              }}
              style={{ cursor: 'pointer' }}
            >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#374151' : '#e5e7eb'} />
                <XAxis 
                    dataKey="date" 
                    tick={{fontSize: 10, fill: '#9ca3af', fontWeight: 'bold'}} 
                    tickFormatter={(val) => {
                        if (!val) return '';
                        const parts = val.split('-');
                        if(parts.length === 3) {
                            const d = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
                            return `${d.getDate()}/${d.getMonth()+1}`;
                        }
                        return val;
                    }}
                    axisLine={false}
                    tickLine={false}
                />
                <YAxis tick={{fontSize: 10, fill: '#9ca3af', fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                <RechartsTooltip 
                     cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
                     contentStyle={{ backgroundColor: isDark ? '#1f2937' : '#fff', borderColor: 'transparent', borderRadius: '12px' }}
                     itemStyle={{ fontSize: '12px', fontWeight: 'bold', color: isDark ? '#fff' : '#000' }}
                     content={<ChartTooltip currency={currency} isDark={isDark} />}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}/>
                <Bar dataKey="income" name="Income" fill="#32d74b" radius={[6, 6, 0, 0]} maxBarSize={30} />
                <Bar dataKey="expense" name="Expense" fill="#ff3b30" radius={[6, 6, 0, 0]} maxBarSize={30} />
            </BarChart>
        </ResponsiveContainer>
    );
};

export const TrendLineChart: React.FC<ChartProps> = ({ data, currency, isDark, customKeys, onClick }) => {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }} onClick={(e) => {
                if (e && e.activePayload && e.activePayload.length > 0) {
                  onClick && onClick(e.activePayload[0].payload);
                }
            }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#374151' : '#e5e7eb'} />
                <XAxis 
                    dataKey="date" 
                    tick={{fontSize: 10, fill: '#9ca3af', fontWeight: 'bold'}} 
                    tickFormatter={(val) => {
                        if (!val) return '';
                        const parts = val.split('-');
                        if(parts.length === 3) {
                            const d = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
                            return `${d.getDate()}/${d.getMonth()+1}`;
                        }
                        return val;
                    }}
                    axisLine={false}
                    tickLine={false}
                />
                <YAxis tick={{fontSize: 10, fill: '#9ca3af', fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                <RechartsTooltip 
                     content={<ChartTooltip currency={currency} isDark={isDark} />}
                     cursor={{ stroke: '#9ca3af', strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}/>
                <Line type="monotone" dataKey="income" name="Income" stroke="#32d74b" strokeWidth={3} dot={{r: 4, strokeWidth: 0}} activeDot={{r: 6}} />
                <Line type="monotone" dataKey="expense" name="Expense" stroke="#ff3b30" strokeWidth={3} dot={{r: 4, strokeWidth: 0}} activeDot={{r: 6}} />
            </LineChart>
        </ResponsiveContainer>
    );
};

// --- SPENDING HEATMAP COMPONENT ---
interface SpendingHeatmapProps {
  transactions: any[];
  currency: string;
  isDark: boolean;
  onClick: (date: string) => void;
}

export const SpendingHeatmap: React.FC<SpendingHeatmapProps> = ({ transactions, currency, isDark, onClick }) => {
  // 1. Prepare Data Grid (Last 15 weeks / ~105 days)
  const today = new Date();
  const weeks = 15;
  const days = weeks * 7;
  
  // Generate date map with Net Calculation (Income - Expense)
  const dateMap: Record<string, number> = {};
  let maxSurplus = 0;
  let maxDeficit = 0;

  transactions.forEach(t => {
     const d = new Date(t.date);
     if (!isNaN(d.getTime())) {
         const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
         if (t.type === 'income') {
            dateMap[key] = (dateMap[key] || 0) + t.amount;
         } else if (t.type === 'expense') {
            dateMap[key] = (dateMap[key] || 0) - t.amount;
         }
     }
  });

  // Calculate scaling factors
  Object.values(dateMap).forEach(val => {
     if (val > 0 && val > maxSurplus) maxSurplus = val;
     if (val < 0 && Math.abs(val) > maxDeficit) maxDeficit = Math.abs(val);
  });
  
  if (maxSurplus === 0) maxSurplus = 1;
  if (maxDeficit === 0) maxDeficit = 1;

  // Create grid cells
  const cells = [];
  for (let i = days - 1; i >= 0; i--) {
     const d = new Date();
     d.setDate(today.getDate() - i);
     const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
     const amount = dateMap[key] || 0;
     
     let intensity = 0;
     let type = 'neutral';

     if (amount > 0) {
         type = 'surplus'; // Green
         intensity = Math.ceil((amount / maxSurplus) * 4);
     } else if (amount < 0) {
         type = 'deficit'; // Red
         intensity = Math.ceil((Math.abs(amount) / maxDeficit) * 4);
     }
     
     cells.push({ date: d, key, amount, intensity, type });
  }

  // Group by week for vertical columns
  const weeksData = [];
  let currentWeek = [];
  for (let i = 0; i < cells.length; i++) {
     currentWeek.push(cells[i]);
     if (currentWeek.length === 7 || i === cells.length - 1) {
        weeksData.push(currentWeek);
        currentWeek = [];
     }
  }

  const getColor = (type: string, intensity: number) => {
     if (type === 'neutral') return isDark ? 'bg-gray-800' : 'bg-gray-100';
     // Green scale (Surplus)
     if (type === 'surplus') {
         if (intensity === 1) return 'bg-green-200 dark:bg-green-900/30';
         if (intensity === 2) return 'bg-green-300 dark:bg-green-800/50';
         if (intensity === 3) return 'bg-green-400 dark:bg-green-700';
         return 'bg-green-500 dark:bg-green-600';
     }
     // Red scale (Deficit)
     if (type === 'deficit') {
         if (intensity === 1) return 'bg-red-200 dark:bg-red-900/30';
         if (intensity === 2) return 'bg-red-300 dark:bg-red-800/50';
         if (intensity === 3) return 'bg-red-400 dark:bg-red-700';
         return 'bg-red-500 dark:bg-red-600';
     }
     return isDark ? 'bg-gray-800' : 'bg-gray-100';
  };

  return (
    <div className="w-full h-full flex flex-col justify-center overflow-x-auto no-scrollbar pb-2">
       <div className="flex gap-1.5 min-w-max px-2">
          {weeksData.map((week, wIdx) => (
             <div key={wIdx} className="flex flex-col gap-1.5">
                {week.map((day) => (
                   <div 
                      key={day.key}
                      onClick={() => onClick(day.key)}
                      className={`w-3 h-3 md:w-4 md:h-4 rounded-sm ${getColor(day.type, day.intensity)} transition-all hover:scale-125 hover:z-10 cursor-pointer relative group`}
                   >
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-[9px] font-bold py-1 px-2 rounded-lg whitespace-nowrap z-50 pointer-events-none shadow-xl">
                         {day.date.toLocaleDateString(undefined, {month:'short', day:'numeric'})}: {day.amount > 0 ? '+' : ''}{currency}{day.amount.toFixed(0)}
                      </div>
                   </div>
                ))}
             </div>
          ))}
       </div>
       <div className="flex items-center justify-end gap-2 mt-3 px-4 text-[9px] font-bold text-gray-400 uppercase tracking-widest">
          <span>Deficit</span>
          <div className="flex gap-1">
             <div className="w-2.5 h-2.5 rounded-sm bg-red-500 dark:bg-red-600"></div>
             <div className="w-2.5 h-2.5 rounded-sm bg-red-300 dark:bg-red-800/50"></div>
             <div className={`w-2.5 h-2.5 rounded-sm ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}></div>
             <div className="w-2.5 h-2.5 rounded-sm bg-green-300 dark:bg-green-800/50"></div>
             <div className="w-2.5 h-2.5 rounded-sm bg-green-500 dark:bg-green-600"></div>
          </div>
          <span>Surplus</span>
       </div>
    </div>
  );
};

// --- CALENDAR CHART COMPONENT ---
export const CalendarChart: React.FC<ChartProps> = ({ data, currency, isDark, onClick }) => {
    // Initialize view to the last available data date or today
    const [viewDate, setViewDate] = useState(() => {
        if (data && data.length > 0) {
            // Sort to find the latest date
            const sorted = [...data].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            return new Date(sorted[sorted.length-1].date);
        }
        return new Date();
    });

    // Process daily data with strict date key matching
    const dayData = useMemo(() => {
        const map: Record<string, { income: number; expense: number; balance: number }> = {};
        let maxBal = 0;
        
        data.forEach(d => {
            // Ensure date is treated as local day part or just split YYYY-MM-DD if available
            // If d.date is ISO (2023-10-27T...), create local date object
            const dt = new Date(d.date);
            const dateKey = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
            
            const bal = d.income - d.expense;
            
            if (!map[dateKey]) {
                map[dateKey] = { income: 0, expense: 0, balance: 0 };
            }
            
            map[dateKey].income += d.income;
            map[dateKey].expense += d.expense;
            map[dateKey].balance += bal;
            
            if (Math.abs(map[dateKey].balance) > maxBal) maxBal = Math.abs(map[dateKey].balance);
        });
        
        return { map, maxBal: maxBal || 1 };
    }, [data]);

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth(); // 0-indexed

    const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 (Sun) - 6 (Sat)
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);

    const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
    const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

    return (
        <div className="flex flex-col h-full select-none">
            <div className="flex justify-between items-center mb-3 px-2">
                <button onClick={prevMonth} className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                    <ChevronLeft size={16} className={isDark ? "text-gray-300" : "text-gray-600"} />
                </button>
                <span className="text-xs font-black uppercase tracking-widest text-gray-700 dark:text-gray-200">
                    {viewDate.toLocaleDateString('default', { month: 'long', year: 'numeric' })}
                </span>
                <button onClick={nextMonth} className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                    <ChevronRight size={16} className={isDark ? "text-gray-300" : "text-gray-600"} />
                </button>
            </div>
            
            <div className="grid grid-cols-7 text-center mb-1">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
                    <div key={d} className="text-[9px] font-black text-gray-400">{d}</div>
                ))}
            </div>
            
            <div className="grid grid-cols-7 gap-1 auto-rows-fr flex-1">
                {days.map((d, i) => {
                    if (d === null) return <div key={`empty-${i}`} className="aspect-square" />;
                    
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                    const entry = dayData.map[dateStr];
                    
                    let bgClass = isDark ? "bg-gray-800/30 border-gray-800" : "bg-gray-50 border-gray-100";
                    let textClass = isDark ? "text-gray-600" : "text-gray-400";
                    
                    if (entry) {
                        const intensity = Math.min(4, Math.ceil((Math.abs(entry.balance) / dayData.maxBal) * 4)) || 1;
                        
                        if (entry.balance > 0) { // Green (Surplus)
                             const levels = isDark 
                                ? ['bg-green-900/20 border-green-900/30', 'bg-green-900/40 border-green-900/50', 'bg-green-900/60 border-green-800/60', 'bg-green-900/80 border-green-700']
                                : ['bg-green-50 border-green-100', 'bg-green-100 border-green-200', 'bg-green-200 border-green-300', 'bg-green-300 border-green-400'];
                             bgClass = levels[intensity - 1] || levels[3];
                             textClass = isDark ? "text-green-200" : "text-green-800";
                        } else if (entry.balance < 0) { // Red (Deficit)
                             const levels = isDark
                                ? ['bg-red-900/20 border-red-900/30', 'bg-red-900/40 border-red-900/50', 'bg-red-900/60 border-red-800/60', 'bg-red-900/80 border-red-700']
                                : ['bg-red-50 border-red-100', 'bg-red-100 border-red-200', 'bg-red-200 border-red-300', 'bg-red-300 border-red-400'];
                             bgClass = levels[intensity - 1] || levels[3];
                             textClass = isDark ? "text-red-200" : "text-red-800";
                        } else {
                             // Balance is 0 (Income == Expense != 0)
                             bgClass = isDark ? "bg-blue-900/30 border-blue-900/50" : "bg-blue-50 border-blue-100";
                             textClass = isDark ? "text-blue-200" : "text-blue-600";
                        }
                    }

                    return (
                        <div 
                            key={d} 
                            onClick={() => entry && onClick && onClick({ date: dateStr })}
                            className={`aspect-square rounded-lg flex flex-col items-center justify-center cursor-pointer relative group transition-all hover:scale-105 border ${bgClass}`}
                        >
                            <span className={`text-[10px] font-black ${textClass}`}>{d}</span>
                            
                            {/* Dots for activity type */}
                            {entry && (
                                <div className="flex gap-0.5 mt-0.5">
                                    {entry.income > 0 && <div className="w-1 h-1 rounded-full bg-green-500/80"></div>}
                                    {entry.expense > 0 && <div className="w-1 h-1 rounded-full bg-red-500/80"></div>}
                                </div>
                            )}
                            
                            {/* Tooltip */}
                            {entry && (
                                <div className="absolute bottom-full mb-2 hidden group-hover:block z-50 min-w-[120px]">
                                    <div className={`text-[10px] p-2 rounded-xl shadow-xl border ${isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-800'}`}>
                                        <p className="font-black text-center border-b border-gray-500/20 pb-1 mb-1">{dateStr}</p>
                                        <div className="flex justify-between gap-3 text-green-500 font-bold"><span>In:</span><span>{currency}{Math.round(entry.income)}</span></div>
                                        <div className="flex justify-between gap-3 text-red-500 font-bold"><span>Out:</span><span>{currency}{Math.round(entry.expense)}</span></div>
                                        <div className={`flex justify-between gap-3 font-black border-t border-gray-500/20 pt-1 mt-1 ${entry.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            <span>Net:</span><span>{currency}{Math.round(entry.balance)}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            
            <div className="flex justify-between items-center mt-2 px-2 text-[8px] font-bold text-gray-400 uppercase">
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-400"></div>Deficit</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-400"></div>Surplus</div>
            </div>
        </div>
    );
};
