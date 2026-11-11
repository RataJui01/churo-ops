import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router';
import { errorMessage, getJson } from '../src/api.js';
import {
  STOREFRONT_POLLED,
  staffMenuQuery,
  staffStoreQuery,
} from '../src/queries.js';
import { formatClock } from '../src/constants/storefront.js';
import { useStoreSwitch } from '../src/useStoreSwitch.js';
import Spinner from '../src/components/Spinner.jsx';
import Switch from '../src/components/Switch.jsx';

// The menu's sections, in customer-menu order (Bites was dropped 2026-11-11)
const SECTIONS = [
  { category: 'churro-hug', title: 'Churro Hug' },
  {
    category: 'classic',
    title: 'Classic Churros',
    note: '· ปิดรสเดียวได้ทั้ง S และ M',
  },
  { category: 'topping', title: 'ท็อปปิ้ง' },
];

const KEY = staffMenuQuery.queryKey;

// The store's open/closed card (artifact StaffMenu / StaffMenuClosed). Its
// switch waits for the server — see useStoreSwitch.
function StoreCard({ store }) {
  const { setOpen, isPending, error } = useStoreSwitch();
  const open = store.isOpen;
  const by = store.updatedBy
    ? ` · ${open ? 'เปิด' : 'ปิด'}โดย ${store.updatedBy.name} ${formatClock(store.updatedAt)}`
    : '';

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-[15px] font-semibold leading-[22px]">สถานะร้าน</h2>
      <div
        className={`overflow-hidden rounded-md border-2 bg-surface-raised shadow-sm ${
          open ? 'border-status-done' : 'border-danger'
        }`}
      >
        <label className="flex min-h-19 cursor-pointer items-center justify-between gap-3 px-4 py-3">
          <span className="flex flex-col gap-0.5">
            <span
              className={`font-heading text-page-title ${
                open ? 'text-status-done' : 'text-danger'
              }`}
            >
              {open ? 'ร้านเปิดรับออเดอร์' : 'ร้านปิดรับออเดอร์'}
            </span>
            <span className="text-label text-ink-muted">
              {open ? 'ลูกค้าสแกนแล้วสั่งได้ตามปกติ' : 'ลูกค้าสแกนแล้วจะเห็นหน้าร้านปิด'}
              {by}
            </span>
          </span>
          <Switch
            size="lg"
            checked={open}
            onChange={(next) => setOpen(next)}
            disabled={isPending}
            label="เปิดรับออเดอร์"
          />
        </label>
        {/* The design's #F2FBF5 / #FFF7F7 strips aren't tokens: the nearest
            token colours at low opacity instead of a new hex */}
        <p
          className={`border-t px-4 py-2.5 text-label text-ink ${
            open
              ? 'border-status-done-bg bg-status-done-bg/40'
              : 'border-surface-pink bg-surface-pink/30'
          }`}
        >
          {open
            ? 'ปิดร้าน = ลูกค้าจะไม่เห็นเมนูและสั่งไม่ได้ · ออเดอร์ที่สั่งไปแล้วยังทำต่อได้ตามปกติ'
            : 'แตะสวิตช์เพื่อเปิดร้าน · ตั้งค่า “หมด” ด้านล่างไว้ก่อนเปิดได้ ลูกค้าจะเห็นตามนั้นทันทีที่เปิด'}
        </p>
      </div>
      {error && (
        <p role="alert" className="text-body-small text-danger">
          {error}
        </p>
      )}
    </section>
  );
}

// One menu row: the whole row is the switch's label, so it's one big tap
// target (≥ 60px) and Space toggles it from the keyboard
function MenuRow({ item, onToggle, error, last }) {
  const available = item.isAvailable;
  return (
    <li
      className={`${last ? '' : 'border-b border-divider'} ${
        available ? '' : 'bg-surface-pink/30'
      }`}
    >
      <label className="flex min-h-15 cursor-pointer items-center justify-between gap-3 px-4 py-2">
        <span className="flex flex-col gap-0.5">
          <span
            className={`text-[15px] font-semibold leading-[22px] ${
              available ? '' : 'text-ink-muted'
            }`}
          >
            {item.name}
          </span>
          <span
            className={`text-label font-semibold ${
              available ? 'text-status-done' : 'text-danger'
            }`}
          >
            {available ? 'เปิดขาย' : 'หมด · ลูกค้าสั่งไม่ได้'}
          </span>
          {error && (
            <span role="alert" className="text-label text-danger">
              {error}
            </span>
          )}
        </span>
        <Switch
          checked={available}
          onChange={(next) => onToggle(item._id, next)}
          label={`${item.name} เปิดขาย`}
        />
      </label>
    </li>
  );
}

// /staff/menu — open / close the store and switch menu items off when they
// sell out (DESIGN §4.7). Everything changes for customers at once.
function StaffMenu() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const store = useQuery({ ...staffStoreQuery, ...STOREFRONT_POLLED });
  const menu = useQuery({ ...staffMenuQuery, ...STOREFRONT_POLLED });
  // A failed save's message, per menu item
  const [rowErrors, setRowErrors] = useState({});

  // Back to the tab /staff was on (it passes the tab in router state); the
  // first tab if this page was opened directly
  const backTab = location.state?.tab;
  const backTo =
    backTab && backTab !== 'pending' ? `/staff?tab=${backTab}` : '/staff';

  // The sold-out switch flips at once and is put back if the save fails (Jui,
  // 2026-11-11), like Edit order's status: staff often switch off several
  // flavours in a row
  const toggle = useMutation({
    mutationFn: ({ id, isAvailable }) =>
      getJson(`/api/staff/menu/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isAvailable }),
      }),
    onMutate: async ({ id, isAvailable }) => {
      setRowErrors((old) => ({ ...old, [id]: '' }));
      // A poll answering now would put the old value back for a moment
      await queryClient.cancelQueries({ queryKey: KEY });
      queryClient.setQueryData(KEY, (old) =>
        old?.map((item) => (item._id === id ? { ...item, isAvailable } : item)),
      );
    },
    onError: (err, { id, isAvailable }) => {
      queryClient.setQueryData(KEY, (old) =>
        old?.map((item) =>
          item._id === id ? { ...item, isAvailable: !isAvailable } : item,
        ),
      );
      setRowErrors((old) => ({
        ...old,
        [id]: `บันทึกไม่ได้ ลองอีกครั้ง (${errorMessage(err)})`,
      }));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });

  const failed =
    (!store.data && store.error) || (!menu.data && menu.error) || null;

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-surface">
      <header className="flex items-center gap-2 border-b border-border bg-surface-raised px-4 py-3">
        <Link
          to={backTo}
          aria-label="กลับไปหน้าออเดอร์"
          className="-ml-2.5 flex size-11 shrink-0 items-center justify-center text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex flex-col">
          <h1 className="font-heading text-page-title">ร้าน / เมนู</h1>
          <p className="text-label text-ink-muted">เปลี่ยนแล้วลูกค้าเห็นทันที</p>
        </div>
        <Link
          to="/"
          className="ml-auto inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-md bg-surface-peach px-3.5 text-button-secondary text-ink"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
          </svg>
          Dashboard
        </Link>
      </header>

      <main className="flex flex-col gap-5 p-4">
        {failed ? (
          <div className="flex flex-col items-start gap-2">
            <p role="alert" className="text-body-small text-danger">
              {errorMessage(failed)}
            </p>
            <button
              type="button"
              onClick={() => {
                store.refetch();
                menu.refetch();
              }}
              className="min-h-11 rounded-md bg-surface-peach px-4 text-button-secondary text-ink"
            >
              ลองใหม่
            </button>
          </div>
        ) : !store.data || !menu.data ? (
          <Spinner label="กำลังโหลดเมนู" />
        ) : (
          <>
            <StoreCard store={store.data} />
            {SECTIONS.map(({ category, title, note }) => {
              const items = menu.data.filter((i) => i.category === category);
              if (items.length === 0) return null;
              return (
                <section key={category} className="flex flex-col gap-2">
                  <h2 className="text-[15px] font-semibold leading-[22px]">
                    {title}
                    {note && (
                      <span className="text-label text-ink-muted"> {note}</span>
                    )}
                  </h2>
                  <ul className="overflow-hidden rounded-md bg-surface-raised shadow-sm">
                    {items.map((item, index) => (
                      <MenuRow
                        key={item._id}
                        item={item}
                        last={index === items.length - 1}
                        error={rowErrors[item._id]}
                        onToggle={(id, isAvailable) =>
                          toggle.mutate({ id, isAvailable })
                        }
                      />
                    ))}
                  </ul>
                </section>
              );
            })}
          </>
        )}
      </main>
    </div>
  );
}

export default StaffMenu;
