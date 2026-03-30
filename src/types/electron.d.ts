/**
 * Type declarations for the window.psychr context bridge.
 * This gives TypeScript full type safety when calling Electron APIs
 * from the React renderer.
 */

export type RResult = {
  success: boolean
  data?: Record<string, unknown>
  error?: string
  r_script?: string
  stderr?: string
}

declare global {
  interface Window {
    psychr: {
      r: {
        run: (script: string) => Promise<RResult>
        check: () => Promise<{ available: boolean; path?: string; error?: string }>
        version: () => Promise<string>
      }
      dialog: {
        openFile: (options?: object) => Promise<{ canceled: boolean; filePaths: string[] }>
        saveFile: (options?: object) => Promise<{ canceled: boolean; filePath?: string }>
      }
      shell: {
        openExternal: (url: string) => Promise<void>
      }
      platform: 'darwin' | 'win32' | 'linux'
    }
  }
}
