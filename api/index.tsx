import { Button, Frog } from 'frog'
import { handle } from 'frog/vercel'

// RapidAPI configuration
const rapidApiKey = process.env.RAPID_API_KEY
const rapidApiHost = 'stujo-tic-tac-toe-stujo-v1.p.rapidapi.com'

export const app = new Frog({
  basePath: '/api',
  title: 'Tic-Tac-Toe Frame',
})

const COORDINATES = ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3']

type GameState = {
  board: (string | null)[];
  currentPlayer: 'X' | 'O';
}

app.frame('/', (c) => {
  const { buttonValue, status } = c
  const previousState = c.previousState as GameState | undefined
  let board = previousState?.board || Array(9).fill(null)
  let currentPlayer = previousState?.currentPlayer || 'X'
  let message = "New game started! X's turn"

  if (status === 'response' && buttonValue === 'newgame') {
    board = Array(9).fill(null)
    currentPlayer = 'X'
    message = "New game started! X's turn"
    return renderFrame(c, board, currentPlayer, message)
  } else if (status === 'response' && buttonValue === 'move') {
    const boardState = board.map((cell: string | null) => cell || '-').join('')
    const player = currentPlayer.toLowerCase()

    fetch(`https://${rapidApiHost}/${boardState}/${player}`, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': rapidApiKey || '',
        'x-rapidapi-host': rapidApiHost,
      },
    })
      .then(response => response.json())
      .then(data => {
        const move = data.recommendation

        if (move !== undefined) {
          board[move] = currentPlayer
          message = `Move made at ${COORDINATES[move]}.`
          
          if (checkWin(board)) {
            message = `${currentPlayer} wins! Start a new game!`
          } else if (board.every((cell: string | null) => cell !== null)) {
            message = "Game over! It's a draw. Start a new game!"
          } else {
            currentPlayer = currentPlayer === 'X' ? 'O' : 'X'
            message += ` ${currentPlayer}'s turn.`
          }
        } else {
          message = "Game over! It's a draw. Start a new game!"
        }

        renderFrame(c, board, currentPlayer, message)
      })
      .catch(error => {
        console.error('Error making API request:', error)
        message = "Error making move. Try again!"
        renderFrame(c, board, currentPlayer, message)
      })

    return // Return here to prevent immediate frame rendering
  }

  return renderFrame(c, board, currentPlayer, message)
})

function renderFrame(c: any, board: (string | null)[], currentPlayer: 'X' | 'O', message: string) {
  return c.res({
    image: (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        width: '100%',
        backgroundColor: 'white',
        color: 'black',
        fontSize: '24px',
        fontFamily: 'Arial, sans-serif',
      }}>
        {renderBoard(board)}
        <div style={{ marginTop: '20px' }}>{message}</div>
      </div>
    ),
    intents: [
      <Button value="move">Make Move</Button>,
      <Button value="newgame">New Game</Button>,
    ],
    state: { board, currentPlayer }
  })
}

function renderBoard(board: (string | null)[]) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '10px',
      fontSize: '48px'
    }}>
      {board.map((cell, index) => (
        <div key={index} style={{
          width: '80px',
          height: '80px',
          border: '2px solid black',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {cell}
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