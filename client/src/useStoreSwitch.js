import { useMutation, useQueryClient } from '@tanstack/react-query';
import { errorMessage, getJson } from './api.js';
import { AFFECTED_BY, refreshAfterSave } from './queries.js';

// Opening / closing the storefront, shared by /staff's closed-store card and
// /staff/menu's switch so the rule and its Thai message live in one place.
// The server refuses to open while no payment QR is set up (400) — customers
// could order but not pay. The client only ever sends a boolean, so a 400
// here always means that.
//
// Not optimistic, unlike the sold-out switches: opening can be refused, and a
// switch that flips to "open" and then jumps back could leave staff thinking
// the store is open. The switch waits for the server instead (isPending).
export function useStoreSwitch() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (isOpen) => {
      await getJson('/api/staff/store', {
        method: 'PATCH',
        body: JSON.stringify({ isOpen }),
      });
      await refreshAfterSave(queryClient, AFFECTED_BY.store);
    },
  });

  const error = mutation.error
    ? mutation.error.status === 400
      ? 'ยังไม่ได้ตั้ง QR รับเงิน เปิดร้านไม่ได้'
      : errorMessage(mutation.error)
    : '';

  return { setOpen: mutation.mutate, isPending: mutation.isPending, error };
}
