import { Router } from 'express';
import { z } from 'zod';
import type { DB } from '../db.ts';
import { requireRole } from '../auth.ts';
import { badRequest, handle, parse } from '../lib/errors.ts';
import * as cfg from '../services/config.ts';
import * as idoc from '../services/idoc.ts';
import * as cust from '../services/customizing.ts';

const pid = (v: string) => {
  const n = Number(v);
  if (!Number.isInteger(n)) throw badRequest('Invalid id');
  return n;
};
const str = (v: unknown) => (typeof v === 'string' && v !== '' ? v : undefined);
const ALL_ROLES = ['finance', 'purchasing', 'warehouse', 'sales'] as const;

/** Configuration (customizing) and IDoc endpoints. */
export function integrationRoutes(db: DB) {
  const r = Router();
  const uid = (req: Express.Request) => req.user!.id;

  // ---------- configuration ----------
  r.get('/config', handle(() => cfg.allConfig(db)));
  r.put('/config', handle((req) => {
    const body = parse(z.record(z.string(), z.unknown()), req.body);
    cfg.setConfig(db, body, req.user!.role);
    return cfg.allConfig(db);
  }));
  r.get('/number-ranges', handle(() => cfg.listNumberRanges(db)));
  r.put('/number-ranges/:object', requireRole(), handle((req) => {
    const { nextNo } = parse(z.object({ nextNo: z.coerce.number() }), req.body);
    cfg.setNumberRange(db, req.params.object, nextNo);
  }));

  // ---------- customizing tables ----------
  r.get('/customizing', handle((req) => cust.listObjects(req.user!.role)));
  r.get('/customizing/:key', handle((req) => cust.getObject(db, req.params.key)));
  r.post('/customizing/:key', handle((req) => cust.saveRow(db, req.params.key, null, parse(z.record(z.string(), z.unknown()), req.body), req.user!.role)));
  r.put('/customizing/:key/:id', handle((req) => cust.saveRow(db, req.params.key, pid(req.params.id), parse(z.record(z.string(), z.unknown()), req.body), req.user!.role)));
  r.delete('/customizing/:key/:id', handle((req) => cust.deleteRow(db, req.params.key, pid(req.params.id), req.user!.role)));

  // ---------- IDoc configuration ----------
  r.get('/idoc-meta', handle(() => ({ messageTypes: idoc.MESSAGE_TYPES, statuses: idoc.STATUS_TEXT })));
  const portSchema = z.object({
    name: z.string().trim().regex(/^[A-Z0-9_]{3,20}$/, 'Port name: 3-20 capital letters, digits or _'),
    port_type: z.enum(['FILE', 'XML_HTTP']),
    target: z.string().trim().min(1).max(200),
    description: z.string().trim().max(200).nullish(),
  });
  r.get('/idoc-ports', handle(() => db.prepare('SELECT * FROM idoc_ports ORDER BY name').all()));
  r.post('/idoc-ports', requireRole(), handle((req) => {
    const d = parse(portSchema, req.body);
    return { id: Number(db.prepare('INSERT INTO idoc_ports(name, port_type, target, description) VALUES (?, ?, ?, ?)').run(d.name, d.port_type, d.target, d.description ?? null).lastInsertRowid) };
  }));
  r.put('/idoc-ports/:id', requireRole(), handle((req) => {
    const d = parse(portSchema, req.body);
    if (!db.prepare('UPDATE idoc_ports SET name = ?, port_type = ?, target = ?, description = ? WHERE id = ?').run(d.name, d.port_type, d.target, d.description ?? null, pid(req.params.id)).changes)
      throw badRequest('Port not found');
  }));

  const partnerSchema = z.object({
    partner_type: z.enum(['LS', 'LI', 'KU']),
    partner_no: z.string().trim().min(1).max(20),
    name: z.string().trim().min(1).max(120),
    port_id: z.coerce.number().int().positive().nullish().transform((v) => v ?? null),
    is_active: z.boolean().default(true),
    messages: z.array(z.object({ direction: z.enum(['OUT', 'IN']), message_type: z.string(), output_mode: z.enum(['IMMEDIATE', 'COLLECT']).default('IMMEDIATE') })),
  });
  r.get('/idoc-partners', handle(() => idoc.listPartners(db)));
  r.post('/idoc-partners', requireRole(), handle((req) => idoc.savePartner(db, null, parse(partnerSchema, req.body))));
  r.put('/idoc-partners/:id', requireRole(), handle((req) => idoc.savePartner(db, pid(req.params.id), parse(partnerSchema, req.body))));
  r.delete('/idoc-partners/:id', requireRole(), handle((req) => idoc.deletePartner(db, pid(req.params.id))));

  // ---------- IDocs ----------
  r.get('/idocs', handle((req) =>
    idoc.listIdocs(db, { direction: str(req.query.direction), status: str(req.query.status), messageType: str(req.query.messageType), search: str(req.query.search) })));
  r.get('/idocs/stats', handle(() => idoc.idocStats(db)));
  r.get('/idocs/templates/:kind', handle((req) =>
    idoc.inboundTemplate(db, req.params.kind, { poId: req.query.poId ? pid(String(req.query.poId)) : undefined, customerCode: str(req.query.customer) })));
  r.get('/idocs/:id', handle((req) => idoc.getIdoc(db, pid(req.params.id))));
  r.post('/idocs/inbound', requireRole(...ALL_ROLES), handle((req) => {
    const { xml } = parse(z.object({ xml: z.string().min(1, 'Paste or load IDoc XML first').max(500_000) }), req.body);
    return idoc.receiveInbound(db, { xml }, uid(req));
  }));
  r.post('/idocs/outbound/matmas', requireRole(...ALL_ROLES), handle((req) => {
    const d = parse(z.object({ materialId: z.coerce.number().int(), partnerId: z.coerce.number().int() }), req.body);
    return idoc.sendMaterial(db, d.materialId, d.partnerId, uid(req));
  }));
  r.post('/idocs/:id/process', requireRole(...ALL_ROLES), handle((req) => idoc.processInbound(db, pid(req.params.id), uid(req))));
  r.post('/idocs/:id/dispatch', requireRole(...ALL_ROLES), handle((req) => {
    idoc.dispatch(db, pid(req.params.id));
    return idoc.getIdoc(db, pid(req.params.id));
  }));
  r.post('/idocs/:id/close', requireRole(...ALL_ROLES), handle((req) => {
    idoc.closeIdoc(db, pid(req.params.id));
    return idoc.getIdoc(db, pid(req.params.id));
  }));

  return r;
}
