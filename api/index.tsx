/** @jsxImportSource frog/jsx */

import { Button, Frog } from 'frog'
import { handle } from 'frog/vercel'
import { neynar } from 'frog/middlewares'
import { NeynarVariables } from 'frog/middlewares'

const AIRSTACK_API_URL = 'https://api.airstack.xyz/gql';
const AIRSTACK_API_KEY = process.env.AIRSTACK_API_KEY as string;
const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY as string;

export const app = new Frog<{ Variables: NeynarVariables }>({
  basePath: '/api',
  imageOptions: { width: 1080, height: 1080 },
  imageAspectRatio: '1:1',
  title: 'Tic-Tac-Toe Game',
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
    apiKey: NEYNAR_API_KEY, 
    features: ['interactor', 'cast'],
  })
);

const COORDINATES = ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3']

type GameState = {
  board: (string | null)[];
  currentPlayer: 'O' | 'X';
  isGameOver: boolean;
}

async function getUsername(fid: string): Promise<string> {
  const query = `
    query ($fid: String!) {
      Socials(input: {filter: {dappName: {_eq: farcaster}, userId: {_eq: $fid}}, blockchain: ethereum}) {
        Social {
          profileName
        }
      }
    }
  `;

  try {
    const response = await fetch(AIRSTACK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': AIRSTACK_API_KEY,
      },
      body: JSON.stringify({ query, variables: { fid } }),
    });

    const data = await response.json();
    console.log('Full API response:', JSON.stringify(data));
    
    if (data && data.data && data.data.Socials && Array.isArray(data.data.Socials.Social) && data.data.Socials.Social.length > 0) {
      return data.data.Socials.Social[0]?.profileName || 'Player';
    } else {
      console.log('Unexpected API response structure:', JSON.stringify(data));
      return 'Player';
    }
  } catch (error) {
    console.error('Error fetching username:', error);
    return 'Player';
  }
}

function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// New initial route
// Initial route
app.frame('/', () => {
  const gifUrl = 'https://bafybeidq2sujueacxrzx6v4ueciceegs6xommrgoranzqqmaio7k6hlzyy.ipfs.w3s.link/ezgif.com-animated-gif-maker%201.gif'
  const baseUrl = 'https://tictactoe-nine-xi.vercel.app' // Update this to your actual domain

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Tic-Tac-Toe Game</title>
      <meta property="fc:frame" content="vNext">
      <meta property="fc:frame:image" content="${gifUrl}">
      <meta property="fc:frame:image:aspect_ratio" content="1:1">
      <meta property="fc:frame:button:1" content="How to Play">
      <meta property="fc:frame:button:1:action" content="post">
      <meta property="fc:frame:post_url" content="${baseUrl}/api/howtoplay">
    </head>
    <body>
    </body>
    </html>
  `

  return new Response(html, {
    headers: { 'Content-Type': 'text/html' },
  })
})

// How to Play route
app.frame('/howtoplay', () => {
  const imageUrl = 'https://bafybeifwuw27w75jpvmfjhxci7mhhlkhqzqzz3ym6feeadqtphbb6pbpwm.ipfs.w3s.link/Frame%208.png'
  const baseUrl = 'https://tictactoe-nine-xi.vercel.app' // Update this to your actual domain

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>How to Play Tic-Tac-Toe</title>
      <meta property="fc:frame" content="vNext">
      <meta property="fc:frame:image" content="${imageUrl}">
      <meta property="fc:frame:image:aspect_ratio" content="1:1">
      <meta property="fc:frame:button:1" content="Start Game">
      <meta property="fc:frame:button:1:action" content="post">
      <meta property="fc:frame:post_url" content="${baseUrl}/api/game">
    </head>
    <body>
    </body>
    </html>
  `

  return new Response(html, {
    headers: { 'Content-Type': 'text/html' },
  })
})


// Existing game logic moved to /game route
app.frame('/game', async (c) => {
  const { buttonValue, status, frameData } = c
  const fid = frameData?.fid;

  let username = 'Player';
  if (fid) {
    try {
      username = await getUsername(fid.toString());
    } catch (error) {
      console.error('Error getting username:', error);
    }
  }

  // Always initialize a new game state when entering this route
  let state: GameState = { board: Array(9).fill(null), currentPlayer: 'O', isGameOver: false }
  let message = `New game started! Your turn, ${username}`

  if (status === 'response' && buttonValue && buttonValue.startsWith('move:')) {
    state = decodeState(buttonValue.split(':')[1])
    let { board, currentPlayer, isGameOver } = state

    const move = parseInt(buttonValue.split(':')[2])
    if (board[move] === null && !isGameOver) {
      // Player's move
      board[move] = 'O'
      message = `${username} moved at ${COORDINATES[move]}.`
      
      if (checkWin(board)) {
        message = `${username} wins! Game over.`
        isGameOver = true
      } else if (board.every((cell: string | null) => cell !== null)) {
        message = "Game over! It's a draw."
        isGameOver = true
      } else {
        // Computer's move
        const computerMove = getBestMove(board, 'X')
        if (computerMove !== -1) {
          board[computerMove] = 'X'
          message += ` Computer moved at ${COORDINATES[computerMove]}.`
          
          if (checkWin(board)) {
            message += ` Computer wins! Game over.`
            isGameOver = true
          } else if (board.every((cell: string | null) => cell !== null)) {
            message += " It's a draw. Game over."
            isGameOver = true
          } else {
            message += ` Your turn, ${username}.`
          }
        }
      }
    } else if (isGameOver) {
      message = "Game is over. Start a new game!"
    } else {
      message = "That spot is already taken! Choose another."
    }

    state = { board, currentPlayer, isGameOver }
  }

  // Encode the state in the button values
  const encodedState = encodeState(state)

  // Get available moves
  const availableMoves = state.board.reduce((acc, cell, index) => {
    if (cell === null) acc.push(index)
    return acc
  }, [] as number[])

  // Shuffle available moves and take the first 4 (or less if fewer are available)
  const shuffledMoves = shuffleArray([...availableMoves]).slice(0, 4)

  const intents = state.isGameOver
    ? [
        <Button value="newgame">New Game</Button>,
        <Button action="/share">Share Game</Button>
      ]
    : shuffledMoves.map((index) => 
        <Button value={`move:${encodedState}:${index}`}>
          {COORDINATES[index]}
        </Button>
      )

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
        {renderBoard(state.board)}
        <div style={{ marginTop: '40px', maxWidth: '900px', textAlign: 'center' }}>{message}</div>
      </div>
    ),
    intents: intents,
  })
})

app.frame('/share', (c) => {
  const shareText = `Play Tic-Tac-Toe with me! 🎮 Can you beat the AI?`;
  const shareUrl = `https://tictactoe-nine-xi.vercel.app/api`;

  const farcasterShareURL = `https://warpcast.com/~/compose?text=${encodeURIComponent(shareText)}&embeds[]=${encodeURIComponent(shareUrl)}`;

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
        <h1>Share Tic-Tac-Toe</h1>
        <p>Challenge your friends to a game!</p>
      </div>
    ),
    intents: [
      <Button action="/">New Game</Button>,
      <Button.Link href={farcasterShareURL}>Share on Farcaster</Button.Link>,
    ],
  });
});

function getBestMove(board: (string | null)[], player: string): number {
  const opponent = player === 'X' ? 'O' : 'X'

  // If it's the first move (only one 'O' on the board), choose a random available position
  if (board.filter(cell => cell !== null).length === 1) {
    const availableMoves = board.reduce((acc, cell, index) => {
      if (cell === null) acc.push(index)
      return acc
    }, [] as number[])
    return availableMoves[Math.floor(Math.random() * availableMoves.length)]
  }

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