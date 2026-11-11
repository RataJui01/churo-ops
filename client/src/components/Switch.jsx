// An on/off switch (DESIGN §2 "Switch"): a real checkbox with role="switch",
// visually hidden, plus a drawn track. Put it inside a <label> together with
// its text, so the whole row is the tap target and Space toggles it.
//
// size: 'md' 52×32 (menu items) or 'lg' 60×36 (the store switch).
// On = status-done green. Off = ink-muted at 70%: the design's #8C7F72 isn't
// a token, and this is the closest token colour (never a new hex).
const SIZES = {
  md: { track: 'h-8 w-[52px]', knob: 'size-[26px]', on: 'translate-x-5' },
  lg: { track: 'h-9 w-[60px]', knob: 'size-[30px]', on: 'translate-x-6' },
};

function Switch({ checked, onChange, disabled = false, size = 'md', label }) {
  const s = SIZES[size];
  return (
    <>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        aria-label={label}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={`relative shrink-0 rounded-pill p-[3px] transition-colors duration-200 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand peer-disabled:opacity-60 motion-reduce:transition-none ${s.track} ${
          checked ? 'bg-status-done' : 'bg-ink-muted/70'
        }`}
      >
        {/* translate, not transform: Tailwind v4's translate-x-* sets the
            CSS translate property */}
        <span
          className={`block rounded-full bg-surface-raised transition-[translate] duration-200 ease-out motion-reduce:transition-none ${s.knob} ${
            checked ? s.on : 'translate-x-0'
          }`}
        />
      </span>
    </>
  );
}

export default Switch;
