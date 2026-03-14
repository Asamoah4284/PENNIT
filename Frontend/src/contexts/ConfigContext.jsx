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

  const loadConfig = () => {
    getConfig()
      .then((data) => setConfig({ ...data, configLoading: false }))
      .catch(() => setConfig({ monetizationEnabled: false, configLoading: false }))
  }

  useEffect(() => {
    loadConfig()
  }, [])

  useEffect(() => {
    const onConfigUpdated = () => loadConfig()
    window.addEventListener('pennit:config-updated', onConfigUpdated)
    return () => window.removeEventListener('pennit:config-updated', onConfigUpdated)
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
