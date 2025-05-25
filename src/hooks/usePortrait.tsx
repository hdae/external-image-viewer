import { useEffect, useState } from "react"

export const usePortrait = () => {
    const [isPortrait, setIsPortrait] = useState(false)

    useEffect(() => {
        const checkOrientation = () => {
            const aspectRatio = window.innerWidth / window.innerHeight
            const threshold = 2 / 3
            setIsPortrait(aspectRatio < threshold)
        }

        checkOrientation()
        window.addEventListener('resize', checkOrientation)
        window.addEventListener('orientationchange', checkOrientation)

        return () => {
            window.removeEventListener('resize', checkOrientation)
            window.removeEventListener('orientationchange', checkOrientation)
        }
    }, [])

    return isPortrait
}
