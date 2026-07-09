import { Router } from 'express';
import {
  createTicket, getMyTickets, getTicketById, addMessage,
  getAllTickets, updateTicket, getTicketByIdAdmin,
} from '../controllers/support.controller';
import { protect, isAdmin, isAdminOrManager } from '../middleware/auth';

const router = Router();

router.post('/', protect, createTicket);
router.get('/my', protect, getMyTickets);
router.get('/my/:id', protect, getTicketById);
router.post('/:id/message', protect, addMessage);
router.get('/', protect, isAdmin, getAllTickets);
router.get('/:id', protect, isAdminOrManager, getTicketByIdAdmin);
router.patch('/:id', protect, isAdmin, updateTicket);

export default router;
