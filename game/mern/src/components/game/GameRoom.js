import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  ArrowLeft, 
  Users, 
  Clock, 
  Trophy,
  CheckCircle,
  XCircle
} from 'lucide-react';
import BingoBoard from './BingoBoard';
import CalledNumbers from './CalledNumbers';
import GameChat from './GameChat';

const GameRoom = () => {
  const { gameId } = useParams();
  const { user } = useAuth();
  const { socket, connected, joinRoom, leaveRoom } = useSocket();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [calledNumbers, setCalledNumbers] = useState([]);
  const [myBoard, setMyBoard] = useState([]);
  const [opponentBoard, setOpponentBoard] = useState([]);
  const [gameStatus, setGameStatus] = useState('waiting');
  const [myCompletedLines, setMyCompletedLines] = useState(0);
  const [opponentCompletedLines, setOpponentCompletedLines] = useState(0);
  const [players, setPlayers] = useState([]);
  const [showGameReadyModal, setShowGameReadyModal] = useState(false);
  const [gameStats, setGameStats] = useState({
    gamesPlayed: 0,
    gamesWon: 0,
    gamesLost: 0,
    totalLinesCompleted: 0,
    averageLinesPerGame: 0
  });
  const [forceUpdate, setForceUpdate] = useState(0); // Force re-render

  useEffect(() => {
    // Only load game stats if user exists
    if (user && user._id) {
      loadGameStats();
    }
    
    // Check if this is a solo game
    const isSoloGame = gameId && gameId.startsWith('solo-game-');
    
    if (isSoloGame && user && user._id) {
      console.log('Starting solo game:', gameId);
      // For solo games, just start the game immediately
      setRoom({ roomCode: gameId, players: [{ userId: user._id, username: user.username, isHost: true }], status: 'active' });
      setPlayers([{ userId: user._id, username: user.username, isHost: true }]);
      setGameStatus('active');
      setIsMyTurn(true); // Solo player always has their turn
      setLoading(false);
      
      // Generate player's board for solo game
      if (myBoard.length === 0) {
        const playerBoard = generateBingoBoard();
        setMyBoard(playerBoard);
      }
    } else if (gameId && user && user._id && socket && connected) {
      console.log('Joining multiplayer room:', gameId, 'User:', user.username, 'Socket connected:', connected);
      joinRoom({ roomCode: gameId, userId: user._id, username: user.username });
    } else {
      console.log('Not joining room yet:', { gameId, user: !!user, socket: !!socket, connected });
    }
  }, [gameId, user, socket, connected]);

  // Additional effect to check room status and show game ready if needed
  useEffect(() => {
    if (room && players.length >= 2 && room.status === 'ready' && !showGameReadyModal) {
      console.log(`Room status check: showing game ready modal for ${players.length} players`);
      setShowGameReadyModal(true);
      setGameStatus('ready');
      
      // Don't auto-start - let the host manually start the game
    }
  }, [room, players.length, showGameReadyModal]);

  // Fallback effect: If we're in a ready state and the host starts the game, 
  // but we don't receive gameStarted event, auto-start after 5 seconds
  useEffect(() => {
    if (gameStatus === 'ready' && players.length >= 2 && !players.find(p => p.userId === user._id)?.isHost) {
      const timer = setTimeout(() => {
        if (gameStatus === 'ready') {
          console.log('⏰ 5 second timeout - auto-starting game for non-host player');
          console.log('⏰ Current state before timeout:', { gameStatus, myBoardLength: myBoard.length, showGameReadyModal });
          
          // Generate board FIRST before changing game status
          if (myBoard.length === 0) {
            console.log('⏰ Generating board via timeout fallback');
            const playerBoard = generateBingoBoard();
            setMyBoard(playerBoard);
            console.log('⏰ Board generated via timeout:', playerBoard);
          }
          
          // Now update game state
          setGameStatus('active');
          setShowGameReadyModal(false);
          setIsMyTurn(false);
          
          console.log('⏰ Game state updated via timeout:', { gameStatus: 'active', myBoardLength: myBoard.length, isMyTurn: false });
          
          toast.success('Game auto-started after timeout!');
        }
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [gameStatus, players.length, user._id]);

  useEffect(() => {
    if (socket) {
      // Listen for room events
      socket.on('roomJoined', handleRoomJoined);
      socket.on('playerJoined', handlePlayerJoined);
      socket.on('playerLeft', handlePlayerLeft);
      socket.on('gameStarted', handleGameStarted);
      socket.on('numberCalled', handleNumberCalled);
      socket.on('gameCompleted', handleGameCompleted);
      socket.on('roomUpdate', handleRoomUpdate);
      socket.on('gameReady', handleGameReady);
      socket.on('turnSwitched', handleTurnSwitched);
      socket.on('error', handleError);

      return () => {
        socket.off('roomJoined');
        socket.off('playerJoined');
        socket.off('playerLeft');
        socket.off('gameStarted');
        socket.off('numberCalled');
        socket.off('gameCompleted');
        socket.off('roomUpdate');
        socket.off('gameReady');
        socket.off('turnSwitched');
        socket.off('error');
      };
    }
  }, [socket]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (room && socket) {
        console.log('Leaving room on unmount:', room.roomCode);
        leaveRoom({ roomCode: room.roomCode });
      }
    };
  }, [room, socket]);

  // Generate a Bingo board for the current player
  const generateBingoBoard = () => {
    console.log('🃏 Starting board generation...');
    const board = [];
    const allNumbers = [];
    for (let i = 1; i <= 25; i++) {
      allNumbers.push(i);
    }
    
    // Shuffle the numbers
    for (let i = allNumbers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allNumbers[i], allNumbers[j]] = [allNumbers[j], allNumbers[i]];
    }
    
    // Generate 5x5 board
    let numberIndex = 0;
    for (let i = 0; i < 5; i++) {
      const row = [];
      for (let j = 0; j < 5; j++) {
        row.push(allNumbers[numberIndex++]);
      }
      board.push(row);
    }
    
    console.log('🃏 Board generated successfully:', board);
    console.log('🃏 Board length:', board.length, 'Rows:', board.length, 'Cols:', board[0]?.length);
    return board;
  };
  const handleRoomJoined = (data) => {
    console.log('Joined room:', data);
    console.log('Setting room status to:', data.status);
    
    setRoom(data);
    setPlayers(data.players || []);
    setGameStatus(data.status || 'waiting');
    setLoading(false);
    
    // Generate player's board only if we don't have one yet
    if (myBoard.length === 0) {
      const playerBoard = generateBingoBoard();
      setMyBoard(playerBoard);
    }
    
    // If the room is ready and we have 2+ players, show the game ready modal
    if (data.status === 'ready' && data.players && data.players.length >= 2 && !showGameReadyModal) {
      console.log('Room joined: game is ready, showing modal');
      setShowGameReadyModal(true);
    }
    
    toast.success(`Joined room ${data.roomCode}`);
    console.log('Room joined, current state:', { room: data, players: data.players, status: data.status });
  };

  const handlePlayerJoined = (data) => {
    console.log('Player joined:', data);
    setPlayers(data.players || []);
    toast.success(`${data.username} joined the room!`);
    
    // Update room state when player joins
    if (room) {
      setRoom(prev => ({ ...prev, players: data.players }));
    }
    
                     // Check if we now have 2 or more players and should show game ready
         if (data.players && data.players.length >= 2 && !showGameReadyModal) {
           console.log(`Player joined: ${data.players.length} players now, showing game ready modal`);
           setGameStatus('ready');
           setShowGameReadyModal(true);
           
           // Don't auto-start - let the host manually start the game
         }
    
    console.log(`Player joined, total players: ${data.players.length}`);
  };

  const handlePlayerLeft = (data) => {
    console.log('Player left:', data);
    setPlayers(data.players || []);
    toast.error(`${data.username} left the room`);
  };

  const handleGameStarted = (data) => {
    console.log('🎮 Game started event received:', data);
    console.log('Current state before game start:', { gameStatus, roomStatus: room?.status, showGameReadyModal, myBoardLength: myBoard.length });
    console.log('🎮 User receiving event:', user?.username, 'User ID:', user?._id);
    console.log('🎮 Event data:', data);
    
    if (!user || !user._id) {
      console.error('❌ Cannot handle game started: user not available');
      return;
    }
    
    setGameStatus('active');
    setPlayers(data.players || []);
    setShowGameReadyModal(false); // Close the modal immediately
    
    console.log('✅ Game status set to active, modal closed');
    
    // Update room state
    if (room) {
      setRoom(prev => {
        const updatedRoom = { ...prev, players: data.players, status: 'active' };
        console.log('Updated room state in handleGameStarted:', updatedRoom);
        return updatedRoom;
      });
    }
    
    toast.success('Game has started!');
    
    // Determine turn order (host goes first, then rotate through players)
    const hostPlayer = data.players.find(p => p.isHost);
    const playerIndex = data.players.findIndex(p => p.userId === user._id);
    const isFirstTurn = hostPlayer && hostPlayer.userId === user._id;
    setIsMyTurn(isFirstTurn);
    
    console.log('🎮 Turn order determined:', { 
      hostPlayer: hostPlayer?.username, 
      isFirstTurn, 
      playerIndex, 
      totalPlayers: data.players?.length 
    });
    
    // Ensure both players have boards
    if (myBoard.length === 0) {
      console.log('🃏 Generating new board for player');
      const playerBoard = generateBingoBoard();
      setMyBoard(playerBoard);
      console.log('🃏 Board generated:', playerBoard);
    } else {
      console.log('🃏 Player already has board:', myBoard);
    }
    
    console.log('🎮 Game started successfully, modal should be closed, board should be visible');
    console.log('🎮 Final state after game start:', { 
      gameStatus: 'active', 
      myBoardLength: myBoard.length, 
      isMyTurn, 
      players: data.players?.length 
    });
  };

  const handleNumberCalled = (data) => {
    console.log('Number called:', data);
    setCalledNumbers(prev => [...prev, data.number]);
    toast.success(`Number ${data.number} called by ${data.calledByUsername}!`);
  };

  const handleTurnSwitched = (data) => {
    console.log('Turn switched:', data);
    
    if (!user || !user._id) {
      console.error('❌ Cannot handle turn switched: user not available');
      return;
    }
    
    setIsMyTurn(data.nextPlayer === user._id);
    
    if (data.nextPlayer === user._id) {
      toast.success('It\'s your turn!');
    } else {
      toast.success(`It's ${data.nextPlayerUsername}'s turn`);
    }
  };

  const handleGameCompleted = (data) => {
    console.log('Game completed:', data);
    setGameStatus('completed');
    
    if (!user || !user._id) {
      console.error('❌ Cannot handle game completed: user not available');
      return;
    }
    
    const isWinner = data.winner === user._id;
    toast.success(isWinner ? '🎉 You won!' : `Game over! ${data.winnerUsername} won!`);
    
    // Update stats
    updateGameStats(isWinner, myCompletedLines);
  };

  const handleRoomUpdate = (data) => {
    console.log('Room update received:', data);
    console.log('Current room state before update:', { room: room?.status, gameStatus, players: players.length });
    
    setPlayers(data.players || []);
    setGameStatus(data.status || 'waiting');
    
    // Update room state if we have room data
    if (room) {
      setRoom(prev => {
        const updatedRoom = { ...prev, players: data.players, status: data.status };
        console.log('Updated room state:', updatedRoom);
        return updatedRoom;
      });
    }
    
    // If we have 2 or more players and status is ready, show the modal
    if (data.players && data.players.length >= 2 && data.status === 'ready' && !showGameReadyModal) {
      console.log(`Room update: showing game ready modal for ${data.players.length} players`);
      setShowGameReadyModal(true);
      
      // Don't auto-start - let the host manually start the game
    }
    
    // FALLBACK: If room status becomes 'active' but we haven't received gameStarted event
    if (data.status === 'active' && gameStatus !== 'active') {
      console.log('🔄 Room status is active but game status is not - applying fallback');
      setGameStatus('active');
      setShowGameReadyModal(false);
      
      // Generate board if needed
      if (myBoard.length === 0) {
        console.log('🃏 Generating board via room update fallback');
        const playerBoard = generateBingoBoard();
        setMyBoard(playerBoard);
      }
      
      // Determine turn order
      const hostPlayer = data.players?.find(p => p.isHost);
      const isFirstTurn = hostPlayer && hostPlayer.userId === user._id;
      setIsMyTurn(isFirstTurn);
      
      toast.success('Game started via room update!');
      console.log('✅ Game started via room update fallback');
    }
    
    console.log('Room update processed, new state:', { players: data.players, status: data.status });
  };

  const handleGameReady = (data) => {
    console.log('Game ready:', data);
    setGameStatus('ready');
    setPlayers(data.players || []);
    setShowGameReadyModal(true);
    
    // Update room state
    if (room) {
      setRoom(prev => ({ ...prev, players: data.players, status: 'ready' }));
    }
    
    // Force a re-render to show the modal
    setLoading(false);
    
    toast.success(`${data.players?.length || players.length} players joined! Ready to start the game!`);
    console.log('Game ready modal should be visible now');
    
    // Don't auto-start - let the host manually start the game
  };

  const handleError = (error) => {
    console.error('Socket error:', error);
    toast.error(error.message || 'An error occurred');
  };

  const startGame = () => {
    // Check if this is a solo game
    const isSoloGame = gameId && gameId.startsWith('solo-game-');
    
    if (isSoloGame) {
      // Solo games are already started, just close the modal if it's open
      setShowGameReadyModal(false);
      return;
    }
    
    if (!user || !user._id) {
      console.error('❌ Cannot start game: user not available');
      toast.error('Cannot start game - user not available');
      return;
    }
    
    if (socket && room) {
      console.log('🚀 Starting multiplayer game for room:', room.roomCode);
      console.log('Current room status:', room.status);
      console.log('Current game status:', gameStatus);
      console.log('Players:', players);
      console.log('Socket connected:', !!socket);
      
      // Check if user is the host
      const isHost = players.find(p => p.userId === user._id)?.isHost;
      if (!isHost) {
        toast.error('Only the host can start the game!');
        return;
      }
      
      // Close modal immediately for better UX
      setShowGameReadyModal(false);
      
      console.log('🚀 Host starting game, modal closed, emitting startGame event');
      socket.emit('startGame', { roomCode: room.roomCode });
      
      // Add fallback - if backend doesn't respond in 3 seconds, start locally
      setTimeout(() => {
        if (gameStatus !== 'active') {
          console.log('⚠️ Backend timeout, starting game locally as fallback');
          setGameStatus('active');
          if (myBoard.length === 0) {
            const playerBoard = generateBingoBoard();
            setMyBoard(playerBoard);
          }
          toast.success('Game started locally (backend timeout)');
        }
      }, 3000);
    } else {
      console.error('❌ Cannot start game:', { socket: !!socket, room: !!room });
      toast.error('Cannot start game - missing connection or room data');
    }
  };

  const handleCallNumber = (clickedNumber) => {
    // Check if this is a solo game
    const isSoloGame = gameId && gameId.startsWith('solo-game-');
    
    if (!isMyTurn || gameStatus !== 'active') {
      toast.error("It's not your turn or game not ready!");
      return;
    }
    
    if (!isSoloGame && (!socket || !room)) {
      toast.error("Game connection not available!");
      return;
    }

    // If a specific number was clicked, use that number
    let calledNumber;
    if (clickedNumber) {
      // Check if the clicked number is on the board
      const isOnBoard = myBoard.some(row => row.includes(clickedNumber));
      if (!isOnBoard) {
        toast.error('That number is not on your board!');
        return;
      }
      if (calledNumbers.includes(clickedNumber)) {
        toast.error('That number has already been called!');
        return;
      }
      calledNumber = clickedNumber;
         } else {
       // Generate a random number that hasn't been called
       const availableNumbers = [];
       for (let i = 1; i <= 25; i++) {
         if (!calledNumbers.includes(i)) {
           availableNumbers.push(i);
         }
       }
       
       if (availableNumbers.length === 0) {
         toast.error('No more numbers to call!');
         return;
       }
       
       calledNumber = availableNumbers[Math.floor(Math.random() * availableNumbers.length)];
     }
    
    // For multiplayer games, emit the number call to other players
    if (!isSoloGame && socket && room) {
      socket.emit('callNumber', {
        roomCode: room.roomCode,
        number: calledNumber
      });
    }
    
    // Update local state
        const newCalledNumbers = [...calledNumbers, calledNumber];
    setCalledNumbers(newCalledNumbers);
    
    // Update completed lines count
    const newMyCompletedLines = countCompletedLines(myBoard, newCalledNumbers);
    setMyCompletedLines(newMyCompletedLines);
    
    // Check for win condition
    if (checkWinCondition(newMyCompletedLines)) {
      if (!isSoloGame && socket && room) {
        // Emit win check for multiplayer
        socket.emit('checkWin', {
          roomCode: room.roomCode,
          board: myBoard
        });
      } else {
        // Solo game win
        toast.success('🎉 BINGO! You won!');
      setGameStatus('completed');
      updateGameStats(true, newMyCompletedLines);
      }
      return;
    }
    
    // For solo games, always keep the turn
    if (isSoloGame) {
      // Solo player keeps their turn
          return;
        }
        
    // For multiplayer games, the turn switching will be handled by the backend
    // via the handleNumberCalled event, so we don't need to switch turns here
    console.log(`Number ${calledNumber} called by ${user.username}, waiting for turn switch from backend`);
  };

  

  const countCompletedLines = (board, numbers) => {
    let completedLines = 0;
    
    // Check rows
    for (let i = 0; i < 5; i++) {
      if (board[i].every(num => numbers.includes(num))) {
        completedLines++;
      }
    }
    
    // Check columns
    for (let j = 0; j < 5; j++) {
      if (board.every(row => numbers.includes(row[j]))) {
        completedLines++;
      }
    }
    
    // Check main diagonal
    if ((numbers.includes(board[0][0])) &&
        (numbers.includes(board[1][1])) &&
        (numbers.includes(board[2][2])) &&
        (numbers.includes(board[3][3])) &&
        (numbers.includes(board[4][4]))) {
      completedLines++;
    }
    
    // Check anti-diagonal
    if ((numbers.includes(board[0][4])) &&
        (numbers.includes(board[1][3])) &&
        (numbers.includes(board[2][2])) &&
        (numbers.includes(board[3][1])) &&
        (numbers.includes(board[4][0]))) {
      completedLines++;
    }
    
    return completedLines;
  };

  const checkWinCondition = (completedLines) => {
    return completedLines >= 5;
  };

  const loadGameStats = () => {
    if (!user || !user._id) {
      console.log('⚠️ Cannot load game stats: user not available');
      return;
    }
    
    const savedStats = localStorage.getItem(`bingoStats_${user._id}`);
    if (savedStats) {
      setGameStats(JSON.parse(savedStats));
    }
  };

  const saveGameStats = (newStats) => {
    if (!user || !user._id) {
      console.log('⚠️ Cannot save game stats: user not available');
      return;
    }
    
    localStorage.setItem(`bingoStats_${user._id}`, JSON.stringify(newStats));
    setGameStats(newStats);
  };

  const updateGameStats = (isWinner, linesCompleted) => {
    if (!user || !user._id) {
      console.log('⚠️ Cannot update game stats: user not available');
      return;
    }
    
    const currentStats = gameStats;
    const newStats = {
      gamesPlayed: currentStats.gamesPlayed + 1,
      gamesWon: currentStats.gamesWon + (isWinner ? 1 : 0),
      gamesLost: currentStats.gamesLost + (isWinner ? 0 : 1),
      totalLinesCompleted: currentStats.totalLinesCompleted + linesCompleted,
      averageLinesPerGame: 0 // Will be calculated below
    };
    
    // Calculate average lines per game
    newStats.averageLinesPerGame = newStats.gamesPlayed > 0 
      ? Math.round((newStats.totalLinesCompleted / newStats.gamesPlayed) * 10) / 10 
      : 0;
    
    saveGameStats(newStats);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Check if user is available
  if (!user || !user._id) {
    return (
      <div className="text-center">
        <p className="text-white text-lg">User not available</p>
        <button onClick={() => navigate('/')} className="btn-primary mt-4">
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="text-center">
        <p className="text-white text-lg">Room not found</p>
        <button onClick={() => navigate('/')} className="btn-primary mt-4">
          Back to Dashboard
        </button>
      </div>
    );
  }

     const opponents = user && user._id ? players.filter(p => p.userId !== user._id) : [];
   const currentOpponent = opponents[0]; // Show first opponent for now
  const hasWon = checkWinCondition(myCompletedLines);
  
  // Debug logging
  console.log('GameRoom render state:', {
    room: room?.roomCode,
    roomStatus: room?.status,
    players: players.length,
    gameStatus,
    myBoard: myBoard.length,
    isMyTurn,
    connected,
    showGameReadyModal,
    shouldShowWaitingSection: !gameId?.startsWith('solo-game-') && (gameStatus === 'waiting' || gameStatus === 'starting' || gameStatus === 'ready'),
    shouldShowGameBoard: gameId?.startsWith('solo-game-') || (gameStatus !== 'waiting' && gameStatus !== 'starting' && gameStatus !== 'ready')
  });

  return (
    <div className="space-y-6">
      {/* Game Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="flex items-center space-x-2 text-white hover:text-blue-200 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back to Dashboard</span>
        </button>
        
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">Bingo Game</h1>
          <p className="text-gray-200">
             {gameId && gameId.startsWith('solo-game-') ? (
               'Solo Game'
             ) : (
               `Room: ${room.roomCode} ${opponents.length > 0 ? `vs ${opponents.map(o => o.username).join(', ')}` : '(Waiting for players)'}`
             )}
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-white">
            <Users className="h-5 w-5" />
             <span>{players.length}/4 Players</span>
          </div>
          {connected && (
            <div className="flex items-center space-x-2 text-green-400">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm">Connected</span>
            </div>
          )}
        </div>
      </div>

      {/* Game Status */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">
                  {user && user.username ? user.username.charAt(0).toUpperCase() : '?'}
                </span>
              </div>
              <span className="font-medium">{user?.username || 'Unknown User'}</span>
              {isMyTurn && gameStatus === 'active' && (
                <span className="text-green-600 font-medium">(Your Turn)</span>
              )}
            </div>
            
             {!gameId?.startsWith('solo-game-') && (
               <>
            <div className="text-gray-400">vs</div>
            
            <div className="flex items-center space-x-2">
                   {opponents.length > 0 ? (
                     <>
                       <div className="flex items-center space-x-2">
                         {opponents.map((opponent, index) => (
                           <div key={index} className="flex items-center space-x-1">
              <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">
                                 {opponent.username.charAt(0).toUpperCase()}
                </span>
              </div>
                             <span className="font-medium">{opponent.username}</span>
                           </div>
                         ))}
                       </div>
              {!isMyTurn && gameStatus === 'active' && (
                <span className="text-yellow-600 font-medium">(Opponent's Turn)</span>
                       )}
                     </>
                   ) : (
                     <span className="text-gray-500">Waiting for players...</span>
              )}
            </div>
               </>
             )}
          </div>
          
                     <div className="flex items-center space-x-4">
             <div className="text-center">
               <div className="text-2xl font-bold text-blue-600">{myCompletedLines}/5</div>
               <div className="text-sm text-gray-600">Lines</div>
             </div>
             <div className="text-center">
               <div className="text-2xl font-bold text-red-600">
                 {gameId?.startsWith('solo-game-') ? 'Solo' : (opponents.length > 0 ? `${opponents.length} Opponents` : '0')}
               </div>
               <div className="text-sm text-gray-600">Mode</div>
             </div>
           </div>
        </div>
      </div>

                  {/* Game Content */}
      {!gameId?.startsWith('solo-game-') && (gameStatus === 'waiting' || gameStatus === 'starting' || gameStatus === 'ready') ? (
        <div className="card text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Waiting for Players</h2>
          <p className="text-gray-600 mb-4">
            Share this room code with a friend: <span className="font-bold text-blue-600">{room.roomCode}</span>
          </p>
                     <p className="text-gray-500 mb-4">
             {players.length === 1 ? 'Waiting for 1 more player...' : 
              gameStatus === 'ready' ? `${players.length} players joined! Click Start Game below!` : 'Ready to start!'}
            </p>
          <div className="flex justify-center space-x-4">
            {players.map((player, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">
                    {player.username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-sm">{player.username}</span>
                {player.isHost && <span className="text-xs text-yellow-600">👑</span>}
              </div>
            ))}
          </div>
                     {gameStatus === 'ready' && (
             <div className="mt-6">
               {players.find(p => p.userId === user._id)?.isHost ? (
                 <button
                   onClick={() => {
                     setShowGameReadyModal(false);
                     startGame();
                   }}
                   className="btn-primary text-lg px-8 py-3"
                 >
                   Start Game!
                 </button>
               ) : (
                 <div className="space-y-2">
                   <p className="text-gray-600">Waiting for host to start the game...</p>
                   <div className="space-x-2">
                     <button
                       onClick={() => {
                         console.log('🔄 Non-host player manually joining game');
                         
                         // Generate board FIRST
                         if (myBoard.length === 0) {
                           console.log('🔄 Generating board for manual join');
                           const playerBoard = generateBingoBoard();
                           setMyBoard(playerBoard);
                           console.log('🔄 Board generated for manual join:', playerBoard);
                         }
                         
                         // Update game state
                         setGameStatus('active');
                         setShowGameReadyModal(false);
                         setIsMyTurn(false);
                         
                         console.log('🔄 Game state updated for manual join:', { gameStatus: 'active', myBoardLength: myBoard.length, isMyTurn: false });
                         
                         toast.success('Joined game manually!');
                       }}
                       className="btn-secondary text-lg px-6 py-3"
                     >
                       Join Game Now
                     </button>
                     
                     <button
                       onClick={() => {
                         console.log('🔄 Non-host player force starting game');
                         
                         // Force immediate start
                         if (myBoard.length === 0) {
                           const playerBoard = generateBingoBoard();
                           setMyBoard(playerBoard);
                         }
                         
                         setGameStatus('active');
                         setShowGameReadyModal(false);
                         setIsMyTurn(false);
                         
                         toast.success('Game force started!');
                       }}
                       className="btn-primary text-lg px-6 py-3"
                     >
                       Force Start Game
                     </button>
                   </div>
                 </div>
               )}
             </div>
           )}
        </div>
      ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Debug Info */}
          <div className="col-span-full mb-4">
            <div className="card text-center">
              <p className="text-sm text-gray-600">
                🎮 Game Board Rendering | Status: {gameStatus} | Board: {myBoard.length > 0 ? 'Ready' : 'Not Ready'} | Players: {players.length}
              </p>
              <div className="mt-2 space-x-2">
                <button 
                  onClick={() => {
                    console.log('🧪 Test button clicked');
                    const testBoard = generateBingoBoard();
                    setMyBoard(testBoard);
                    setGameStatus('active');
                    toast.success('Test board generated!');
                  }}
                  className="px-3 py-1 bg-yellow-500 text-white rounded text-sm"
                >
                  🧪 Test Board
                </button>
                <button 
                  onClick={() => {
                    console.log('🧪 Force start clicked');
                    setGameStatus('active');
                    toast.success('Game forced to active!');
                  }}
                  className="px-3 py-1 bg-green-500 text-white rounded text-sm"
                >
                  🧪 Force Start
                </button>
              </div>
              
              {/* Enhanced Debug Info */}
              <div className="mt-4 p-3 bg-gray-100 rounded text-left">
                <h4 className="font-bold text-sm mb-2">🔍 Debug State:</h4>
                <div className="text-xs space-y-1">
                  <div>Game Status: <span className="font-mono bg-blue-100 px-1 rounded">{gameStatus}</span></div>
                  <div>Room Status: <span className="font-mono bg-blue-100 px-1 rounded">{room?.status || 'N/A'}</span></div>
                  <div>My Board: <span className="font-mono bg-blue-100 px-1 rounded">{myBoard.length} cells</span></div>
                  <div>Show Modal: <span className="font-mono bg-blue-100 px-1 rounded">{showGameReadyModal ? 'Yes' : 'No'}</span></div>
                  <div>Is My Turn: <span className="font-mono bg-blue-100 px-1 rounded">{isMyTurn ? 'Yes' : 'No'}</span></div>
                  <div>Players: <span className="font-mono bg-blue-100 px-1 rounded">{players.length}</span></div>
                  <div>User ID: <span className="font-mono bg-blue-100 px-1 rounded">{user?._id?.substring(0, 8)}...</span></div>
                  <div>Is Host: <span className="font-mono bg-blue-100 px-1 rounded">{players.find(p => p.userId === user._id)?.isHost ? 'Yes' : 'No'}</span></div>
                </div>
              </div>
            </div>
          </div>
          
          {/* My Board */}
          <div className="lg:col-span-2">
           <div className="card">
             <h2 className="text-xl font-bold text-gray-900 mb-4">Your Board</h2>
                           <BingoBoard 
                board={myBoard} 
                calledNumbers={calledNumbers}
                isInteractive={isMyTurn && gameStatus === 'active'}
                onCallNumber={handleCallNumber}
                isWinner={hasWon}
                completedLines={myCompletedLines}
              />
             
                           {/* Call Number Button */}
              {isMyTurn && gameStatus === 'active' && (
                <div className="mt-6 text-center">
                  <button
                    onClick={() => handleCallNumber()}
                    className="btn-secondary text-lg px-8 py-3"
                  >
                    Call Random Number
                  </button>
                  <p className="text-sm text-gray-600 mt-2">
                    Or click on numbers on your board above
                  </p>
                </div>
              )}
           </div>
         </div>

        {/* Game Info */}
        <div className="space-y-6">
          {/* Called Numbers */}
          <CalledNumbers numbers={calledNumbers} />
          
          {/* Game Chat */}
          <GameChat gameId={gameId} />
        </div>
      </div>
      )}

      {/* Game Ready Modal */}
      {showGameReadyModal && gameStatus !== 'active' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 text-center max-w-md mx-4">
            <div className="text-6xl mb-4">🎮</div>
                         <h2 className="text-2xl font-bold text-gray-900 mb-2">Game Ready!</h2>
             <p className="text-gray-600 mb-4">{players.length} players have joined the room!</p>
            <div className="mb-6">
              <p className="text-sm text-gray-500 mb-2">Players:</p>
              <div className="flex justify-center space-x-4">
                {players.map((player, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">
                        {player.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-sm">{player.username}</span>
                    {player.isHost && <span className="text-xs text-yellow-600">👑</span>}
                  </div>
                ))}
              </div>
            </div>
            {players.find(p => p.userId === user._id)?.isHost ? (
              <button
                onClick={() => {
                  setShowGameReadyModal(false);
                  startGame();
                }}
                className="btn-primary text-lg px-8 py-3"
              >
                Start Game!
              </button>
            ) : (
              <p className="text-gray-600">Waiting for host to start the game...</p>
            )}
          </div>
        </div>
      )}

      {/* Win Alert */}
      {hasWon && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 text-center max-w-md mx-4">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">BINGO!</h2>
            <p className="text-gray-600 mb-6">Congratulations! You won the game!</p>
            <button
              onClick={() => navigate('/')}
              className="btn-primary"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      )}


    </div>
  );
};

export default GameRoom;
