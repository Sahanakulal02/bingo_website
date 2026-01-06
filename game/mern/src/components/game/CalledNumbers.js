import React from 'react';
import { Megaphone } from 'lucide-react';

const CalledNumbers = ({ numbers }) => {
  const sortedNumbers = [...numbers].sort((a, b) => a - b);

  return (
    <div className="card">
      <div className="flex items-center space-x-2 mb-4">
        <Megaphone className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-bold text-gray-900">Called Numbers</h3>
      </div>
      
      <div className="space-y-2">
        {numbers.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No numbers called yet</p>
        ) : (
          <div className="grid grid-cols-5 gap-2">
            {sortedNumbers.map((number) => (
              <div
                key={number}
                className="w-8 h-8 md:w-10 md:h-10 bg-green-500 text-white rounded-lg flex items-center justify-center text-sm md:text-base font-bold animate-pulse"
              >
                {number}
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="mt-4 text-center">
        <p className="text-sm text-gray-600">
          Total Called: {numbers.length}/75
        </p>
      </div>
    </div>
  );
};

export default CalledNumbers;
