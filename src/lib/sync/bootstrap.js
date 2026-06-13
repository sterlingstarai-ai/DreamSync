import { getAPIAdapter } from '../adapters/api';
import useCheckInStore from '../../store/useCheckInStore';
import useCoachPlanStore from '../../store/useCoachPlanStore';
import useDreamStore from '../../store/useDreamStore';
import useForecastStore from '../../store/useForecastStore';
import useSymbolStore from '../../store/useSymbolStore';
import { queueUpsert } from '../offline/syncHelpers';
import { rebuildPersonalSymbols } from './deriveSymbols';

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function getLocalSnapshots(userId) {
  const dreams = useDreamStore.getState().dreams.filter((dream) => dream.userId === userId);
  const dailyLogs = useCheckInStore.getState().logs.filter((log) => log.userId === userId);
  const forecasts = useForecastStore.getState().forecasts.filter((forecast) => forecast.userId === userId);
  const personalSymbols = useSymbolStore.getState().symbols.filter((symbol) => symbol.userId === userId);
  const coachPlans = Object.values(useCoachPlanStore.getState().plansByUser[userId] || {});

  return {
    dreams,
    daily_logs: dailyLogs,
    forecasts,
    personal_symbols: personalSymbols,
    coach_plans: coachPlans,
  };
}

function countSnapshotItems(snapshot) {
  return Object.values(snapshot || {}).reduce((sum, value) => sum + asArray(value).length, 0);
}

function normalizeSnapshotForUser(snapshot, userId) {
  return {
    dreams: asArray(snapshot?.dreams)
      .filter((dream) => !dream.userId || dream.userId === userId)
      .map((dream) => ({ ...dream, userId })),
    daily_logs: asArray(snapshot?.daily_logs)
      .filter((log) => !log.userId || log.userId === userId)
      .map((log) => ({ ...log, userId })),
    forecasts: asArray(snapshot?.forecasts)
      .filter((forecast) => !forecast.userId || forecast.userId === userId)
      .map((forecast) => ({ ...forecast, userId })),
    personal_symbols: asArray(snapshot?.personal_symbols)
      .filter((symbol) => !symbol.userId || symbol.userId === userId)
      .map((symbol) => ({ ...symbol, userId })),
    coach_plans: asArray(snapshot?.coach_plans)
      .filter((plan) => !plan.userId || plan.userId === userId)
      .map((plan) => ({ ...plan, userId })),
  };
}

function remapUserId(snapshot, nextUserId) {
  return {
    dreams: asArray(snapshot.dreams).map((dream) => ({ ...dream, userId: nextUserId })),
    daily_logs: asArray(snapshot.daily_logs).map((log) => ({ ...log, userId: nextUserId })),
    forecasts: asArray(snapshot.forecasts).map((forecast) => ({ ...forecast, userId: nextUserId })),
    personal_symbols: asArray(snapshot.personal_symbols).map((symbol) => ({ ...symbol, userId: nextUserId })),
    coach_plans: asArray(snapshot.coach_plans).map((plan) => ({
      ...plan,
      id: `${nextUserId}:${plan.date}`,
      userId: nextUserId,
    })),
  };
}

function isNewer(candidate, reference) {
  return new Date(candidate?.updatedAt || 0).getTime() > new Date(reference?.updatedAt || 0).getTime();
}

/**
 * Merge a remote slice into the current store without dropping unsynced local
 * records. Other users' rows are untouched. For the active user, remote and
 * local rows are merged by id and the newer updatedAt wins, so a local-only
 * (never-synced) or locally-newer edit survives the pull instead of being
 * silently replaced.
 */
function mergeUserSliceByUpdatedAt(allRows, remoteRows, userId) {
  const others = allRows.filter((row) => row.userId !== userId);
  const localUserRows = allRows.filter((row) => row.userId === userId);
  const byId = new Map(remoteRows.map((row) => [row.id, row]));

  for (const local of localUserRows) {
    const remote = byId.get(local.id);
    if (!remote || isNewer(local, remote)) {
      byId.set(local.id, local);
    }
  }

  return [...others, ...byId.values()];
}

/**
 * Combine rebuilt (dream-derived, remote-authored) symbols with the pulled
 * remote symbol rows so that:
 *  - tombstoned remote symbols are NOT resurrected (the tombstone wins),
 *  - remote symbols with no backing dream are kept (not dropped),
 *  - dream-backed symbols keep recomputed counts plus remote-authored meaning.
 */
function mergeRemoteSymbols(remoteSymbols, rebuiltSymbols) {
  const byName = new Map(rebuiltSymbols.map((symbol) => [symbol.name, symbol]));

  for (const remote of remoteSymbols) {
    if (remote.deletedAt) {
      byName.set(remote.name, remote);
    } else if (!byName.has(remote.name)) {
      byName.set(remote.name, remote);
    }
  }

  return [...byName.values()];
}

function mergeCoachPlansForUser(localUserPlans = {}, remotePlans = []) {
  const merged = {};
  for (const plan of remotePlans) {
    merged[plan.date] = plan;
  }
  for (const [date, plan] of Object.entries(localUserPlans || {})) {
    const remote = merged[date];
    if (!remote || isNewer(plan, remote)) {
      merged[date] = plan;
    }
  }
  return merged;
}

function applyRemoteBootstrap(userId, snapshot) {
  const remoteSnapshot = normalizeSnapshotForUser(snapshot, userId);
  const rebuiltSymbols = rebuildPersonalSymbols({
    userId,
    dreams: remoteSnapshot.dreams,
    existingSymbols: remoteSnapshot.personal_symbols,
  });
  const mergedRemoteSymbols = mergeRemoteSymbols(remoteSnapshot.personal_symbols, rebuiltSymbols);

  useDreamStore.setState((state) => ({
    dreams: mergeUserSliceByUpdatedAt(state.dreams, remoteSnapshot.dreams, userId),
  }));
  useCheckInStore.setState((state) => ({
    logs: mergeUserSliceByUpdatedAt(state.logs, remoteSnapshot.daily_logs, userId),
  }));
  useForecastStore.setState((state) => ({
    forecasts: mergeUserSliceByUpdatedAt(state.forecasts, remoteSnapshot.forecasts, userId),
  }));
  useSymbolStore.setState((state) => ({
    symbols: mergeUserSliceByUpdatedAt(state.symbols, mergedRemoteSymbols, userId),
  }));
  useCoachPlanStore.setState((state) => ({
    plansByUser: {
      ...state.plansByUser,
      [userId]: mergeCoachPlansForUser(state.plansByUser[userId], remoteSnapshot.coach_plans),
    },
  }));
}

function applyLocalReassignment(previousUserId, nextUserId, snapshot) {
  useDreamStore.setState((state) => ({
    dreams: state.dreams.map((dream) => (
      dream.userId === previousUserId ? { ...dream, userId: nextUserId } : dream
    )),
  }));
  useCheckInStore.setState((state) => ({
    logs: state.logs.map((log) => (
      log.userId === previousUserId ? { ...log, userId: nextUserId } : log
    )),
  }));
  useForecastStore.setState((state) => ({
    forecasts: state.forecasts.map((forecast) => (
      forecast.userId === previousUserId ? { ...forecast, userId: nextUserId } : forecast
    )),
  }));
  useSymbolStore.setState((state) => ({
    symbols: state.symbols.map((symbol) => (
      symbol.userId === previousUserId ? { ...symbol, userId: nextUserId } : symbol
    )),
  }));
  useCoachPlanStore.setState((state) => {
    const nextPlansByUser = { ...state.plansByUser };
    if (nextPlansByUser[previousUserId]) {
      nextPlansByUser[nextUserId] = Object.fromEntries(
        Object.values(snapshot.coach_plans).map((plan) => [
          plan.date,
          { ...plan, id: `${nextUserId}:${plan.date}`, userId: nextUserId },
        ]),
      );
      delete nextPlansByUser[previousUserId];
    }
    return { plansByUser: nextPlansByUser };
  });
}

function enqueueSnapshot(snapshot) {
  asArray(snapshot.dreams).forEach((dream) => queueUpsert('dreams', dream));
  asArray(snapshot.daily_logs).forEach((log) => queueUpsert('daily_logs', log));
  asArray(snapshot.forecasts).forEach((forecast) => queueUpsert('forecasts', forecast));
  asArray(snapshot.personal_symbols).forEach((symbol) => queueUpsert('personal_symbols', symbol));
  asArray(snapshot.coach_plans).forEach((plan) => queueUpsert('coach_plans', plan));
}

/**
 * @param {{
 *   previousUserId?: string | null,
 *   nextUserId?: string | null,
 *   allowLocalPromotion?: boolean,
 * }} [params]
 */
export async function bootstrapRemoteAccount({
  previousUserId,
  nextUserId,
  allowLocalPromotion = false,
} = {}) {
  const api = getAPIAdapter();
  if (!nextUserId || api.name !== 'supabase' || typeof api.pullBootstrapData !== 'function') {
    return { mode: 'skip' };
  }

  const localSourceUserId = previousUserId || nextUserId;
  const localSnapshot = getLocalSnapshots(localSourceUserId);
  const remoteSnapshot = await api.pullBootstrapData(nextUserId);
  const localCount = countSnapshotItems(localSnapshot);
  const remoteCount = countSnapshotItems(remoteSnapshot);

  const isSameUserLocal = localSourceUserId === nextUserId;
  const isPromotion = allowLocalPromotion && !isSameUserLocal && localCount > 0;

  function promoteLocalSnapshot() {
    const reassigned = remapUserId(localSnapshot, nextUserId);
    applyLocalReassignment(previousUserId, nextUserId, reassigned);
    enqueueSnapshot(reassigned);
  }

  if (remoteCount > 0) {
    // Remote already has data AND we hold promotable guest data: reassign + enqueue
    // the guest snapshot FIRST (so it is not orphaned under the dead local id), then
    // let applyRemoteBootstrap merge the remote slice on top. Reassign-before-merge
    // matters for coach_plans, whose per-user map is rebuilt wholesale on reassignment.
    if (isPromotion) {
      promoteLocalSnapshot();
      applyRemoteBootstrap(nextUserId, remoteSnapshot);
      return { mode: 'pull_remote_merge_promote' };
    }

    applyRemoteBootstrap(nextUserId, remoteSnapshot);
    return {
      mode: localCount > 0 && isSameUserLocal ? 'pull_remote_merge_local' : 'pull_remote',
    };
  }

  if (localCount > 0 && isSameUserLocal) {
    enqueueSnapshot(localSnapshot);
    return { mode: 'push_local' };
  }

  if (isPromotion) {
    promoteLocalSnapshot();
    return { mode: 'push_local' };
  }

  if (localCount > 0) {
    return { mode: 'skip_local_promotion' };
  }

  return { mode: 'noop' };
}
