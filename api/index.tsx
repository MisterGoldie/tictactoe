import { Button, Frog } from 'frog'
import { handle } from 'frog/vercel'
import { neynar } from 'frog/middlewares'

export const app = new Frog({
  basePath: '/api',
  imageOptions: { width: 1080, height: 1080 },
  imageAspectRatio: '1:1',
  title: 'TicTacToe',
})

const COORDINATES = ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3']

type GameState = {
  board: (string | null)[];
  currentPlayer: 'X' | 'O';
}

app.frame('/', (c) => {
  let state: GameState
  let message = "Computer starts. Your move (O)!"
  let debugInfo = "Debug Info:\n"

  try {
    debugInfo += `Button Value: ${c.buttonValue}\n`
    debugInfo += `Status: ${c.status}\n`

    if (c.buttonValue && c.buttonValue !== 'newgame') {
      state = JSON.parse(decodeURIComponent(c.buttonValue))
      debugInfo += `Parsed State: ${JSON.stringify(state)}\n`
    } else {
      state = { board: Array(9).fill(null), currentPlayer: 'X' }
      debugInfo += "New game started\n"
    }

    let { board, currentPlayer } = state

    if (c.status === 'response' && c.buttonValue) {
      if (c.buttonValue === 'newgame') {
        board = Array(9).fill(null)
        currentPlayer = 'X'
        message = "New game started! Computer's turn (X)"
        
        // Computer's first move
        const computerMove = getBestMove(board, currentPlayer)
        board[computerMove] = currentPlayer
        message = `Computer moved at ${COORDINATES[computerMove]}. Your turn (O)!`
        currentPlayer = 'O'
      } else {
        const moveIndex = parseInt(c.buttonValue)
        if (!isNaN(moveIndex) && board[moveIndex] === null && currentPlayer === 'O') {
          // User's move
          board[moveIndex] = currentPlayer
          message = `You moved at ${COORDINATES[moveIndex]}.`
          
          if (checkWin(board)) {
            message = `You win! Start a new game!`
          } else if (board.every((cell) => cell !== null)) {
            message = "Game over! It's a draw. Start a new game!"
          } else {
            currentPlayer = 'X'
            
            // Computer's move
            const computerMove = getBestMove(board, currentPlayer)
            if (computerMove !== -1) {
              board[computerMove] = currentPlayer
              message += ` Computer moved at ${COORDINATES[computerMove]}.`
              
              if (checkWin(board)) {
                message += ` Computer wins! Start a new game!`
              } else if (board.every((cell) => cell !== null)) {
                message += " It's a draw. Start a new game!"
              } else {
                currentPlayer = 'O'
                message += ` Your turn (O).`
              }
            }
          }
        } else if (currentPlayer === 'X') {
          message = "It's the computer's turn. Please wait."
        } else {
          message = "Invalid move. Try again."
        }
      }
    }

    state = { board, currentPlayer }
    debugInfo += `Final State: ${JSON.stringify(state)}\n`

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
          fontSize: '36px',
          fontFamily: 'Arial, sans-serif',
        }}>
          {renderBoard(board)}
          <div style={{ marginTop: '40px', maxWidth: '900px', textAlign: 'center' }}>{message}</div>
          <div style={{ marginTop: '20px', maxWidth: '900px', textAlign: 'left', whiteSpace: 'pre-wrap', fontSize: '12px' }}>{debugInfo}</div>
        </div>
      ),
      intents: [
        ...board.map((cell, index) => 
          cell === null ? <Button value={encodeURIComponent(JSON.stringify({ ...state, lastMove: index }))}>{COORDINATES[index]}</Button> : null
        ).filter(Boolean),
        <Button value="newgame">New Game</Button>,
      ],
    })
  } catch (error) {
    console.error('Error in frame:', error)
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
          fontSize: '36px',
          fontFamily: 'Arial, sans-serif',
        }}>
          <div>An error occurred. Please try again.</div>
          <div style={{ marginTop: '20px', fontSize: '12px' }}>{String(error)}</div>
          <div style={{ marginTop: '20px', maxWidth: '900px', textAlign: 'left', whiteSpace: 'pre-wrap', fontSize: '12px' }}>{debugInfo}</div>
        </div>
      ),
      intents: [
        <Button value="newgame">New Game</Button>,
      ],
    })
  }
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


//code that works without user picking the spots they want
