import { Router } from 'express';
import {
  createTicket, getMyTickets, getTicketById, addMessage,
  getAllTickets, updateTicket,
} from '../controllers/support.controller';
import { protect, isAdmin } from '../middleware/auth';

const router = Router();

router.post('/', protect, createTicket);
router.get('/my', protect, getMyTickets);
router.get('/my/:id', protect, getTicketById);
router.post('/:id/message', protect, addMessage);
router.get('/', protect, isAdmin, getAllTickets);
router.patch('/:id', protect, isAdmin, updateTicket);

export default router;
