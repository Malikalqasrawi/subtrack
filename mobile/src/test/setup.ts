import { notifyManager } from '@tanstack/react-query';
import { act } from 'react';

const environment = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };

// TanStack Query tells components about new data on a timer, which can fire between two steps
// of a test or just after it ends. Running it inside act lets React finish the update there
// and then, so no test sees a half-updated screen.
notifyManager.setNotifyFunction((notify) => {
  const previous = environment.IS_REACT_ACT_ENVIRONMENT;
  environment.IS_REACT_ACT_ENVIRONMENT = true;
  try {
    act(notify);
  } finally {
    environment.IS_REACT_ACT_ENVIRONMENT = previous;
  }
});
