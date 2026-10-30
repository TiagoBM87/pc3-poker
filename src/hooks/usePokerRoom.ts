import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ROUND_TIMER_MS } from '../config/round';
import { calculateStats } from '../lib/stats';
import { describeError } from '../lib/utils';
import { roomService } from '../services/roomService';
import type { Identity, Participant, RoomState, RoomStats, VoteValue } from '../types/poker';

export interface UsePokerRoomResult {
  /** Room state with vote values stripped out until the cards are revealed. */
  room: RoomState | null;
  loading: boolean;
  error: string | null;
  actionError: string | null;
  notFound: boolean;
  participants: Participant[];
  voters: Participant[];
  /** Ids of participants that already voted (safe to show before the reveal). */
  votedUserIds: string[];
  /** The current user's own vote (always visible to themselves). */
  myVote: VoteValue | null;
  stats: RoomStats | null;
  isHost: boolean;
  isObserver: boolean;
  hostName: string | null;
  /** Optional 30s countdown that reveals the round automatically when it ends. */
  timerEndsAt: number | null;
  timerActive: boolean;
  timerRemainingMs: number | null;
  castVote: (vote: VoteValue | null) => Promise<void>;
  revealCards: () => Promise<void>;
  resetRound: () => Promise<void>;
  startTimer: () => Promise<void>;
  cancelTimer: () => Promise<void>;
  clearActionError: () => void;
}

/**
 * Subscribes to `/rooms/{roomId}`, joins the room with the given identity and
 * exposes sanitized state plus the host actions.
 *
 * Votes are never exposed in `room.votes` while `metadata.isRevealed` is false;
 * only the list of participants who voted is returned.
 */
export function usePokerRoom(
  roomId: string,
  identity: Identity | null,
  enabled = true,
): UsePokerRoomResult {
  const [room, setRoom] = useState<RoomState | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [, setTimerTick] = useState(0);
  const joinedKeyRef = useRef<string | null>(null);

  const identityId = identity?.id ?? null;
  const identityName = identity?.name ?? null;
  const identityRole = identity?.role ?? null;

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    if (!roomId) {
      setLoading(false);
      setError('Sala inválida.');
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = roomService.subscribe(
      roomId,
      (nextRoom) => {
        setRoom(nextRoom);
        setLoading(false);
      },
      (subscriptionError) => {
        setRoom(null);
        setError(describeError(subscriptionError));
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [roomId, enabled]);

  // Join (or re-join after a name/role change) as soon as the room is known.
  useEffect(() => {
    if (!enabled || !identityId || !identityName || !identityRole || !room) return;

    const joinKey = `${roomId}:${identityId}:${identityName}:${identityRole}`;
    if (joinedKeyRef.current === joinKey) return;
    joinedKeyRef.current = joinKey;

    roomService
      .joinRoom(roomId, {
        id: identityId,
        name: identityName,
        role: identityRole,
        joinedAt: Date.now(),
      })
      .catch((joinError: unknown) => {
        joinedKeyRef.current = null;
        setActionError(describeError(joinError));
      });
  }, [enabled, roomId, identityId, identityName, identityRole, room]);

  // If presence is removed while this tab is still open (for example another
  // tab with the same identity was closed), rejoin instead of staying a ghost.
  const lastRejoinRef = useRef(0);
  useEffect(() => {
    if (!enabled || !room || !identityId || !identityName || !identityRole) return;
    if (!joinedKeyRef.current) return;
    if (room.participants[identityId]) return;

    const now = Date.now();
    if (now - lastRejoinRef.current < 5000) return;
    lastRejoinRef.current = now;

    roomService
      .joinRoom(roomId, {
        id: identityId,
        name: identityName,
        role: identityRole,
        joinedAt: now,
      })
      .catch(() => undefined);
  }, [enabled, room, roomId, identityId, identityName, identityRole]);

  // Leave the room when navigating away / closing the view.
  useEffect(() => {
    if (!identityId) return;

    return () => {
      if (joinedKeyRef.current?.startsWith(`${roomId}:${identityId}:`)) {
        joinedKeyRef.current = null;
        void roomService.leaveRoom(roomId, identityId).catch(() => undefined);
      }
    };
  }, [roomId, identityId]);

  // Safety net: if the host abandoned the room (tab closed), the earliest
  // remaining participant claims ownership.
  useEffect(() => {
    if (!enabled || !room || !identityId) return;
    if (!room.participants[identityId]) return;

    const hostId = room.metadata.hostId ?? null;
    if (hostId && room.participants[hostId]) return;

    const earliest = Object.values(room.participants).sort(
      (a, b) => a.joinedAt - b.joinedAt,
    )[0];
    if (earliest?.id !== identityId) return;

    void roomService.claimHost(roomId, identityId, hostId).catch(() => undefined);
  }, [enabled, room, identityId, roomId]);

  const revealed = room?.metadata.isRevealed ?? false;
  const timerEndsAt = room?.metadata.timerEndsAt ?? null;
  const timerActive = Boolean(timerEndsAt) && !revealed;

  // Re-render the countdown a few times per second, but only while needed.
  useEffect(() => {
    if (!timerActive) return;

    const interval = window.setInterval(() => setTimerTick((tick) => tick + 1), 250);
    return () => window.clearInterval(interval);
  }, [timerActive, timerEndsAt]);

  const timerRemainingMs =
    timerActive && timerEndsAt ? Math.max(0, timerEndsAt - Date.now()) : null;

  // Every client races to complete the timer at zero. The service only accepts
  // the write while the stored timestamp still matches, so the first one wins
  // and the others become no-ops.
  useEffect(() => {
    if (!enabled || !roomId || !timerActive || !timerEndsAt) return;

    let disposed = false;
    let inFlight = false;

    const attempt = () => {
      if (disposed || inFlight || Date.now() < timerEndsAt) return;
      inFlight = true;
      roomService
        .completeRoundTimer(roomId, timerEndsAt)
        .catch(() => undefined)
        .finally(() => {
          inFlight = false;
        });
    };

    const timeout = window.setTimeout(attempt, Math.max(0, timerEndsAt - Date.now()));
    const interval = window.setInterval(attempt, 1000);

    return () => {
      disposed = true;
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, [enabled, roomId, timerActive, timerEndsAt]);

  const rawVotes = useMemo(() => room?.votes ?? {}, [room]);
  const votedUserIds = useMemo(() => Object.keys(rawVotes), [rawVotes]);
  const myVote = identityId ? rawVotes[identityId] ?? null : null;
  const stats = useMemo(
    () => (revealed ? calculateStats(rawVotes) : null),
    [revealed, rawVotes],
  );

  const participants = useMemo(
    () =>
      Object.values(room?.participants ?? {}).sort((a, b) => a.joinedAt - b.joinedAt),
    [room],
  );
  const voters = useMemo(
    () => participants.filter((participant) => participant.role === 'VOTER'),
    [participants],
  );

  const sanitizedRoom = useMemo<RoomState | null>(() => {
    if (!room) return null;
    return {
      ...room,
      participants: room.participants ?? {},
      votes: revealed ? rawVotes : undefined,
    };
  }, [room, revealed, rawVotes]);

  const hostId = sanitizedRoom?.metadata.hostId ?? null;
  const hostName = hostId ? sanitizedRoom?.participants[hostId]?.name ?? null : null;

  const castVote = useCallback(
    async (vote: VoteValue | null) => {
      if (!identityId) return;
      setActionError(null);
      try {
        await roomService.castVote(roomId, identityId, vote);
      } catch (voteError) {
        setActionError(describeError(voteError));
      }
    },
    [roomId, identityId],
  );

  const revealCards = useCallback(async () => {
    setActionError(null);
    try {
      await roomService.setRevealed(roomId, true);
    } catch (revealError) {
      setActionError(describeError(revealError));
    }
  }, [roomId]);

  const resetRound = useCallback(async () => {
    setActionError(null);
    try {
      await roomService.resetVoting(roomId);
    } catch (resetError) {
      setActionError(describeError(resetError));
    }
  }, [roomId]);

  const startTimer = useCallback(async () => {
    setActionError(null);
    try {
      await roomService.startRoundTimer(roomId, Date.now() + ROUND_TIMER_MS);
    } catch (timerError) {
      setActionError(describeError(timerError));
    }
  }, [roomId]);

  const cancelTimer = useCallback(async () => {
    setActionError(null);
    try {
      await roomService.clearRoundTimer(roomId);
    } catch (timerError) {
      setActionError(describeError(timerError));
    }
  }, [roomId]);

  const clearActionError = useCallback(() => setActionError(null), []);

  return {
    room: sanitizedRoom,
    loading,
    error,
    actionError,
    notFound: enabled && !loading && !error && sanitizedRoom === null,
    participants,
    voters,
    votedUserIds,
    myVote,
    stats,
    isHost: Boolean(identityId && hostId === identityId),
    isObserver: identityRole === 'OBSERVER',
    hostName,
    timerEndsAt,
    timerActive,
    timerRemainingMs,
    castVote,
    revealCards,
    resetRound,
    startTimer,
    cancelTimer,
    clearActionError,
  };
}
