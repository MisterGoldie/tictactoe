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
  currentPlayer: 'X' | 'O';
}

app.frame('/', (c) => {
  const { buttonValue, status } = c
  let state: GameState
  
  if (buttonValue && buttonValue.startsWith('move:')) {
    state = decodeState(buttonValue.split(':')[1])
  } else {
    state = { board: Array(9).fill(null), currentPlayer: 'X' }
  }
  
  let { board, currentPlayer } = state
  let message = "Your turn! Choose a spot."

  if (status === 'response' && buttonValue) {
    if (buttonValue === 'newgame') {
      board = Array(9).fill(null)
      currentPlayer = 'X'
      message = "New game started! Your turn."
    } else if (buttonValue.startsWith('move:')) {
      const move = parseInt(buttonValue.split(':')[2])
      if (board[move] === null) {
        // User's move
        board[move] = 'X'
        message = `You moved at ${COORDINATES[move]}.`
        
        if (checkWin(board)) {
          message = "You win! Start a new game!"
        } else if (board.every((cell: string | null) => cell !== null)) {
          message = "Game over! It's a draw. Start a new game!"
        } else {
          // Computer's move
          const computerMove = getBestMove(board, 'O')
          if (computerMove !== -1) {
            board[computerMove] = 'O'
            message += ` Computer moved at ${COORDINATES[computerMove]}.`
            
            if (checkWin(board)) {
              message = "Computer wins! Start a new game!"
            } else if (board.every((cell: string | null) => cell !== null)) {
              message = "Game over! It's a draw. Start a new game!"
            } else {
              message += " Your turn!"
            }
          }
        }
      } else {
        message = "That spot is already taken! Choose another."
      }
    }
  }

  // Encode the state in the button values
  const encodedState = encodeState({ board, currentPlayer })

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
      </div>
    ),
    intents: [
      ...board.map((cell, index) => 
        cell === null ? (
          [
            <Button value={`move:${encodedState}:${index}`}>
              {COORDINATES[index]}
            </Button>
          ]
        ) : (
          [<div>{COORDINATES[index]}</div>]
        )
      ).flat(),
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

function encodeState(state: GameState): string {
  return Buffer.from(JSON.stringify(state)).toString('base64')
}

function decodeState(encodedState: string): GameState {
  return JSON.parse(Buffer.from(encodedState, 'base64').toString())
}

export const GET = handle(app)
export const POST = handle(app)