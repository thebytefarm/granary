import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import type { ReactElement } from 'react'

/**
 * Render the working farm artwork with registered machinery and motion controls.
 * @param props - Deployment base, including its leading and trailing slashes.
 * @returns The Ciderpress banner, with decorative artwork separated from accessible controls.
 */
export function FarmHero({ base }: { readonly base: string }): ReactElement {
  const root = useRef<HTMLDivElement>(null)
  const [isPaused, setIsPaused] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [isPageVisible, setIsPageVisible] = useState(true)
  const reducedMotion = useSyncExternalStore(
    subscribeMotion,
    readReducedMotion,
    serverReducedMotion
  )
  const isRunning = !isPaused && isVisible && isPageVisible && !reducedMotion

  useEffect(() => {
    const element = root.current
    if (!element) {
      return
    }

    // Ciderpress hides banner slots from assistive tech; this banner also owns real controls.
    const banner = element.closest('.cp-hero__background')
    const hidden = banner?.getAttribute('aria-hidden')
    banner?.removeAttribute('aria-hidden')

    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(entry?.isIntersecting ?? false)
    })
    observer.observe(element)

    function updatePageVisibility(): void {
      setIsPageVisible(!document.hidden)
    }
    updatePageVisibility()
    document.addEventListener('visibilitychange', updatePageVisibility)

    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', updatePageVisibility)
      if (hidden !== null && hidden !== undefined) {
        banner?.setAttribute('aria-hidden', hidden)
      }
    }
  }, [])

  return (
    <div
      className="farm-hero"
      ref={root}
      data-running={isRunning}
      data-reduced-motion={reducedMotion}
    >
      <link rel="stylesheet" href={`${base}farm-hero.css`} precedence="default" />
      <div className="farm-world">
        <FarmLandscape base={base} />
      </div>
      <button
        className="farm-pause"
        type="button"
        disabled={reducedMotion}
        aria-label="Pause farm animation"
        aria-pressed={isPaused || reducedMotion}
        onClick={() => setIsPaused((paused) => !paused)}
      >
        <span aria-hidden="true">
          <PauseLabel reducedMotion={reducedMotion} isPaused={isPaused} />
        </span>
      </button>
    </div>
  )
}

/**
 * @private
 */
function PauseLabel({
  reducedMotion,
  isPaused,
}: {
  readonly reducedMotion: boolean
  readonly isPaused: boolean
}): string {
  if (reducedMotion || !isPaused) {
    return 'Ⅱ'
  }
  return '▶'
}

/**
 * @private
 */
function subscribeMotion(notify: () => void): () => void {
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
  preference.addEventListener('change', notify)
  return () => preference.removeEventListener('change', notify)
}

/**
 * @private
 */
function readReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * @private
 */
function serverReducedMotion(): boolean {
  return true
}

/**
 * @private
 */
function FarmLandscape({ base }: { readonly base: string }): ReactElement {
  const id = useId()
  const artwork = `${base}farm-simulation.webp`
  return (
    <svg
      className="farm-landscape"
      viewBox="140 150 1634 737"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
    >
      <defs>
        <clipPath id={`${id}-combine`}>
          <path d="M733 717L740 713L751 716L754 709L780 709L783 716L795 716L804 722L831 728L836 733L838 740L832 742L829 737L815 737L815 753L808 764L792 768L780 763L775 760L769 768L751 767L746 769L733 765Z" />
        </clipPath>
        <pattern
          id={`${id}-stubble`}
          width="100"
          height="54"
          patternUnits="userSpaceOnUse"
          x="600"
          y="714"
        >
          <svg width="100" height="54" viewBox="610 714 100 54">
            <image href={artwork} width="1774" height="887" />
          </svg>
        </pattern>
      </defs>
      <image href={artwork} width="1774" height="887" />
      {/* All overlays share the raster's coordinates, including cover cropping. */}
      <g className="farm-grain" fill="none" strokeLinecap="butt">
        <path className="farm-grain__belt" d="M887 442H1145V381" />
        <path className="farm-grain__belt" d="M1007 359L1064 310" />
        <path className="farm-grain__belt" d="M1338 385L1245 281V260" />
        <path className="farm-grain__lift" d="M1237 425V263" />
        <path
          className="farm-grain__belt farm-grain__belt--narrow"
          d="M1215 211L1297 137L1431 210L1565 228"
        />
        <path className="farm-grain__belt" d="M1160 470H1238" />
      </g>
      <g>
        <svg x="730" y="707" width="114" height="9" viewBox="610 707 114 9">
          <image href={artwork} width="1774" height="887" />
        </svg>
        <svg
          x="604"
          y="716"
          width="470"
          height="110"
          viewBox="1140 736 470 94"
          preserveAspectRatio="none"
        >
          <image href={artwork} width="1774" height="887" />
        </svg>
        <rect
          className="farm-cut-swath"
          x="604"
          y="716"
          width="470"
          height="52"
          fill={`url(#${id}-stubble)`}
        />
        <g className="farm-combine">
          <image href={artwork} width="1774" height="887" clipPath={`url(#${id}-combine)`} />
          <g className="farm-chaff" fill="#c4a15f">
            <rect x="816" y="746" width="3" height="2" />
            <rect x="823" y="755" width="2" height="2" />
            <rect x="829" y="743" width="3" height="2" />
          </g>
        </g>
      </g>
    </svg>
  )
}
