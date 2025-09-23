interface LifeData {
  topLogic: string
  roles: string[]
  behaviors: string[]
  wants: string[]
  dontWants: string[]
  qualities: string[]
}

class ApiManager {
  async loadData(): Promise<LifeData | null> {
    try {
      const response = await fetch('/api/data')
      if (!response.ok) {
        throw new Error('Failed to fetch data')
      }
      return await response.json()
    } catch (error) {
      console.error('Error loading data:', error)
      return null
    }
  }

  async saveData(data: LifeData): Promise<boolean> {
    try {
      const response = await fetch('/api/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('Failed to save data')
      }

      return true
    } catch (error) {
      console.error('Error saving data:', error)
      return false
    }
  }

  async exportData(): Promise<void> {
    try {
      const response = await fetch('/api/export')
      if (!response.ok) {
        throw new Error('Failed to export data')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `life-philosophy-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting data:', error)
    }
  }

  async importData(): Promise<LifeData | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.json'
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (file) {
          try {
            const text = await file.text()
            const data = JSON.parse(text)

            // 发送到服务器保存
            const response = await fetch('/api/import', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(data),
            })

            if (!response.ok) {
              throw new Error('Failed to import data')
            }

            resolve(data)
          } catch (error) {
            console.error('Error importing data:', error)
            resolve(null)
          }
        } else {
          resolve(null)
        }
      }
      input.click()
    })
  }
}

export const apiManager = new ApiManager()