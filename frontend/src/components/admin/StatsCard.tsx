interface StatsCardProps {
  title: string;
  value: string | number;
  change: string;
  changeType: 'increase' | 'decrease';
  icon: string;
  description: string;
}

export default function StatsCard({
  title,
  value,
  change,
  changeType,
  icon,
  description
}: StatsCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm">{title}</p>
          <h3 className="text-2xl font-bold mt-1">{value}</h3>
          <p className={`text-sm mt-2 flex items-center ${
            changeType === 'increase' ? 'text-green-500' : 'text-red-500'
          }`}>
            <i className={`fas ${
              changeType === 'increase' ? 'fa-arrow-up' : 'fa-arrow-down'
            } mr-1`}></i>
            {change} <span className="text-gray-500 ml-1">{description}</span>
          </p>
        </div>
        <div className="w-12 h-12 rounded-full bg-light/50 flex items-center justify-center text-primary">
          <i className={`${icon} text-xl`}></i>
        </div>
      </div>
    </div>
  );
}