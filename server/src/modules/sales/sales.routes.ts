import { type Request, type Response, Router } from 'express';
import { leadQuerySchema, listLeads } from './sales.service';

/** Sales module. Mounted behind `authenticate` + `authorizeModule(SALES)` in routes.ts. */
export const salesRouter = Router();

salesRouter.get('/leads', async (req: Request, res: Response) => {
  const { leads, meta } = await listLeads(leadQuerySchema.parse(req.query));
  res.json({ data: { leads }, meta });
});
