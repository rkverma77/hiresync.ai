import { useEffect, useRef, useState } from "react"

/**
 * Simulates a believable progress percentage for an operation whose real
 * completion time can't be measured from the client — e.g. a single
 * request/response call to a free-tier server that may be cold-starting,
 * or a one-shot AI generation call with no streaming/progress events.
 *
 * While `isActive` is true, the percentage eases towards (but never quite
 * reaches) `softCap`, slowing down the longer it runs. This means we never
 * promise a finish time we can't guarantee — if the real call takes longer
 * than expected, the bar just creeps slowly near the cap instead of
 * sitting at a false 100%.
 *
 * The moment `isActive` flips back to false, the percentage is animated
 * quickly up to 100 so the bar always finishes with a satisfying "complete"
 * state rather than jumping straight to the real content mid-fill.
 *
 * @param {boolean} isActive - whether the tracked operation is currently in flight
 * @param {object} [options]
 * @param {number} [options.duration=15000] - ms; roughly how long the operation is *expected* to take
 * @param {number} [options.softCap=92] - max % reachable while still active
 * @param {string[]} [options.messages=[]] - status messages cycled through over `duration`
 * @returns {{ progress: number, message: string }}
 */
export const useFakeProgress = (isActive, options = {}) => {
    const { duration = 15000, softCap = 92, messages = [] } = options

    const [ progress, setProgress ] = useState(0)
    const [ message, setMessage ] = useState(messages[ 0 ] || "")
    const startRef = useRef(null)
    const everActiveRef = useRef(false)

    useEffect(() => {
        let intervalId
        let timeoutId

        const tickActive = () => {
            const elapsed = Date.now() - startRef.current
            const ratio = 1 - Math.exp(-elapsed / (duration * 0.55))
            setProgress(Math.min(softCap, softCap * ratio))

            if (messages.length) {
                const step = duration / messages.length
                const idx = Math.min(messages.length - 1, Math.floor(elapsed / step))
                setMessage(messages[ idx ])
            }
        }

        const tickCatchUp = () => {
            setProgress((prev) => {
                if (prev >= 100) {
                    clearInterval(intervalId)
                    return 100
                }
                const next = prev + Math.max(3, (100 - prev) * 0.35)
                return next >= 99 ? 100 : next
            })
        }

        if (isActive) {
            everActiveRef.current = true
            startRef.current = Date.now()
            // Fire the first tick on the next macrotask (not synchronously
            // during the effect's commit) so we don't cascade-render.
            timeoutId = setTimeout(tickActive, 0)
            intervalId = setInterval(tickActive, 120)

        } else if (everActiveRef.current) {
            // Real operation just finished — catch the bar up to 100% quickly.
            intervalId = setInterval(tickCatchUp, 40)
        }

        return () => {
            clearTimeout(timeoutId)
            clearInterval(intervalId)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- duration/softCap/messages are treated as fixed config for the lifetime of one progress cycle, intentionally re-run only when isActive flips
    }, [ isActive ])

    return { progress, message }
}
