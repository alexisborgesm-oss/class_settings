
export async function confirm(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    const ok = window.confirm(message)
    resolve(ok)
  })
}
