export const haptics = {
  light: () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(8)
  },
  medium: () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(15)
  },
  success: () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate([12, 60, 25])
  },
  tick: () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(3)
  },
  ringComplete: () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate([8, 40, 12])
  },
  warning: () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate([20, 80, 20])
  },
}
