import type { AppApiModel, TechnologyDeletePlanResult } from '@contracts';

import { renderHook, waitFor } from '@testing-library/react';
import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useTechnologyDelete } from './use-technology-delete.hook';

// ZMT-52 — the renderer half of the delete loop. The plan is asked for FIRST and
// held for the confirmation to render; only a committed mode turns into a write,
// and that write is exactly ONE `entity:writeBatch`.

const deletePlan = vi.fn();
const lookup = vi.fn();
const writeBatch = vi.fn();

const AIR_PATH = 'common/technologies/air_techs.txt';

const PLAN: TechnologyDeletePlanResult = {
  item: {
    blocked: [],
    inboundReferences: [],
    targets: [
      { modId: 'bice', relativePath: AIR_PATH, token: 'early_fighter' },
    ],
  },
  tree: {
    blocked: [],
    inboundReferences: [
      { referencedTokens: ['fighter2'], token: 'interceptor1' },
    ],
    targets: [
      { modId: 'bice', relativePath: AIR_PATH, token: 'early_fighter' },
      { modId: 'bice', relativePath: AIR_PATH, token: 'fighter2' },
    ],
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(window, 'api', {
    configurable: true,
    value: {
      entity: { writeBatch },
      localisation: { lookup },
      technology: { deletePlan },
    } as unknown as AppApiModel,
    writable: true,
  });
  deletePlan.mockResolvedValue(PLAN);
  lookup.mockResolvedValue({ defaultTarget: null, entries: [] });
  writeBatch.mockResolvedValue(undefined);
});

describe('useTechnologyDelete', () => {
  it('asks the main side for the plan and holds it for the confirmation', async () => {
    const { result } = renderHook(() => useTechnologyDelete(vi.fn()));

    act(() => {
      result.current.open('early_fighter');
    });
    await waitFor(() => {
      expect(result.current.plan).toEqual(PLAN);
    });

    expect(deletePlan).toHaveBeenCalledWith('early_fighter');
    expect(result.current.token).toBe('early_fighter');
    expect(result.current.status).toBe('idle');
    // Opening the confirmation writes nothing.
    expect(writeBatch).not.toHaveBeenCalled();
  });

  it('commits the chosen mode as ONE batch and reloads', async () => {
    const onDeleted = vi.fn();
    const { result } = renderHook(() => useTechnologyDelete(onDeleted));

    act(() => {
      result.current.open('early_fighter');
    });
    await waitFor(() => {
      expect(result.current.plan).not.toBeNull();
    });
    act(() => {
      result.current.commit('tree');
    });
    await waitFor(() => {
      expect(onDeleted).toHaveBeenCalledTimes(1);
    });

    expect(writeBatch).toHaveBeenCalledTimes(1);
    expect(writeBatch).toHaveBeenCalledWith({
      operations: [
        {
          entityNames: ['early_fighter', 'fighter2'],
          format: 'scriptDelete',
          modId: 'bice',
          relativePath: AIR_PATH,
        },
      ],
    });
    // The pending confirmation is cleared once the write lands.
    expect(result.current.plan).toBeNull();
    expect(result.current.status).toBe('idle');
  });

  it('looks up only the removed set’s loc keys', async () => {
    const { result } = renderHook(() => useTechnologyDelete(vi.fn()));

    act(() => {
      result.current.open('early_fighter');
    });
    await waitFor(() => {
      expect(result.current.plan).not.toBeNull();
    });
    act(() => {
      result.current.commit('item');
    });
    await waitFor(() => {
      expect(writeBatch).toHaveBeenCalled();
    });

    expect(lookup).toHaveBeenCalledWith([
      'early_fighter',
      'early_fighter_desc',
      'early_fighter_short',
    ]);
  });

  // Q93 = A1: the inbound references are WARNED, never rewritten. Nothing the
  // hook sends touches a technology outside the deleted set.
  it('never writes to an inbound referrer', async () => {
    const { result } = renderHook(() => useTechnologyDelete(vi.fn()));

    act(() => {
      result.current.open('early_fighter');
    });
    await waitFor(() => {
      expect(result.current.plan).not.toBeNull();
    });
    act(() => {
      result.current.commit('tree');
    });
    await waitFor(() => {
      expect(writeBatch).toHaveBeenCalled();
    });

    const sent = JSON.stringify(writeBatch.mock.calls[0][0]);
    expect(sent).not.toContain('interceptor1');
  });

  it('refuses the whole set when any member is owned by a readonly source', async () => {
    deletePlan.mockResolvedValue({
      item: PLAN.item,
      tree: { ...PLAN.tree, blocked: ['vanilla_only'] },
    });
    const { result } = renderHook(() => useTechnologyDelete(vi.fn()));

    act(() => {
      result.current.open('early_fighter');
    });
    await waitFor(() => {
      expect(result.current.plan).not.toBeNull();
    });
    act(() => {
      result.current.commit('tree');
    });

    expect(result.current.status).toBe('readonly');
    expect(writeBatch).not.toHaveBeenCalled();
  });

  it('surfaces a failed write as an error and keeps the confirmation open', async () => {
    writeBatch.mockRejectedValue({ code: 500, message: 'boom' });
    const onDeleted = vi.fn();
    const { result } = renderHook(() => useTechnologyDelete(onDeleted));

    act(() => {
      result.current.open('early_fighter');
    });
    await waitFor(() => {
      expect(result.current.plan).not.toBeNull();
    });
    act(() => {
      result.current.commit('item');
    });
    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });

    expect(onDeleted).not.toHaveBeenCalled();
    expect(result.current.plan).not.toBeNull();
  });

  it('drops the pending plan on cancel', async () => {
    const { result } = renderHook(() => useTechnologyDelete(vi.fn()));

    act(() => {
      result.current.open('early_fighter');
    });
    await waitFor(() => {
      expect(result.current.plan).not.toBeNull();
    });
    act(() => {
      result.current.cancel();
    });

    expect(result.current.plan).toBeNull();
    expect(result.current.token).toBeNull();
    expect(writeBatch).not.toHaveBeenCalled();
  });
});
