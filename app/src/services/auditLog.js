// Thin, consistent wrapper around the immutable access_log table (Layer 12).
// Every route that touches evidence, claims, passports, sharing, or the
// carrier requirements graph should call this - the audit trail is a
// contractual and governance requirement (Section 5.3, 10.2), not optional.
function log(db, { actorUserId = null, actorLabel = null, action, resourceType = null, resourceId = null, details = null }) {
  db.prepare(`
    INSERT INTO access_log (actor_user_id, actor_label, action, resource_type, resource_id, details_json)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(actorUserId, actorLabel, action, resourceType, resourceId != null ? String(resourceId) : null, details ? JSON.stringify(details) : null);
}

module.exports = { log };
