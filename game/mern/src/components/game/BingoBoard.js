import React from 'react';

const BingoBoard = ({ board, calledNumbers, isInteractive, onCallNumber, isWinner, completedLines = 0 }) => {
  const handleCellClick = (number) => {
    if (!isInteractive) return;
    onCallNumber(number);
  };

  const isCalled = (number) => {
    return calledNumbers.includes(number);
  };

  const isWinningCell = (number) => {
    if (!isWinner) return false;
    return calledNumbers.includes(number);
  };

  if (!board || board.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading board...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      {/* BINGO Header */}
      <div className="flex space-x-2 mb-4">
        {['B', 'I', 'N', 'G', 'O'].map((letter, index) => (
          <div
            key={letter}
            className="w-12 h-12 md:w-16 md:h-16 bg-blue-600 text-white rounded-lg flex items-center justify-center text-lg md:text-xl font-bold"
          >
            {letter}
          </div>
        ))}
      </div>

      {/* Bingo Grid */}
      <div className="grid grid-cols-5 gap-2">
        {board.map((row, rowIndex) =>
          row.map((number, colIndex) => {
            const cellClass = `bingo-cell ${
              isCalled(number) 
                ? isWinningCell(number) 
                  ? 'win' 
                  : 'called'
                : ''
            } ${
              isInteractive && !isCalled(number) 
                ? 'hover:bg-blue-50 hover:border-blue-400 cursor-pointer' 
                : ''
            }`;

            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={cellClass}
                onClick={() => handleCellClick(number)}
                title={isInteractive && !isCalled(number) ? `Click to call ${number}` : ''}
              >
                {number}
              </div>
            );
          })
        )}
      </div>

      {/* Instructions */}
      {isInteractive && (
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">
            Click on any uncalled number on your board to call it
          </p>
        </div>
      )}

      {/* Progress Indicator */}
      <div className="mt-4 text-center">
        <div className="flex items-center justify-center space-x-2">
          <span className="text-sm text-gray-600">Completed Lines:</span>
          <span className="text-lg font-bold text-blue-600">{completedLines}/5</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
            style={{ width: `${(completedLines / 5) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Win Animation */}
      {isWinner && (
        <div className="mt-4 text-center">
          <div className="text-2xl animate-bounce">🎉</div>
          <p className="text-green-600 font-bold">BINGO!</p>
        </div>
      )}
    </div>
  );
};

export default BingoBoard;
