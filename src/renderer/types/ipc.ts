export type IpcResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

export function unwrapIpc<T>(result: IpcResult<T>): T {
  if (result.success) return result.data
  throw new Error(result.error)
}
