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

app.frame('/', async (c) => {
  const { buttonValue, status } = c
  let state: GameState
  
  if (buttonValue && buttonValue.startsWith('move:')) {
    state = decodeState(buttonValue.split(':')[1])
  } else {
    state = { board: Array(9).fill(null), currentPlayer: 'X' }
  }
  
  let { board, currentPlayer } = state
  let message = "Make a move!"

  if (status === 'response' && buttonValue) {
    if (buttonValue === 'newgame') {
      board = Array(9).fill(null)
      currentPlayer = 'X'
      message = "New game started! X's turn"
    } else if (buttonValue.startsWith('move:')) {
      const boardState = board.map((cell: string | null) => cell || '-').join('')
      const player = currentPlayer.toLowerCase()

      try {
        const apiUrl = `https://${rapidApiHost}/${boardState}/${player}`
        console.log('Attempting API call to:', apiUrl) // Log the full URL

        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'x-rapidapi-key': rapidApiKey || '',
            'x-rapidapi-host': rapidApiHost,
          },
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new TypeError("Oops, we haven't got JSON!");
        }

        const text = await response.text();
        console.log("API Response:", text);

        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          console.error("Failed to parse JSON:", e);
          throw new Error("Invalid JSON response from API");
        }

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
      } catch (error: unknown) {
        console.error('Error making API request:', error)
        if (error instanceof Error) {
          message = `Error: ${error.message}. Try again or start a new game.`
        } else {
          message = "An unknown error occurred. Try again or start a new game."
        }
        // Fallback: Make a random move
        const availableMoves = board.map((cell, index) => cell === null ? index : -1).filter(index => index !== -1)
        if (availableMoves.length > 0) {
          const randomMove = availableMoves[Math.floor(Math.random() * availableMoves.length)]
          board[randomMove] = currentPlayer
          message += ` Random move made at ${COORDINATES[randomMove]}.`
          currentPlayer = currentPlayer === 'X' ? 'O' : 'X'
        }
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
      <Button value={`move:${encodedState}`}>Make Move</Button>,
      <Button value="newgame">New Game</Button>,
    ],
  })
})

function renderBoard(board: (string | null)[]) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
    }}>
      {[0, 1, 2].map(row => (
        <div key={row} style={{ display: 'flex', gap: '10px' }}>
          {[0, 1, 2].map(col => {
            const index = row * 3 + col;
            return (
              <div key={index} style={{
                width: '80px',
                height: '80px',
                border: '2px solid black',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '48px',
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