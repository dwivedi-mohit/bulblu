export type Color = 'red' | 'green' | 'yellow' | 'blue';

export interface Token {
  id: number; // 0, 1, 2, 3
  stepCount: number; // -1 = base, 0..50 = main track, 51..55 = home path, 56 = finished
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  color: Color;
  tokens: Token[];
  isReady: boolean;
  isFinished: boolean;
  rank?: number;
}

export interface GameState {
  gameId: string;
  players: Player[];
  currentTurnIndex: number;
  diceValue: number | null;
  hasRolled: boolean;
  movableTokenIds: number[];
  status: 'waiting' | 'playing' | 'finished';
  winner?: Player;
  log: string;
  turnDeadline: number;
}

// Starting index on the 52-tile main track for each color
export const COLOR_START_INDEX: Record<Color, number> = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39,
};

// Safe tile indices on the 52-tile main track
export const SAFE_TRACK_INDICES = [0, 8, 13, 21, 26, 34, 39, 47];

export function getAbsoluteTrackIndex(color: Color, stepCount: number): number | null {
  if (stepCount < 0 || stepCount > 50) return null;
  const start = COLOR_START_INDEX[color];
  return (start + stepCount) % 52;
}

export class LudoGame {
  public state: GameState;
  private colors: Color[] = ['red', 'green', 'yellow', 'blue'];
  private rankCounter = 1;

  constructor(gameId: string) {
    this.state = {
      gameId,
      players: [],
      currentTurnIndex: 0,
      diceValue: null,
      hasRolled: false,
      movableTokenIds: [],
      status: 'waiting',
      log: 'Waiting for players to join...',
      turnDeadline: Date.now() + 30000,
    };
  }

  public addPlayer(userId: string, name: string, avatar: string): Player {
    let existing = this.state.players.find((p) => p.id === userId);
    if (existing) return existing;

    if (this.state.players.length >= 4) {
      throw new Error('Game room is full');
    }

    const assignedColor = this.colors[this.state.players.length];
    const newPlayer: Player = {
      id: userId,
      name: name || `Player ${this.state.players.length + 1}`,
      avatar: avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
      color: assignedColor,
      tokens: [
        { id: 0, stepCount: -1 },
        { id: 1, stepCount: -1 },
        { id: 2, stepCount: -1 },
        { id: 3, stepCount: -1 },
      ],
      isReady: true,
      isFinished: false,
    };

    this.state.players.push(newPlayer);
    this.state.log = `${newPlayer.name} joined as ${newPlayer.color.toUpperCase()}`;

    if (this.state.players.length >= 2 && this.state.status === 'waiting') {
      this.state.status = 'playing';
      this.state.log = `Game started! ${this.state.players[0].name}'s turn.`;
      this.resetTurnTimer();
    }

    return newPlayer;
  }

  public removePlayer(userId: string) {
    this.state.players = this.state.players.filter((p) => p.id !== userId);
    if (this.state.players.length < 2 && this.state.status === 'playing') {
      this.state.status = 'waiting';
      this.state.log = 'Waiting for players...';
    }
  }

  public rollDice(userId: string): number {
    const currentPlayer = this.getCurrentPlayer();
    if (!currentPlayer || currentPlayer.id !== userId) {
      throw new Error('Not your turn');
    }
    if (this.state.hasRolled) {
      throw new Error('Already rolled dice for this turn');
    }

    const dice = Math.floor(Math.random() * 6) + 1;
    this.state.diceValue = dice;
    this.state.hasRolled = true;

    // Calculate which tokens can legally move
    const movable = this.getMovableTokens(currentPlayer, dice);
    this.state.movableTokenIds = movable;

    this.state.log = `${currentPlayer.name} rolled a ${dice}!`;

    // If no tokens can move, auto pass to next turn after short delay
    if (movable.length === 0) {
      if (dice !== 6) {
        setTimeout(() => this.nextTurn(), 1200);
      } else {
        // Rolled a 6 but nowhere to move
        this.state.hasRolled = false;
        this.state.diceValue = null;
      }
    }

    this.resetTurnTimer();
    return dice;
  }

  public moveToken(userId: string, tokenId: number): GameState {
    const currentPlayer = this.getCurrentPlayer();
    if (!currentPlayer || currentPlayer.id !== userId) {
      throw new Error('Not your turn');
    }
    if (!this.state.hasRolled || this.state.diceValue === null) {
      throw new Error('Must roll dice first');
    }
    if (!this.state.movableTokenIds.includes(tokenId)) {
      throw new Error('Invalid token selection');
    }

    const token = currentPlayer.tokens.find((t) => t.id === tokenId);
    if (!token) throw new Error('Token not found');

    const dice = this.state.diceValue;

    if (token.stepCount === -1) {
      // Move out of base to start (step 0)
      token.stepCount = 0;
      this.state.log = `${currentPlayer.name} brought a token onto the board!`;
    } else {
      token.stepCount += dice;
      this.state.log = `${currentPlayer.name} moved token ${tokenId + 1} by ${dice} steps.`;
    }

    let captured = false;

    // Check piece capture if landing on main track
    if (token.stepCount >= 0 && token.stepCount <= 50) {
      const targetAbs = getAbsoluteTrackIndex(currentPlayer.color, token.stepCount);
      if (targetAbs !== null && !SAFE_TRACK_INDICES.includes(targetAbs)) {
        // Check opponent tokens on same tile
        for (const otherPlayer of this.state.players) {
          if (otherPlayer.id === currentPlayer.id) continue;
          for (const otherToken of otherPlayer.tokens) {
            if (otherToken.stepCount >= 0 && otherToken.stepCount <= 50) {
              const otherAbs = getAbsoluteTrackIndex(otherPlayer.color, otherToken.stepCount);
              if (otherAbs === targetAbs) {
                // CAPTURE! Send opponent back to base (-1)
                otherToken.stepCount = -1;
                captured = true;
                this.state.log = `💥 ${currentPlayer.name} captured ${otherPlayer.name}'s token!`;
              }
            }
          }
        }
      }
    }

    // Check if player won / finished all tokens
    const allFinished = currentPlayer.tokens.every((t) => t.stepCount === 56);
    if (allFinished && !currentPlayer.isFinished) {
      currentPlayer.isFinished = true;
      currentPlayer.rank = this.rankCounter++;
      this.state.log = `🏆 ${currentPlayer.name} finished in Rank #${currentPlayer.rank}!`;

      if (!this.state.winner) {
        this.state.winner = currentPlayer;
      }

      const activeRemaining = this.state.players.filter((p) => !p.isFinished);
      if (activeRemaining.length <= 1) {
        this.state.status = 'finished';
        this.state.log = `🎉 Game Over! Winner: ${this.state.winner.name}!`;
        return this.state;
      }
    }

    // Extra turn if rolled 6 or captured a piece
    if (dice === 6 || captured) {
      this.state.hasRolled = false;
      this.state.diceValue = null;
      this.state.movableTokenIds = [];
      this.state.log += ` (Extra turn granted!)`;
      this.resetTurnTimer();
    } else {
      this.nextTurn();
    }

    return this.state;
  }

  public nextTurn() {
    this.state.hasRolled = false;
    this.state.diceValue = null;
    this.state.movableTokenIds = [];

    if (this.state.players.length === 0) return;

    let attempts = 0;
    do {
      this.state.currentTurnIndex = (this.state.currentTurnIndex + 1) % this.state.players.length;
      attempts++;
    } while (this.getCurrentPlayer()?.isFinished && attempts < this.state.players.length);

    const nextPlayer = this.getCurrentPlayer();
    if (nextPlayer) {
      this.state.log = `Turn: ${nextPlayer.name} (${nextPlayer.color.toUpperCase()})`;
    }
    this.resetTurnTimer();
  }

  public getCurrentPlayer(): Player | undefined {
    return this.state.players[this.state.currentTurnIndex];
  }

  private resetTurnTimer() {
    this.state.turnDeadline = Date.now() + 30000;
  }

  private getMovableTokens(player: Player, dice: number): number[] {
    const movable: number[] = [];
    for (const token of player.tokens) {
      if (token.stepCount === 56) continue; // Already home

      if (token.stepCount === -1) {
        if (dice === 6) movable.push(token.id);
      } else {
        if (token.stepCount + dice <= 56) {
          movable.push(token.id);
        }
      }
    }
    return movable;
  }
}
