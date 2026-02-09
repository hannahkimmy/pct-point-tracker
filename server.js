const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production';
const JWT_COOKIE_NAME = 'pcpoints_token';

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// API routes defined below - static middleware moved to after API routes

// --- Helpers ---

function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      role_level: user.role_level,
      name: user.name,
      username: user.username,
      email: user.email || null,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function authRequired(req, res, next) {
  const token = req.cookies[JWT_COOKIE_NAME];
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function requireRole(minRole) {
  return (req, res, next) => {
    console.log('requireRole check:', { 
      userId: req.user?.id, 
      userRoleLevel: req.user?.role_level, 
      requiredRole: minRole,
      type: typeof req.user?.role_level 
    });
    if (!req.user || req.user.role_level < minRole) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

// --- Auth routes ---

// Initial bootstrap: if there are no users, allow creating the first level-3 admin without auth.
// This account represents the VP Communications and is the ONLY one with level 3 (add members) permissions.
app.post('/api/bootstrap-admin', (req, res) => {
  const { name, username, email, password } = req.body;
  if (!name || !username || !password) {
    return res.status(400).json({ error: 'Name, username and password are required' });
  }

  const count = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  if (count > 0) {
    return res
      .status(400)
      .json({ error: 'Bootstrap already done; the VP Communications account already exists.' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const stmt = db.prepare(
    `
      INSERT INTO users (name, username, email, password_hash, role_level, must_change_password)
      VALUES (?, ?, ?, ?, 3, 0)
    `
  );
  const info = stmt.run(name, username, email || null, hash);

  const user = db
    .prepare('SELECT id, name, username, email, role_level FROM users WHERE id = ?')
    .get(info.lastInsertRowid);
  const token = createToken(user);

  res
    .cookie(JWT_COOKIE_NAME, token, { httpOnly: true, sameSite: 'lax' })
    .json({ user });
});

// Login with username (NetID) OR email + password.
app.post('/api/login', (req, res) => {
  const { username, email, password } = req.body;
  const loginIdentifier = (username || email)?.trim();
  const trimmedPassword = String(password || '').trim();
  
  if (!loginIdentifier || !trimmedPassword) {
    return res.status(400).json({ error: 'Username/email and password required' });
  }

  // Try username first, then email
  let user = db
    .prepare(
      'SELECT id, name, username, email, password_hash, role_level, is_active, must_change_password FROM users WHERE username = ? OR email = ?'
    )
    .get(loginIdentifier, loginIdentifier);

  if (!user) {
    console.log('Login failed: no user found for', loginIdentifier.includes('@') ? 'email' : 'username');
    return res.status(400).json({ error: 'Invalid credentials' });
  }
  if (!user.is_active) {
    console.log('Login failed: user inactive', user.id);
    return res.status(400).json({ error: 'Invalid credentials' });
  }

  const valid = bcrypt.compareSync(trimmedPassword, user.password_hash);
  if (!valid) {
    console.log('Login failed: wrong password for user id', user.id);
    return res.status(400).json({ error: 'Invalid credentials' });
  }

  const token = createToken(user);
  const safeUser = {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    role_level: user.role_level,
  };

  // VP Comms (level 3) should NOT be prompted to change password
  const shouldChangePassword = user.role_level < 3 && user.must_change_password;

  const cookieOpts = { httpOnly: true, sameSite: 'lax' };
  if (process.env.NODE_ENV === 'production') cookieOpts.secure = true;

  res
    .cookie(JWT_COOKIE_NAME, token, cookieOpts)
    .json({ user: safeUser, must_change_password: shouldChangePassword });
});

app.post('/api/logout', (req, res) => {
  res.clearCookie(JWT_COOKIE_NAME).json({ ok: true });
});

app.get('/api/me', authRequired, (req, res) => {
  const user = db
    .prepare('SELECT id, name, username, email, role_level, is_active FROM users WHERE id = ?')
    .get(req.user.id);
  if (!user) {
    res.clearCookie(JWT_COOKIE_NAME);
    return res.status(401).json({ error: 'User not found' });
  }
  if (!user.is_active) {
    res.clearCookie(JWT_COOKIE_NAME);
    return res.status(401).json({ error: 'Account is deactivated' });
  }
  console.log('API /me - User from DB:', { id: user.id, role_level: user.role_level, type: typeof user.role_level });
  console.log('API /me - Current token role:', { role_level: req.user.role_level, type: typeof req.user.role_level });
  // Re-issue token with current role from DB so permission changes (e.g. upgrade to VP Comms) take effect without re-login
  const token = createToken(user);
  res
    .cookie(JWT_COOKIE_NAME, token, { httpOnly: true, sameSite: 'lax' })
    .json({ user: { id: user.id, name: user.name, username: user.username, email: user.email, role_level: user.role_level } });
});

// --- User management (level 3 VP Comms only) ---

// Middleware to refresh user role from database before permission checks
function refreshUserRole(req, res, next) {
  const dbUser = db.prepare('SELECT role_level FROM users WHERE id = ?').get(req.user.id);
  if (dbUser) {
    req.user.role_level = dbUser.role_level;
  }
  next();
}

// Create user (default regular member or specified role).
// Only the VP Communications (level 3) can call this.
app.post('/api/users', authRequired, refreshUserRole, requireRole(3), (req, res) => {
  const { name, username, email, password, role_level = 0 } = req.body;
  if (!name || !username || !password) {
    return res.status(400).json({ error: 'Name, username and password are required' });
  }
  // VP Communications can create level 0, 1, 2, or 3 users.
  if (![0, 1, 2, 3].includes(Number(role_level))) {
    return res.status(400).json({ error: 'Invalid role_level' });
  }

  const hash = bcrypt.hashSync(password, 10);
  try {
    const info = db
      .prepare(
        `
          INSERT INTO users (name, username, email, password_hash, role_level, must_change_password)
          VALUES (?, ?, ?, ?, ?, ?)
        `
      )
      .run(name, username, email || null, hash, role_level, role_level < 3 ? 1 : 0);
    const user = db
      .prepare('SELECT id, name, username, email, role_level FROM users WHERE id = ?')
      .get(info.lastInsertRowid);
    res.status(201).json({ user });
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ error: 'Username or email already exists' });
    }
    console.error(e);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// List all active users (level 1+ for attendance; level 2+ also for viewing)
app.get('/api/users', authRequired, requireRole(1), (req, res) => {
  const users = db
    .prepare(
      'SELECT id, name, username, email, role_level, is_active FROM users ORDER BY name ASC'
    )
    .all();
  res.json({ users });
});

// Update user role (level 3 VP Comms only)
app.patch('/api/users/:id/role', authRequired, requireRole(3), (req, res) => {
  const userId = Number(req.params.id);
  const { role_level } = req.body;
  if (![0, 1, 2, 3].includes(Number(role_level))) {
    return res.status(400).json({ error: 'Invalid role_level' });
  }

  db.prepare('UPDATE users SET role_level = ? WHERE id = ?').run(role_level, userId);
  const user = db
    .prepare('SELECT id, name, username, email, role_level FROM users WHERE id = ?')
    .get(userId);
  res.json({ user });
});

// Soft-delete user (level 3 VP Comms only)
app.delete('/api/users/:id', authRequired, requireRole(3), (req, res) => {
  const userId = Number(req.params.id);
  db.prepare('UPDATE users SET is_active = 0 WHERE id = ?').run(userId);
  res.json({ ok: true });
});

// Change password (used for first-login password change and later changes).
app.post('/api/change-password', authRequired, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password required' });
  }

  // Trim whitespace from passwords
  const trimmedCurrent = String(currentPassword).trim();
  const trimmedNew = String(newPassword).trim();

  if (!trimmedCurrent || !trimmedNew) {
    return res.status(400).json({ error: 'Passwords cannot be empty' });
  }

  if (trimmedNew.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long' });
  }

  const user = db
    .prepare('SELECT id, password_hash, must_change_password FROM users WHERE id = ?')
    .get(req.user.id);
  if (!user) return res.status(400).json({ error: 'User not found' });

  const valid = bcrypt.compareSync(trimmedCurrent, user.password_hash);
  if (!valid) {
    return res.status(400).json({ 
      error: 'Current password is incorrect. Please check for typos or extra spaces.' 
    });
  }

  const newHash = bcrypt.hashSync(trimmedNew, 10);
  db.prepare(
    'UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?'
  ).run(newHash, req.user.id);

  res.json({ ok: true });
});

// --- Events & attendance ---

// Create event and take attendance in one call (level 1+)
app.post('/api/events', authRequired, requireRole(1), (req, res) => {
  const { name, category, date, points, presentUserIds, mandatory } = req.body;
  if (!name || !category || !date || typeof points !== 'number') {
    return res.status(400).json({ error: 'name, category, date, points required' });
  }
  if (!['brotherhood', 'professional', 'service', 'general'].includes(category)) {
    return res.status(400).json({ error: 'Invalid category' });
  }
  const isMandatory = Boolean(mandatory);

  console.log('Creating event:', { name, category, date, points, presentUserIds, mandatory: isMandatory });

  const txn = db.transaction(() => {
    const info = db
      .prepare(
        'INSERT INTO events (name, category, date, points, created_by, semester, mandatory) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
      .run(name, category, date, points, req.user.id, 'N/A', isMandatory ? 1 : 0);
    const eventId = info.lastInsertRowid;

    const allUsers = db
      .prepare('SELECT id FROM users WHERE is_active = 1')
      .all();

    console.log('All active users:', allUsers.map(u => u.id));
    console.log('Present user IDs received:', presentUserIds);

    const presentSet = new Set((presentUserIds || []).map(Number).filter(id => !isNaN(id)));
    console.log('Present set:', Array.from(presentSet));
    
    const stmt = db.prepare(
      'INSERT INTO attendance (user_id, event_id, status) VALUES (?, ?, ?)'
    );

    let presentCount = 0;
    let absentCount = 0;
    
    for (const u of allUsers) {
      const status = presentSet.has(u.id) ? 'present' : 'absent';
      stmt.run(u.id, eventId, status);
      if (status === 'present') presentCount++;
      else absentCount++;
    }

    console.log(`Created attendance: ${presentCount} present, ${absentCount} absent`);

    return eventId;
  });

  const eventId = txn();
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
  res.status(201).json({ event });
});

// List events
app.get('/api/events', authRequired, requireRole(1), (req, res) => {
  const events = db
    .prepare('SELECT * FROM events ORDER BY date DESC')
    .all();
  
  // Add canEdit and canDelete flags for each event (level 2+ can edit/delete all, level 1 can only edit/delete their own)
  const eventsWithPermissions = events.map(event => ({
    ...event,
    canEdit: req.user.role_level >= 2 || event.created_by === req.user.id,
    canDelete: req.user.role_level >= 2 || event.created_by === req.user.id
  }));
  
  res.json({ events: eventsWithPermissions });
});

// Get a single event with attendance
app.get('/api/events/:id', authRequired, requireRole(1), (req, res) => {
  const eventId = Number(req.params.id);
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }
  
  // Check if user can edit this event (level 2+ or creator)
  const canEdit = req.user.role_level >= 2 || event.created_by === req.user.id;
  
  const attendance = db
    .prepare('SELECT user_id, status FROM attendance WHERE event_id = ?')
    .all(eventId);
  
  const presentUserIds = attendance
    .filter(a => a.status === 'present')
    .map(a => a.user_id);
  
  res.json({ event: { ...event, presentUserIds, canEdit } });
});

// Update event and attendance
app.put('/api/events/:id', authRequired, requireRole(1), (req, res) => {
  const eventId = Number(req.params.id);
  const { name, category, date, points, presentUserIds, mandatory } = req.body;
  
  const existingEvent = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
  if (!existingEvent) {
    return res.status(404).json({ error: 'Event not found' });
  }
  
  // Check permissions: level 2+ can edit all events, level 1 can only edit their own
  if (req.user.role_level < 2 && existingEvent.created_by !== req.user.id) {
    return res.status(403).json({ error: 'You can only edit events you created' });
  }
  
  if (!name || !category || !date || typeof points !== 'number') {
    return res.status(400).json({ error: 'name, category, date, points required' });
  }
  if (!['brotherhood', 'professional', 'service', 'general'].includes(category)) {
    return res.status(400).json({ error: 'Invalid category' });
  }
  const isMandatory = Boolean(mandatory);

  console.log('Updating event:', { eventId, name, category, date, points, presentUserIds, mandatory: isMandatory });

  const txn = db.transaction(() => {
    // Update event (keep existing semester value)
    db.prepare(
      'UPDATE events SET name = ?, category = ?, date = ?, points = ?, mandatory = ? WHERE id = ?'
    ).run(name, category, date, points, isMandatory ? 1 : 0, eventId);

    // Delete existing attendance
    db.prepare('DELETE FROM attendance WHERE event_id = ?').run(eventId);

    // Insert new attendance
    const allUsers = db
      .prepare('SELECT id FROM users WHERE is_active = 1')
      .all();

    console.log('All active users:', allUsers.map(u => u.id));
    console.log('Present user IDs received:', presentUserIds);

    const presentSet = new Set((presentUserIds || []).map(Number).filter(id => !isNaN(id)));
    console.log('Present set:', Array.from(presentSet));
    
    const stmt = db.prepare(
      'INSERT INTO attendance (user_id, event_id, status) VALUES (?, ?, ?)'
    );

    let presentCount = 0;
    let absentCount = 0;

    for (const u of allUsers) {
      const status = presentSet.has(u.id) ? 'present' : 'absent';
      stmt.run(u.id, eventId, status);
      if (status === 'present') presentCount++;
      else absentCount++;
    }

    console.log(`Updated attendance: ${presentCount} present, ${absentCount} absent`);

    return eventId;
  });

  txn();
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
  res.json({ event });
});

// Delete event (level 1+)
app.delete('/api/events/:id', authRequired, requireRole(1), (req, res) => {
  const eventId = Number(req.params.id);
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
  
  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }
  
  // Check permissions: level 2+ can delete all events, level 1 can only delete their own
  if (req.user.role_level < 2 && event.created_by !== req.user.id) {
    return res.status(403).json({ error: 'You can only delete events you created' });
  }
  
  // Delete event (attendance will be cascade deleted due to foreign key constraint)
  db.prepare('DELETE FROM events WHERE id = ?').run(eventId);
  
  res.json({ ok: true });
});

// --- Points & summaries ---

// Get current user's points summary
// Mandatory events: present => 0, absent => -1. Regular events: present => points, absent => 0.
app.get('/api/my-points', authRequired, (req, res) => {
  const userId = req.user.id;
  const rows = db
    .prepare(
      `
      SELECT e.category,
        SUM(CASE
          WHEN e.mandatory = 1 THEN (CASE WHEN a.status = 'present' THEN 0 ELSE -1 END)
          ELSE (CASE WHEN a.status = 'present' THEN e.points ELSE 0 END)
        END) AS total_points
      FROM attendance a
      JOIN events e ON a.event_id = e.id
      WHERE a.user_id = ?
      GROUP BY e.category
    `
    )
    .all(userId);

  const summary = {
    brotherhood: 0,
    professional: 0,
    service: 0,
    general: 0,
    overall: 0,
  };

  for (const row of rows) {
    summary[row.category] = row.total_points;
    summary.overall += row.total_points;
  }

  res.json({ summary });
});

// Get any user's points summary (admin level 1+)
// Mandatory events: present => 0, absent => -1. Regular events: present => points, absent => 0.
app.get('/api/users/:id/points', authRequired, requireRole(1), (req, res) => {
  const userId = Number(req.params.id);
  const rows = db
    .prepare(
      `
      SELECT e.category,
        SUM(CASE
          WHEN e.mandatory = 1 THEN (CASE WHEN a.status = 'present' THEN 0 ELSE -1 END)
          ELSE (CASE WHEN a.status = 'present' THEN e.points ELSE 0 END)
        END) AS total_points
      FROM attendance a
      JOIN events e ON a.event_id = e.id
      WHERE a.user_id = ?
      GROUP BY e.category
    `
    )
    .all(userId);

  const summary = {
    brotherhood: 0,
    professional: 0,
    service: 0,
    general: 0,
    overall: 0,
  };

  for (const row of rows) {
    summary[row.category] = row.total_points;
    summary.overall += row.total_points;
  }

  res.json({ summary });
});

// Get all members' points (level 2+ only)
// Only returns level 0 members (regular members), excluding level 1+ (leadership/exec)
app.get('/api/all-members-points', authRequired, requireRole(2), (req, res) => {
  const allUsers = db
    .prepare('SELECT id, name, username, email, role_level FROM users WHERE is_active = 1 AND role_level < 1 ORDER BY name ASC')
    .all();

  const membersWithPoints = allUsers.map((user) => {
    const rows = db
      .prepare(
        `
        SELECT e.category,
          SUM(CASE
            WHEN e.mandatory = 1 THEN (CASE WHEN a.status = 'present' THEN 0 ELSE -1 END)
            ELSE (CASE WHEN a.status = 'present' THEN e.points ELSE 0 END)
          END) AS total_points
        FROM attendance a
        JOIN events e ON a.event_id = e.id
        WHERE a.user_id = ?
        GROUP BY e.category
      `
      )
      .all(user.id);

    const summary = {
      brotherhood: 0,
      professional: 0,
      service: 0,
      general: 0,
      overall: 0,
    };

    for (const row of rows) {
      summary[row.category] = row.total_points;
      summary.overall += row.total_points;
    }

    return {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      points: summary,
    };
  });

  res.json({ members: membersWithPoints });
});

// --- Reset semester (level 3 VP Comms only) ---

// Wipe all events and attendance, keep users
app.post('/api/reset-semester', authRequired, requireRole(3), (req, res) => {
  db.exec('DELETE FROM attendance; DELETE FROM events;');
  res.json({ ok: true });
});

// Diagnostic: check if DB is populated (no auth; remove or restrict in production if desired)
app.get('/api/diagnostic', (req, res) => {
  console.log('Diagnostic endpoint hit');
  try {
    const userCount = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
    const eventCount = db.prepare('SELECT COUNT(*) AS c FROM events').get().c;
    const attendanceCount = db.prepare('SELECT COUNT(*) AS c FROM attendance').get().c;
    console.log(`Diagnostic: ${userCount} users, ${eventCount} events, ${attendanceCount} attendance records`);
    res.json({
      ok: true,
      userCount,
      eventCount,
      attendanceCount,
      message: userCount === 0 ? 'Database has no users — run restore or bootstrap.' : `${userCount} users in DB.`,
    });
  } catch (e) {
    console.error('Diagnostic error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Serve static frontend AFTER all API routes
app.use(express.static(path.join(__dirname, 'public')));

// Fallback: let client-side routing use index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server (and run restore on Railway if RESTORE_SQL_URL is set)
(async () => {
  if (process.env.RESTORE_SQL_URL) {
    const { runRestoreFromUrl } = require('./restore-from-url');
    try {
      await runRestoreFromUrl(db, process.env.RESTORE_SQL_URL);
      console.log('Startup restore done. Remove RESTORE_SQL_URL from Railway Variables and redeploy.');
    } catch (e) {
      console.error('Startup restore failed:', e.message);
      process.exit(1);
    }
  }
  app.listen(PORT, () => {
    console.log(`pcpoints server running on http://localhost:${PORT}`);
  });
})();

