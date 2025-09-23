interface LifeData {
  topLogic: string
  roles: string[]
  behaviors: string[]
  wants: string[]
  dontWants: string[]
  qualities: string[]
}

const STORAGE_KEY = "life-philosophy-data"

export const storage = {
  save: (data: LifeData) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch (error) {
      console.error("Failed to save data:", error)
    }
  },

  load: (): LifeData | null => {
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      return data ? JSON.parse(data) : null
    } catch (error) {
      console.error("Failed to load data:", error)
      return null
    }
  },

  clear: () => {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (error) {
      console.error("Failed to clear data:", error)
    }
  },

  export: (data: LifeData) => {
    const dataStr = JSON.stringify(data, null, 2)
    const blob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `life-philosophy-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  },

  import: (): Promise<LifeData | null> => {
    return new Promise((resolve) => {
      const input = document.createElement("input")
      input.type = "file"
      input.accept = ".json"
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (file) {
          const reader = new FileReader()
          reader.onload = (e) => {
            try {
              const data = JSON.parse(e.target?.result as string)
              resolve(data)
            } catch (error) {
              console.error("Failed to parse imported file:", error)
              resolve(null)
            }
          }
          reader.readAsText(file)
        } else {
          resolve(null)
        }
      }
      input.click()
    })
  }
}