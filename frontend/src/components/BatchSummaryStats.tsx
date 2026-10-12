import React from 'react';
import { ListOrdered, CheckCircle, XCircle } from 'lucide-react';

interface BatchSummaryStatsProps {
  total: number;
  successful: number;
  failed: number;
}

export const BatchSummaryStats: React.FC<BatchSummaryStatsProps> = ({ total, successful, failed }) => {
  const passRate = total > 0 ? (successful / total) * 100 : 0;
  
  let passRateColor = 'text-gray-400'; // Default for 0 total
  if (total > 0) {
    if (passRate >= 80) passRateColor = 'text-green-500';
    else if (passRate >= 50) passRateColor = 'text-yellow-500';
    else passRateColor = 'text-red-500';
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-800 rounded-lg shadow-md border border-gray-700">
      <div className="flex items-center p-4 bg-gray-900 rounded-md border border-gray-700">
        <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg mr-4">
          <ListOrdered size={24} />
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Total Runs</p>
          <p className="text-2xl font-bold text-gray-100">{total}</p>
        </div>
      </div>

      <div className="flex items-center p-4 bg-gray-900 rounded-md border border-gray-700">
        <div className="p-2 bg-green-500/10 text-green-400 rounded-lg mr-4">
          <CheckCircle size={24} />
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Successful</p>
          <p className="text-2xl font-bold text-gray-100">{successful}</p>
        </div>
      </div>

      <div className="flex items-center p-4 bg-gray-900 rounded-md border border-gray-700">
        <div className="p-2 bg-red-500/10 text-red-400 rounded-lg mr-4">
          <XCircle size={24} />
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Failed</p>
          <p className="text-2xl font-bold text-gray-100">{failed}</p>
        </div>
      </div>

      <div className="flex items-center p-4 bg-gray-900 rounded-md border border-gray-700">
         <div className={`p-2 rounded-lg mr-4 bg-gray-800 ${passRateColor}`}>
           <span className="font-extrabold text-xl leading-none">%</span>
         </div>
         <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Pass Rate</p>
          <p className={`text-2xl font-bold ${passRateColor}`}>
            {total > 0 ? `${passRate.toFixed(1)}%` : 'N/A'}
          </p>
        </div>
      </div>
    </div>
  );
};
