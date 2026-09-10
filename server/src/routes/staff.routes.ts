import { Router } from 'express';
import {
  getFeatureCatalogue,
  listRoles, createRole, updateRole, deleteRole,
  listStaff, createStaff, updateStaff, resetStaffPassword, deleteStaff,
} from '../controllers/staff.controller';
import { resetStaffTwoFactor } from '../controllers/twoFactor.controller';
import { protect, isAdmin } from '../middleware/auth';

const router = Router();

// Staff and role administration is admin-only throughout — a manager must
// never be able to edit the role that defines their own access.
router.use(protect, isAdmin);

router.get('/features', getFeatureCatalogue);

router.get('/roles', listRoles);
router.post('/roles', createRole);
router.patch('/roles/:id', updateRole);
router.delete('/roles/:id', deleteRole);

router.get('/', listStaff);
router.post('/', createStaff);
router.patch('/:id', updateStaff);
router.post('/:id/reset-password', resetStaffPassword);
// Lost device + lost recovery codes: only an admin can clear the second factor.
router.post('/:id/reset-2fa', resetStaffTwoFactor);
router.delete('/:id', deleteStaff);

export default router;
