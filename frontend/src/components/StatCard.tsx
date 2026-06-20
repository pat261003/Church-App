interface Props {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}

export default function StatCard({ label, value, sub, color = 'bg-primary' }: Props) {
  return (
    <div className="card flex flex-col gap-1">
      <div className={`w-10 h-1 rounded-full ${color} mb-2`} />
      <p className="text-3xl font-bold text-church-navy">{value}</p>
      <p className="text-sm font-semibold text-gray-600">{label}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}
