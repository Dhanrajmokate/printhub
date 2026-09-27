import React, { useState } from 'react';
import { Clock, ArrowLeft } from 'lucide-react';
import { OrderHistory } from '../components/customer/OrderHistory.js';
import { OrderTracker } from '../components/customer/OrderTracker.js';

export const CustomerOrdersPage: React.FC = () => {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <Clock className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            My Print Orders & History
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time live progress tracking, downloadable PDF receipts, and cancellation refunds
          </p>
        </div>
      </div>

      {selectedOrderId ? (
        <OrderTracker
          orderId={selectedOrderId}
          onBack={() => setSelectedOrderId(null)}
        />
      ) : (
        <OrderHistory
          onSelectOrder={(orderId) => setSelectedOrderId(orderId)}
        />
      )}
    </div>
  );
};
