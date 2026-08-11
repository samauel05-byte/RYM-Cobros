import { getCurrentUser } from '../_lib/auth.js';

export default async function handler(req, res) {
  const user = getCurrentUser(req);
  if (!user) {
    res.status(401).json({ error: 'No autenticado' });
    return;
  }
  res.status(200).json({ user: { id: user.id, nombre: user.nombre, user: user.user, role: user.role } });
}
