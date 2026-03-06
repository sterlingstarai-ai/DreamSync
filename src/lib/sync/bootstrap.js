import { getAPIAdapter } from '../adapters/api';
import useCheckInStore from '../../store/useCheckInStore';
import useCoachPlanStore from '../../store/useCoachPlanStore';
import useDreamStore from '../../store/useDreamStore';
import useForecastStore from '../../store/useForecastStore';
import useSymbolStore from '../../store/useSymbolStore';
import { queueUpsert } from '../offline/syncHelpers';
import { rebuildPersonalSymbols } from './deriveSymbols';

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
  return Object.values(snapshot).reduce((sum, value) => sum + value.length, 0);
}

function remapUserId(snapshot, nextUserId) {
  return {
    dreams: snapshot.dreams.map((dream) => ({ ...dream, userId: nextUserId })),
    daily_logs: snapshot.daily_logs.map((log) => ({ ...log, userId: nextUserId })),
    forecasts: snapshot.forecasts.map((forecast) => ({ ...forecast, userId: nextUserId })),
    personal_symbols: snapshot.personal_symbols.map((symbol) => ({ ...symbol, userId: nextUserId })),
    coach_plans: snapshot.coach_plans.map((plan) => ({
      ...plan,
      id: `${nextUserId}:${plan.date}`,
      userId: nextUserId,
    })),
  };
}

function applyRemoteBootstrap(userId, snapshot) {
  const rebuiltSymbols = rebuildPersonalSymbols({
    userId,
    dreams: snapshot.dreams || [],
    existingSymbols: snapshot.personal_symbols || [],
  });

  useDreamStore.setState({ dreams: snapshot.dreams || [] });
  useCheckInStore.setState({ logs: snapshot.daily_logs || [] });
  useForecastStore.setState({ forecasts: snapshot.forecasts || [] });
  useSymbolStore.setState({ symbols: rebuiltSymbols });
  useCoachPlanStore.setState({
    plansByUser: {
      ...useCoachPlanStore.getState().plansByUser,
      [userId]: Object.fromEntries(
        (snapshot.coach_plans || []).map((plan) => [plan.date, plan]),
      ),
    },
  });
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
  snapshot.dreams.forEach((dream) => queueUpsert('dreams', dream));
  snapshot.daily_logs.forEach((log) => queueUpsert('daily_logs', log));
  snapshot.forecasts.forEach((forecast) => queueUpsert('forecasts', forecast));
  snapshot.personal_symbols.forEach((symbol) => queueUpsert('personal_symbols', symbol));
  snapshot.coach_plans.forEach((plan) => queueUpsert('coach_plans', plan));
}

export async function bootstrapRemoteAccount({ previousUserId, nextUserId }) {
  const api = getAPIAdapter();
  if (!nextUserId || api.name !== 'supabase' || typeof api.pullBootstrapData !== 'function') {
    return { mode: 'skip' };
  }

  const localSnapshot = previousUserId ? getLocalSnapshots(previousUserId) : getLocalSnapshots(nextUserId);
  const remoteSnapshot = await api.pullBootstrapData(nextUserId);
  const localCount = countSnapshotItems(localSnapshot);
  const remoteCount = countSnapshotItems(remoteSnapshot);

  if (remoteCount === 0 && localCount > 0) {
    const reassigned = remapUserId(localSnapshot, nextUserId);
    if (previousUserId && previousUserId !== nextUserId) {
      applyLocalReassignment(previousUserId, nextUserId, reassigned);
    }
    enqueueSnapshot(reassigned);
    return { mode: 'push_local' };
  }

  if (remoteCount > 0 && localCount === 0) {
    applyRemoteBootstrap(nextUserId, remoteSnapshot);
    return { mode: 'pull_remote' };
  }

  return { mode: 'noop' };
}
