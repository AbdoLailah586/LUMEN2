import { useEffect, useState } from 'react';

import { apiClient } from '../services/api';
import { Clock, CheckCircle } from 'lucide-react';

interface Activity {
  id: string;
  action_type: string;
  description: string;
  details: any;
  created_at: string;
}

export function ActivityTimeline({ datasetId }: { datasetId: string }) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get(`/datasets/${datasetId}/activities`)
       .then(res => setActivities(res.data))
       .catch(err => console.error("Error fetching activities", err))
       .finally(() => setLoading(false));
  }, [datasetId]);

  if (loading) return (
    <div className="p-6 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
    </div>
  );
  if (!activities.length) return <div className="text-gray-500 p-6 italic text-center text-sm">No activity recorded yet for this dataset.</div>;

  return (
    <div className="space-y-6 pt-2">
      <h3 className="text-xl font-extrabold flex items-center text-gray-100 tracking-tight mb-6">
        <div className="p-2 bg-indigo-900/30 rounded-lg border border-indigo-500/30 mr-3 shadow-inner">
          <Clock className="w-5 h-5 text-indigo-400" />
        </div>
        Activity Log
      </h3>
      <div className="relative border-l-2 border-white/10 ml-4">
        {activities.map((act) => (
          <div key={act.id} className="mb-8 ml-8 group">
            <span className="absolute flex items-center justify-center w-8 h-8 bg-dark-900 rounded-full -left-4 ring-4 ring-dark-800 border border-indigo-500/50 shadow-[0_0_10px_rgba(99,102,241,0.3)] transition-transform duration-300 group-hover:scale-110">
              <CheckCircle className="w-4 h-4 text-indigo-400" />
            </span>
            <div className="p-5 bg-dark-900/40 backdrop-blur-md border border-white/5 rounded-2xl shadow-lg transition-all duration-300 group-hover:border-indigo-500/30 group-hover:bg-dark-900/60 hover:-translate-y-1">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-bold text-gray-200 capitalize tracking-wide">{act.action_type.replace('_', ' ')}</span>
                <span className="bg-indigo-900/30 text-indigo-300 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-md border border-indigo-500/20">
                  {new Date(act.created_at).toLocaleString()}
                </span>
              </div>
              <p className="mb-2 text-sm text-gray-400 leading-relaxed font-medium">{act.description}</p>
              {act.details && act.details.steps && act.details.steps.length > 0 && (
                <ul className="mt-3 text-xs text-gray-500 list-disc list-inside bg-dark-800/50 p-3 rounded-lg border border-white/5">
                  {act.details.steps.map((step: any, i: number) => (
                    <li key={i} className="mb-1 leading-relaxed">{step.description}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
