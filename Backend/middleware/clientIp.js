/**
 * Extract and normalize the client IP address.
 * - Prefers X-Forwarded-For when present (first IP in list)
 * - Falls back to req.ip / connection remoteAddress
 */
export function clientIpMiddleware(req, _res, next) {
  const xForwardedFor = req.headers['x-forwarded-for']
  if (typeof xForwardedFor === 'string' && xForwardedFor.length > 0) {
    const [first] = xForwardedFor.split(',').map((ip) => ip.trim())
    req.clientIp = first
    return next()
  }

  const remote = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress
  req.clientIp = typeof remote === 'string' ? remote : '0.0.0.0'
  next()
}

