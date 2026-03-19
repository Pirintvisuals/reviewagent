export function StatsCard({ icon: Icon, label, value, color = 'green', subtext }) {
  const colorMap = {
    green: 'bg-green-50 text-green-700 border-green-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    red: 'bg-red-50 text-red-700 border-red-200',
  };

  const iconColorMap = {
    green: 'text-green-500',
    yellow: 'text-yellow-500',
    blue: 'text-blue-500',
    red: 'text-red-500',
  };

  return (
    <div className={`rounded-xl border p-4 flex items-center gap-3 ${colorMap[color]}`}>
      <div className={`flex-shrink-0 ${iconColorMap[color]}`}>
        <Icon size={28} />
      </div>
      <div>
        <p className="text-xs font-medium opacity-70 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold">{value ?? '—'}</p>
        {subtext && <p className="text-xs opacity-60 mt-0.5">{subtext}</p>}
      </div>
    </div>
  );
}
