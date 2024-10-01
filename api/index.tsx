import { Button, Frog } from 'frog'
import { handle } from 'frog/vercel'
import { init } from '@airstack/node'
import { neynar } from 'frog/middlewares'

// Initialize Airstack Client
init(process.env.AIRSTACK_API_KEY || '')

export const app = new Frog({
  basePath: '/api',
  imageOptions: { width: 1080, height: 1080 },
  imageAspectRatio: '1:1',
  title: 'TicTacToe',
  hub: {
    apiUrl: "https://hubs.airstack.xyz",
    fetchOptions: {
      headers: {
        "x-airstack-hubs": process.env.AIRSTACK_API_KEY || '',
      } as HeadersInit
    }
  }
}).use(
  neynar({
    apiKey: process.env.NEYNAR_API_KEY || '',
    features: ['interactor', 'cast'],
  })
)

const COORDINATES = ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3']

type GameState = {
  board: (string | null)[];
  currentPlayer: 'X' | 'O';
  userProfile?: {
    dappName: string;
    userId: string;
    profileName: string;
    profileImage: string;
  };
}

async function getUserProfileDetails(userId: string) {
  const query = `
    query GetUserProfileDetails {
      Socials(input: {filter: {userId: {_eq: "${userId}"}}, blockchain: ethereum}) {
        Social {
          dappName
          userId
          profileName
          profileImage
        }
      }
    }
  `

  try {
    const response = await fetch('https://api.airstack.xyz/gql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': process.env.AIRSTACK_API_KEY || '' },
      body: JSON.stringify({ query })
    })
    const data = await response.json()
    return data.data.Socials.Social[0]
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return null
  }
}

app.frame('/', async (c) => {
  const { buttonValue, status, frameData } = c
  let state: GameState
  
  if (buttonValue && buttonValue.startsWith('move:')) {
    state = decodeState(buttonValue.split(':')[1])
  } else {
    state = { board: Array(9).fill(null), currentPlayer: 'X' }
  }
  
  let { board, currentPlayer, userProfile } = state
  let message = "Make a move!"

  // Fetch user profile if not already present
  if (!userProfile && frameData?.fid) {
    userProfile = await getUserProfileDetails(frameData.fid.toString())
    state.userProfile = userProfile
  }

  if (status === 'response' && buttonValue) {
    if (buttonValue === 'newgame') {
      board = Array(9).fill(null)
      currentPlayer = 'X'
      message = "New game started! X's turn"
    } else if (buttonValue.startsWith('move:')) {
      // Player's move
      const availableMoves = board.map((cell, index) => cell === null ? index : -1).filter(index => index !== -1)
      if (availableMoves.length > 0) {
        const move = availableMoves[Math.floor(Math.random() * availableMoves.length)]
        board[move] = currentPlayer
        message = `Move made at ${COORDINATES[move]}.`
        
        if (checkWin(board)) {
          message = `${currentPlayer} wins! Start a new game!`
        } else if (board.every((cell: string | null) => cell !== null)) {
          message = "Game over! It's a draw. Start a new game!"
        } else {
          currentPlayer = currentPlayer === 'X' ? 'O' : 'X'
          
          // Computer's move
          const computerMove = getBestMove(board, currentPlayer)
          if (computerMove !== -1) {
            board[computerMove] = currentPlayer
            message += ` Computer moved at ${COORDINATES[computerMove]}.`
            
            if (checkWin(board)) {
              message += ` ${currentPlayer} wins! Start a new game!`
            } else if (board.every((cell: string | null) => cell !== null)) {
              message += " It's a draw. Start a new game!"
            } else {
              currentPlayer = currentPlayer === 'X' ? 'O' : 'X'
              message += ` ${currentPlayer}'s turn.`
            }
          }
        }
      }
    }
  }

  // Encode the state in the button values
  const encodedState = encodeState({ board, currentPlayer, userProfile })

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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {userProfile && (
            <div style={{ marginBottom: '20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <img src={userProfile.profileImage} alt="Profile" style={{ width: '100px', height: '100px', borderRadius: '50%' }} />
              <p>Welcome, {userProfile.profileName || userProfile.userId}!</p>
            </div>
          )}
          {renderBoard(board)}
          <div style={{ marginTop: '40px', maxWidth: '900px', textAlign: 'center' }}>{message}</div>
        </div>
      </div>
    ),
    intents: [
      <Button value={`move:${encodedState}`}>Make Move</Button>,
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

//idkkkkk