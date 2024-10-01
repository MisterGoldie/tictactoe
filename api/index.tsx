import { Button, Frog } from 'frog'
import { handle } from 'frog/vercel'
import { neynar } from 'frog/middlewares';


const AIRSTACK_API_KEY = process.env.AIRSTACK_API_KEY || '';
const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY || '';
const MOXIE_API_URL = "https://api.studio.thegraph.com/query/23537/moxie_protocol_stats_mainnet/version/latest";


export const app = new Frog({
  basePath: '/api',
  imageOptions: { width: 1200, height: 628 },
  title: '$HAM Token Tracker',
  hub: {
    apiUrl: "https://hubs.airstack.xyz",
    fetchOptions: {
      headers: {
        "x-airstack-hubs": AIRSTACK_API_KEY, 
      }
    }
  }
}).use(
  neynar({
    apiKey: 'NEYNAR_FROG_FM',
    features: ['interactor', 'cast'],
  })
);



const COORDINATES = ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3']

type GameState = {
  board: (string | null)[];
  isGameOver: boolean;
  moveCount: number;
}

app.frame('/', (c) => {
  const { buttonValue } = c
  let state: GameState
  let message = "Click on a square to start the game!"
  let debugInfo = "Debug Info:\n"

  // Reconstruct state from compact representation
  if (buttonValue && buttonValue !== 'newgame') {
    const [moves, count] = buttonValue.split('|')
    state = {
      board: Array(9).fill(null),
      isGameOver: false,
      moveCount: parseInt(count) || 0
    }
    for (let i = 0; i < moves.length; i++) {
      const index = parseInt(moves[i])
      if (!isNaN(index) && index >= 0 && index < 9) {
        state.board[index] = i % 2 === 0 ? 'X' : 'O'
      }
    }
  } else {
    state = { board: Array(9).fill(null), isGameOver: false, moveCount: 0 }
  }

  debugInfo += `Initial State: ${JSON.stringify(state)}\n`

  if (buttonValue === 'newgame') {
    state = { board: Array(9).fill(null), isGameOver: false, moveCount: 0 }
    message = "Click on a square to start the game!"
    debugInfo += "New game started\n"
  } else if (!state.isGameOver && buttonValue) {
    const playerMove = parseInt(buttonValue.split('|')[0])
    if (!isNaN(playerMove) && state.board[playerMove] === null) {
      state.board[playerMove] = 'X'
      state.moveCount++
      message = `You moved at ${COORDINATES[playerMove]}.`
      debugInfo += `Player moved at ${COORDINATES[playerMove]}\n`
      
      if (checkWin(state.board)) {
        message = `You win! Click 'New Game' to play again.`
        state.isGameOver = true
        debugInfo += "Player wins\n"
      } else if (state.board.every((cell) => cell !== null)) {
        message = "It's a draw! Click 'New Game' to play again."
        state.isGameOver = true
        debugInfo += "Game is a draw\n"
      } else {
        // Computer's move
        const computerMove = getBestMove(state.board, 'O')
        debugInfo += `Computer attempting move at ${COORDINATES[computerMove]}\n`
        if (computerMove !== -1 && state.board[computerMove] === null) {
          state.board[computerMove] = 'O'
          state.moveCount++
          message += ` Computer moved at ${COORDINATES[computerMove]}.`
          debugInfo += `Computer successfully moved at ${COORDINATES[computerMove]}\n`
          
          if (checkWin(state.board)) {
            message += ` Computer wins! Click 'New Game' to play again.`
            state.isGameOver = true
            debugInfo += "Computer wins\n"
          } else if (state.board.every((cell) => cell !== null)) {
            message += " It's a draw! Click 'New Game' to play again."
            state.isGameOver = true
            debugInfo += "Game is a draw\n"
          } else {
            message += " Your turn!"
          }
        } else {
          debugInfo += `Error: Invalid computer move ${computerMove}\n`
        }
      }
    }
  }

  debugInfo += `Final State: ${JSON.stringify(state)}\n`

  // Create compact state representation
  const compactState = state.board.reduce((acc, cell, index) => 
    cell ? acc + index.toString() : acc, '') + '|' + state.moveCount

  return c.res({
    image: (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '1080px',
        height: '1080px',
        backgroundColor: 'white',
        color: 'black',
        fontSize: '24px',
        fontFamily: 'Arial, sans-serif',
      }}>
        {renderBoard(state.board)}
        <div style={{ marginTop: '20px', maxWidth: '900px', textAlign: 'center' }}>{message}</div>
        <div style={{ marginTop: '20px', maxWidth: '900px', textAlign: 'left', whiteSpace: 'pre-wrap', fontSize: '12px' }}>{debugInfo}</div>
      </div>
    ),
    intents: [
      ...(!state.isGameOver ? state.board.map((cell, index) => 
        cell === null ? <Button value={`${compactState}${index}`}>{COORDINATES[index]}</Button> : null
      ).filter(Boolean) : []),
      <Button value="newgame">New Game</Button>,
    ],
  })
})

function getBestMove(board: (string | null)[], player: string): number {
  const opponent = player === 'X' ? 'O' : 'X'

  // Check for winning move
  for (let i = 0; i < 9; i++) {
    if (board[i] === null) {
      board[i] = player
      if (checkWin(board)) {
        board[i] = null
        return i
      }
      board[i] = null
    }
  }

  // Check for blocking opponent's winning move
  for (let i = 0; i < 9; i++) {
    if (board[i] === null) {
      board[i] = opponent
      if (checkWin(board)) {
        board[i] = null
        return i
      }
      board[i] = null
    }
  }

  // Choose center if available
  if (board[4] === null) return 4

  // Choose corners
  const corners = [0, 2, 6, 8]
  const availableCorners = corners.filter(i => board[i] === null)
  if (availableCorners.length > 0) {
    return availableCorners[Math.floor(Math.random() * availableCorners.length)]
  }

  // Choose any available side
  const sides = [1, 3, 5, 7]
  const availableSides = sides.filter(i => board[i] === null)
  if (availableSides.length > 0) {
    return availableSides[Math.floor(Math.random() * availableSides.length)]
  }

  return -1 // No move available
}

function renderBoard(board: (string | null)[]) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
    }}>
      {[0, 1, 2].map(row => (
        <div key={row} style={{ display: 'flex', gap: '20px' }}>
          {[0, 1, 2].map(col => {
            const index = row * 3 + col;
            return (
              <div key={index} style={{
                width: '200px',
                height: '200px',
                border: '4px solid black',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '120px',
              }}>
                {board[index]}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  )
}

function checkWin(board: (string | null)[]) {
  const winPatterns = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
    [0, 4, 8], [2, 4, 6] // Diagonals
  ]

  return winPatterns.some(pattern =>
    board[pattern[0]] &&
    board[pattern[0]] === board[pattern[1]] &&
    board[pattern[0]] === board[pattern[2]]
  )
}

export const GET = handle(app)
export const POST = handle(app)