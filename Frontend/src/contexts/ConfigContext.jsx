import { createContext, useContext, useState, useEffect } from 'react'
import { getConfig } from '../lib/api'

const ConfigContext = createContext({
  monetizationEnabled: false,
  configLoading: true,
})

/**
 * Fetches public config once and provides monetizationEnabled for gating
 * subscription, paywall, pricing, and writer earnings UI.
 */
export function ConfigProvider({ children }) {
  const [config, setConfig] = useState({ monetizationEnabled: false, configLoading: true })

  useEffect(() => {
    getConfig()
      .then((data) => setConfig({ ...data, configLoading: false }))
      .catch(() => setConfig({ monetizationEnabled: false, configLoading: false }))
  }, [])

  return (
    <ConfigContext.Provider value={config}>
      {children}
    </ConfigContext.Provider>
  )
}

export function useConfig() {
  return useContext(ConfigContext)
}
