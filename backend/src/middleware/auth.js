/**
 * auth.js — middleware de autenticación y autorización.
 *
 * requireAuth     → rechaza si no hay sesión activa (401)
 * requireRole     → rechaza si el rol no está en la lista (403)
 */

function requireAuth(req, res, next) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  next();
}

/**
 * @param {...string} roles - roles permitidos: 'rrhh', 'sueldos', 'admin', 'superadmin'
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    if (!roles.includes(req.session.role)) {
      return res.status(403).json({ error: 'Sin permiso para esta operación' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
