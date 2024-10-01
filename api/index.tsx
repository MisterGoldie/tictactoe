import { Button, Frog } from 'frog'
import { handle } from 'frog/vercel'

export const app = new Frog({
  basePath: '/api',
  title: 'Tic-Tac-Toe Frame',
  imageOptions: {
    width: 1080,
    height: 1080,
  },
  imageAspectRatio: '1:1',
})

const COORDINATES = ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3']

type GameState = {
  board: (string | null)[];
  isGameOver: boolean;
  moveCount: number;
  lastButtonValue: string | null;
}

app.frame('/', (c) => {
  const { buttonValue, status } = c
  let state: GameState
  let message = "Click 'New Game' to start!"
  let debugInfo = "Debug Info:\n"

  debugInfo += `Button Value: ${buttonValue}\n`
  debugInfo += `Status: ${status}\n`

  // Parse the previous state from the button value
  if (buttonValue && buttonValue !== 'newgame') {
    const parts = buttonValue.split('|')
    const prevStateStr = parts[1]  // We only need the second part
    if (prevStateStr) {
      state = JSON.parse(prevStateStr)
      debugInfo += `Parsed State: ${JSON.stringify(state)}\n`
    } else {
      state = { board: Array(9).fill(null), isGameOver: false, moveCount: 0, lastButtonValue: null }
    }
  } else {
    state = { board: Array(9).fill(null), isGameOver: false, moveCount: 0, lastButtonValue: null }
  }

  if (buttonValue === 'newgame' || state.moveCount === 0) {
    state = { board: Array(9).fill(null), isGameOver: false, moveCount: 1, lastButtonValue: null }
    const computerMove = getBestMove(state.board, 'X')
    state.board[computerMove] = 'X'
    message = `Computer moved at ${COORDINATES[computerMove]}. Your turn!`
    debugInfo += `New game started, Computer moved at ${COORDINATES[computerMove]}\n`
  } else if (buttonValue && buttonValue !== 'newgame' && buttonValue !== state.lastButtonValue && !state.isGameOver) {
    const move = parseInt(buttonValue.split('|')[0])
    if (!isNaN(move) && state.board[move] === null) {
      state.board[move] = 'O'
      state.moveCount++
      message = `You moved at ${COORDINATES[move]}.`
      debugInfo += `Player moved at ${COORDINATES[move]}\n`
      
      if (checkWin(state.board)) {
        message = `You win! Click 'New Game' to play again.`
        state.isGameOver = true
        debugInfo += "Player wins\n"
      } else if (state.board.every((cell) => cell !== null)) {
        message = "It's a draw! Click 'New Game' to play again."
        state.isGameOver = true
        debugInfo += "Game is a draw\n"
      } else {
        const computerMove = getBestMove(state.board, 'X')
        state.board[computerMove] = 'X'
        state.moveCount++
        message += ` Computer moved at ${COORDINATES[computerMove]}.`
        debugInfo += `Computer moved at ${COORDINATES[computerMove]}\n`
        
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
      }
    }
  }

  state.lastButtonValue = buttonValue || null

  debugInfo += `Current State: ${JSON.stringify(state)}\n`
  debugInfo += `Move Count: ${state.moveCount}\n`

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
        <div style={{ marginTop: '20px', maxWidth: '900px', textAlign: 'left', whiteSpace: 'pre-wrap' }}>{debugInfo}</div>
      </div>
    ),
    intents: [
      ...(!state.isGameOver ? state.board.map((cell, index) => 
        cell === null ? <Button value={`${index}|${JSON.stringify(state)}`}>{COORDINATES[index]}</Button> : null
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